// WhatsApp Cloud API webhook — Fase 2
// Recebe mensagens, identifica o usuário pelo número de WhatsApp,
// usa Claude (Anthropic) pra extrair o gasto e salva no Supabase.

import { createClient } from '@supabase/supabase-js'

// ---------- Env ----------
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const GRAPH_VERSION = 'v21.0'
const CLAUDE_MODEL = 'claude-sonnet-4-5'  // upgrade do haiku — mais caro mas muito mais inteligente
const WHISPER_MODEL = 'whisper-1'

// ---------- Onboarding / Help ----------
const ONBOARDING_MESSAGE = `🎩 *Ao seu dispor.*

Eu sou *Alfred*, seu mordomo financeiro do *Domus*. Cuidarei das suas finanças com a discrição e o zelo que merecem. 🦇

💡 _Permita-me uma sugestão:_ salve este contato como *Alfred* — fica mais fácil me chamar quando precisar.

🎯 *Como posso servir:*

📝 *Registrar despesas*
"calça 200 nubank"
"comprei tênis 350 parcelado 4x"
"aluguel 2500 mensal pix"

💰 *Registrar receitas*
"recebi 1500 do cliente x"
"salário 8000"

📦 *Vários lançamentos numa única mensagem*
"almoço 50 e uber 30 pix"
"jantar 120, sobremesa 30 e estacionamento 15"

🔍 *Consultar suas finanças*
"quanto sobra do mês?"
"quantas parcelas faltam do fifa?"
"como está meu cofre do casamento?"
"quem me deve neste mês?"

🎤 *Enviar por áudio*
Pode falar à vontade — transcrevo e compreendo. Basta segurar o microfone do WhatsApp e dizer com naturalidade.

📅 *Datas livres*
"pago dia 5 do mês que vem"
"recebi ontem do freelance"

📋 *Como funcionará nosso trabalho:*
Tudo que enviar a mim torna-se um _lançamento pendente_. Você confirma, edita ou descarta no aplicativo — _nada é salvo sem sua aprovação_. A palavra final é sempre sua.

Quando desejar começar, é só me chamar. 🚀`

const HELP_TRIGGER_REGEX = /^(\s*)(oi+e?|ol[aá]+|opa+|e ?a[ií]+|hey+|hi|hello|tudo bem|tudo certo|bom dia|boa tarde|boa noite|come[çc]ar|quero come[çc]ar|menu|ajuda|help|como (funciona|usar)|tutorial)([\s!.,?]|$)/i

function isHelpTrigger(text) {
  if (!text) return false
  return HELP_TRIGGER_REGEX.test(text.trim())
}

// ---------- Handler principal ----------
export default async function handler(req, res) {
  // GET: handshake do Meta
  if (req.method === 'GET') {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge)
    }
    return res.status(403).send('Forbidden')
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed')
  }

  try {
    const body = req.body
    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
    if (!message) return res.status(200).json({ ok: true })  // status notifications

    const from = message.from  // ex: 5511999998888
    const type = message.type

    // Extrai texto da mensagem (texto direto OU transcrição de áudio)
    let text = ''
    let cameFromAudio = false

    if (type === 'text') {
      text = (message.text?.body || '').trim()
    } else if (type === 'audio' || type === 'voice') {
      cameFromAudio = true
      try {
        const audioId = message.audio?.id || message.voice?.id
        if (!audioId) throw new Error('Sem audio.id')
        const { buffer, mimeType } = await downloadWhatsAppMedia(audioId)
        // Cap de tamanho: áudios WhatsApp são ~5KB/s em opus.
        // 500KB ≈ 100s. Acima disso, rejeita pra controlar custo Whisper.
        const sizeKB = buffer.byteLength / 1024
        if (sizeKB > 500) {
          console.warn(`🎤 Áudio rejeitado: ${sizeKB.toFixed(0)} KB (limite 500 KB ≈ 100s)`)
          await sendWhatsApp(from, '🎤 Permita-me uma observação: o áudio é um pouco extenso. Para melhor compreensão, envie em até 1 minuto ou descreva por texto. Aguardo seu retorno.')
          return res.status(200).json({ ok: true })
        }
        text = (await transcribeAudio(buffer, mimeType)).trim()
        console.log(`🎤 Transcrito (${sizeKB.toFixed(0)}KB): "${text}"`)
      } catch (err) {
        console.error('Audio handling failed:', err)
        await sendWhatsApp(from, '🎤 Não consegui processar o áudio. Tenta gravar de novo ou manda por texto.')
        return res.status(200).json({ ok: true })
      }
    } else {
      // imagem, vídeo, sticker, etc — ainda não suportado
      await sendWhatsApp(from, '🎩 No momento compreendo texto e áudio. Foto da nota chegará em breve.')
      return res.status(200).json({ ok: true })
    }

    if (!text) {
      if (cameFromAudio) {
        await sendWhatsApp(from, '🎤 Não consegui entender o que você falou. Pode tentar de novo?')
      }
      return res.status(200).json({ ok: true })
    }

    console.log(`📲 ${from} (${type}): ${text}`)

    // Detecta saudação / "quero começar" / pedido de ajuda — manda tutorial completo
    if (isHelpTrigger(text)) {
      await sendWhatsApp(from, ONBOARDING_MESSAGE)
      return res.status(200).json({ ok: true })
    }

    // 1) Identifica o usuário pelo WhatsApp
    const admin = supabaseAdmin()
    const { data: profile, error: profileErr } = await admin
      .from('user_profiles')
      .select('user_id, whatsapp_phone')
      .eq('whatsapp_phone', from)
      .maybeSingle()

    if (profileErr) console.error('profile lookup error:', profileErr)
    if (!profile) {
      await sendWhatsApp(from, '🎩 Olá. Este número ainda não está vinculado a uma conta do Domus. Permita-me orientar: abra o aplicativo, vá em Configurações → WhatsApp e cadastre seu número. Aguardarei seu retorno.')
      return res.status(200).json({ ok: true })
    }

    const userId = profile.user_id

    // 2) Carrega contexto do usuário (cards, categorias, atribuídos, cofres)
    const context = await loadUserContext(admin, userId)

    // 3) Pede pro Claude extrair o gasto
    const extraction = await extractExpense(text, context)
    console.log('🧠 Claude:', JSON.stringify(extraction))

    if (!extraction) {
      await sendWhatsApp(from, '🎩 Peço desculpas — algo travou de momento. Poderia tentar novamente em alguns segundos?')
      return res.status(200).json({ ok: true })
    }

    // 4a) Consulta sobre as finanças
    if (extraction.intent === 'query') {
      const fullCtx = await loadFullUserContext(admin, userId)
      const answer = await answerQuery(text, fullCtx)
      await sendWhatsApp(from, answer || '🤖 Não consegui responder agora. Tenta de novo em alguns segundos.')
      return res.status(200).json({ ok: true })
    }

    // 4b) Esclarecimento — falta info pra registrar
    if (extraction.intent === 'clarify') {
      await sendWhatsApp(from, `🤔 ${extraction.reply || 'Pode me dar mais detalhes?'}`)
      return res.status(200).json({ ok: true })
    }

    // 4c) Batch: múltiplos lançamentos numa mensagem
    if (extraction.intent === 'register_batch') {
      const items = Array.isArray(extraction.items) ? extraction.items.filter((i) => i && Number(i.amount) > 0) : []
      if (items.length === 0) {
        await sendWhatsApp(from, '🎩 Não identifiquei os valores. Poderia reformular, por gentileza?')
        return res.status(200).json({ ok: true })
      }
      const today = new Date().toISOString().slice(0, 10)
      const pendings = items.map((item) => {
        const isIncome = item.kind === 'income'
        const date = item.date || today
        const ym = date.slice(0, 7)
        const data = isIncome ? buildReceita(item, date) : buildDespesa(item, date)
        return {
          id: 'pend_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 5),
          type: isIncome ? 'income' : 'expense',
          source: 'whatsapp',
          createdAt: Date.now(),
          ym,
          raw: text,
          data,
        }
      })
      await appendPendingActions(admin, userId, pendings)
      await sendWhatsApp(from, formatBatchNotice(pendings))
      return res.status(200).json({ ok: true })
    }

    // 4d) Outras intenções (saudação, conversa, etc)
    if (extraction.intent !== 'register_expense' && extraction.intent !== 'register_income') {
      await sendWhatsApp(from, `🎩 ${extraction.reply || 'Posso registrar despesas, receitas ou responder sobre suas finanças. Estou ao seu dispor.'}`)
      return res.status(200).json({ ok: true })
    }

    if (!extraction.amount || extraction.amount <= 0) {
      await sendWhatsApp(from, '🎩 Não captei o valor. Tente algo como "almoço 25 pix" — o número é o essencial.')
      return res.status(200).json({ ok: true })
    }

    // 5) Cria o "lançamento pendente" pra confirmação no app
    const today = new Date().toISOString().slice(0, 10)
    const date = extraction.date || today
    const ym = date.slice(0, 7)
    const isIncome = extraction.intent === 'register_income'

    const pendingData = isIncome ? buildReceita(extraction, date) : buildDespesa(extraction, date)

    const pending = {
      id: 'pend_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36).slice(-4),
      type: isIncome ? 'income' : 'expense',
      source: 'whatsapp',
      createdAt: Date.now(),
      ym,
      raw: text,
      data: pendingData,
    }

    await appendPendingAction(admin, userId, pending)

    // 6) Responde no WhatsApp pedindo pra confirmar no app
    await sendWhatsApp(from, formatPendingNotice(pending))

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('webhook error:', err)
    return res.status(200).json({ ok: false, error: 'handled' })
  }
}

// ---------- Supabase admin client ----------
function supabaseAdmin() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('Supabase env vars não configuradas (URL ou SERVICE_ROLE_KEY)')
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ---------- Carrega contexto do usuário ----------
// Pega o mês mais recente do user pra extrair config (cartões, categorias, atribuídos)
// + lista de cofres do perfil
async function loadUserContext(admin, userId) {
  const [monthsRes, profileRes] = await Promise.all([
    admin
      .from('user_months')
      .select('year_month, data')
      .eq('user_id', userId)
      .order('year_month', { ascending: false })
      .limit(1),
    admin
      .from('user_profiles')
      .select('cofres')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  const latestMonth = monthsRes.data?.[0]
  const config = latestMonth?.data?.config || {
    cards: [],
    paymentMethods: ['Pix', 'Débito'],
    categories: [],
    attributedTo: [],
  }
  const cofres = Array.isArray(profileRes.data?.cofres) ? profileRes.data.cofres : []

  return {
    paymentMethods: Array.isArray(config.paymentMethods) ? config.paymentMethods : [],
    cardNames: Array.isArray(config.cards) ? config.cards.filter((c) => c?.name).map((c) => c.name) : [],
    categories: Array.isArray(config.categories) ? config.categories.filter((c) => c?.name).map((c) => c.name) : [],
    attributedTo: Array.isArray(config.attributedTo) ? config.attributedTo.filter((a) => a?.name).map((a) => a.name) : [],
    cofreNames: cofres.filter((c) => c?.name).map((c) => c.name),
  }
}

// ---------- Claude API ----------
// PROMPT ESTÁTICO — não muda entre chamadas. Vai com cache_control pra
// ser servido com 90% de desconto em cache hits. Compartilhado entre
// todos os usuários (já que o conteúdo não depende de quem mandou).
const EXTRACT_STATIC_SYSTEM = `Você é um assistente financeiro brasileiro super inteligente que conversa naturalmente em português. Sua função é entender o que o usuário quer (registrar gasto, registrar receita, perguntar sobre finanças, ou conversar) e responder com um JSON estruturado.

SUA TAREFA: retorne APENAS um JSON válido (sem markdown, sem texto fora do JSON), classificando a mensagem em um destes intents:

- "register_expense" → 1 gasto / saída de dinheiro
- "register_income" → 1 receita / entrada de dinheiro
- "register_batch" → MÚLTIPLOS lançamentos numa mensagem (mistura de saídas e entradas permitida)
- "query" → pergunta sobre finanças (saldos, parcelas, orçamentos, cofres, totais)
- "clarify" → você entendeu a intenção mas falta um dado essencial (valor ou se é gasto/receita)
- "other" → saudação, conversa casual, ou dúvida fora de finanças

═══════ FORMATO DE SAÍDA POR INTENT ═══════

register_expense:
{
  "intent": "register_expense",
  "description": "descrição curta e clara",
  "amount": número (em reais, decimal),
  "paymentMethod": "valor da lista de Métodos/Cartões ou null",
  "category": "valor da lista de Categorias ou null",
  "attributedTo": "valor da lista de Atribuídos ou null",
  "date": "YYYY-MM-DD (use a tabela de meses do contexto pra resolver expressões relativas) ou null se for hoje",
  "installmentCurrent": número (1 = primeira parcela ou à vista),
  "installmentTotal": número (1 = à vista),
  "recurring": boolean (true se for fixo mensal),
  "cofreName": "nome do cofre ou null"
}

register_income (mesma lógica de data):
{
  "intent": "register_income",
  "source": "origem (ex: 'Salário', 'Freelance', 'Consultório Juju')",
  "amount": número,
  "date": "YYYY-MM-DD ou null (=hoje)",
  "notes": "observação ou ''",
  "recurring": boolean
}

register_batch (use SÓ quando o usuário menciona 2 ou mais lançamentos numa mensagem):
{
  "intent": "register_batch",
  "items": [
    { "kind": "expense", "description": "...", "amount": número, "paymentMethod": ..., "category": ..., "attributedTo": ..., "date": ..., "installmentCurrent": 1, "installmentTotal": 1, "recurring": false, "cofreName": null },
    { "kind": "income", "source": "...", "amount": número, "date": ..., "notes": "", "recurring": false }
  ]
}
Cada item tem "kind": "expense" ou "income" e os mesmos campos do intent equivalente. Se algum atributo (paymentMethod, category, etc) foi mencionado uma vez e claramente vale pra todos os itens, propague pra todos. Ex: "calça 200, tênis 350 nubank" → ambos com paymentMethod="Nubank".

query:
{ "intent": "query" }

clarify:
{ "intent": "clarify", "reply": "pergunta curta e amigável pedindo o que falta" }

other:
{ "intent": "other", "reply": "resposta amigável curta em PT-BR" }

═══════ REGRAS DE CLASSIFICAÇÃO ═══════

VERBOS DE EXPENSE: comprei, paguei, gastei, fui, deu, custou, lancei
VERBOS DE INCOME: recebi, ganhei, caiu, entrou, me pagaram, vendi, fechei, salário
PALAVRA SOLTA + VALOR sem verbo (ex: "jangada 100"): trate como expense.
PERGUNTA com "quanto", "quantas", "qual", "como tá", "me diz": query.

═══════ DATAS — IMPORTANTÍSSIMO ═══════

Use a tabela de meses do contexto. NÃO calcule de cabeça:
- "hoje", "agora" → null
- "ontem" → veja contexto
- "anteontem" → veja contexto
- "amanhã" → veja contexto
- "mês que vem" / "próximo mês" / "no mês que vem" SEM DIA → use o dia 01 do mês seguinte (veja tabela do contexto)
- "dia X do mês que vem" → use o dia X do mês seguinte
- "DD/MM" sozinho → assume ano atual (ou próximo se DD/MM já passou)
- "DD/MM/AAAA" → exatamente essa data
- "semana que vem" → 7 dias à frente

═══════ REGRAS DE EXTRAÇÃO ═══════

- paymentMethod / category / attributedTo: SÓ se a pessoa mencionou EXPLICITAMENTE e o valor existe NA LISTA do contexto. Match case-insensitive e tolerante a acentos. Em caso de dúvida, retorne null (NÃO INVENTE).
- "parcelado em Nx" / "Nx" / "M/N" → installmentTotal=N, installmentCurrent=M (ou 1 se só disser N).
- "fixo", "todo mês", "mensal", "assinatura" → recurring=true.
- Valor: aceita "200", "R$200", "200 reais", "200,50", "duzentos", "duzentos e cinquenta".

═══════ QUANDO PEDIR ESCLARECIMENTO (clarify) ═══════

Use intent="clarify" SOMENTE quando a pessoa claramente quer registrar algo mas falta info crítica:
- "registrar uma despesa" sem valor → clarify "Beleza, qual valor e descrição?"
- "lança o aluguel" sem valor → clarify "Qual o valor do aluguel?"
- "recebi um pix" sem valor → clarify "Quanto entrou?"
- "compra mês que vem" sem mais nada → clarify "Conta mais — o que vai comprar, valor e forma de pagamento?"

NÃO use clarify quando tudo essencial estiver presente. Ex: "tv 1000 nubank mês que vem" tem tudo (descrição, valor, pagamento, data) → use register_expense com date=dia 01 do mês que vem.

═══════ EXEMPLOS ═══════

"calça 200 nubank" → {"intent":"register_expense","description":"Calça","amount":200,"paymentMethod":"Nubank","category":null,"attributedTo":null,"date":null,"installmentCurrent":1,"installmentTotal":1,"recurring":false,"cofreName":null}

"comprei tv 10x de 200 nubank no mês que vem" → {"intent":"register_expense","description":"TV","amount":200,"paymentMethod":"Nubank","category":null,"attributedTo":null,"date":"<dia 01 do próximo mês>","installmentCurrent":1,"installmentTotal":10,"recurring":false,"cofreName":null}

"ipva dia 5 do mês que vem 250 pix" → {"intent":"register_expense","description":"IPVA","amount":250,"paymentMethod":"Pix","category":null,"attributedTo":null,"date":"<dia 05 do próximo mês>","installmentCurrent":1,"installmentTotal":1,"recurring":false,"cofreName":null}

"recebi 500 do cliente x hoje" → {"intent":"register_income","source":"Cliente X","amount":500,"date":null,"notes":"","recurring":false}

"salário 8000" → {"intent":"register_income","source":"Salário","amount":8000,"date":null,"notes":"","recurring":true}

"quanto sobra do mês" → {"intent":"query"}

"como tá meu cofre do casamento" → {"intent":"query"}

"almoço 50 pix e uber 30 pix" → {"intent":"register_batch","items":[{"kind":"expense","description":"Almoço","amount":50,"paymentMethod":"Pix","category":null,"attributedTo":null,"date":null,"installmentCurrent":1,"installmentTotal":1,"recurring":false,"cofreName":null},{"kind":"expense","description":"Uber","amount":30,"paymentMethod":"Pix","category":null,"attributedTo":null,"date":null,"installmentCurrent":1,"installmentTotal":1,"recurring":false,"cofreName":null}]}

"calça 200, tênis 350 e camisa 80 tudo no nubank" → {"intent":"register_batch","items":[{"kind":"expense","description":"Calça","amount":200,"paymentMethod":"Nubank","category":null,"attributedTo":null,"date":null,"installmentCurrent":1,"installmentTotal":1,"recurring":false,"cofreName":null},{"kind":"expense","description":"Tênis","amount":350,"paymentMethod":"Nubank","category":null,"attributedTo":null,"date":null,"installmentCurrent":1,"installmentTotal":1,"recurring":false,"cofreName":null},{"kind":"expense","description":"Camisa","amount":80,"paymentMethod":"Nubank","category":null,"attributedTo":null,"date":null,"installmentCurrent":1,"installmentTotal":1,"recurring":false,"cofreName":null}]}

"gastei 80 no mercado pix e recebi 200 do consultório juju" → {"intent":"register_batch","items":[{"kind":"expense","description":"Mercado","amount":80,"paymentMethod":"Pix","category":null,"attributedTo":null,"date":null,"installmentCurrent":1,"installmentTotal":1,"recurring":false,"cofreName":null},{"kind":"income","source":"Consultório Juju","amount":200,"date":null,"notes":"","recurring":false}]}

"lança um gasto pro mês que vem" → {"intent":"clarify","reply":"Claro! Me passa a descrição, o valor e o método (pix, cartão, etc)."}

"recebi um valor" → {"intent":"clarify","reply":"Beleza! Quanto e de quem?"}

"oi" → {"intent":"other","reply":"🎩 Ao seu dispor. Posso registrar despesas, receitas ou consultar suas finanças. O que deseja?"}

"tudo bem?" → {"intent":"other","reply":"🎩 Tudo em ordem por aqui. Deseja ver como anda seu mês ou registrar algo?"}

"obrigado" → {"intent":"other","reply":"🎩 Por nada — sempre ao seu dispor."}

INSTRUÇÃO DE TOM: você é Alfred, mordomo discreto. NUNCA use "senhor", "senhora", "patrão", "patroa" ou outras formas que indiquem gênero. Use linguagem refinada e neutra ("ao seu dispor", "permita-me", "às suas ordens", "se me permite", "compreendido", "como deseja", "aguardo suas instruções"). Pode usar 🎩 com moderação no início de frases. Tom amistoso, prestativo, levemente formal — nunca brincalhão demais nem robótico.`

async function extractExpense(userText, ctx) {
  if (!ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY ausente')
    return null
  }

  const now = new Date()
  const todayPT = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const todayISO = now.toISOString().slice(0, 10)
  // Próximos meses pré-calculados pra Claude não precisar fazer aritmética
  const monthRefs = []
  for (let i = -2; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthName = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    let label = monthName
    if (i === -2) label += ' (antepassado)'
    if (i === -1) label += ' (mês passado)'
    if (i === 0) label += ' (mês atual)'
    if (i === 1) label += ' (mês que vem / próximo mês)'
    if (i === 2) label += ' (daqui 2 meses)'
    monthRefs.push(`  - ${ym}: ${label}`)
  }

  // BLOCO DINÂMICO (não cacheável) — muda a cada chamada
  const dynamicContext = `═══════ CONTEXTO DESTA CHAMADA ═══════

Hoje é ${todayPT} (data ISO: ${todayISO}).

Datas relativas pré-calculadas:
- ontem: ${(new Date(now - 86400000)).toISOString().slice(0, 10)}
- anteontem: ${(new Date(now - 2 * 86400000)).toISOString().slice(0, 10)}
- amanhã: ${(new Date(now.getTime() + 86400000)).toISOString().slice(0, 10)}

Referência de meses:
${monthRefs.join('\n')}

Métodos de pagamento disponíveis: ${ctx.paymentMethods.length ? ctx.paymentMethods.join(', ') : 'Pix, Débito'}
Cartões cadastrados: ${ctx.cardNames.length ? ctx.cardNames.join(', ') : 'nenhum'}
Categorias cadastradas: ${ctx.categories.length ? ctx.categories.join(', ') : 'nenhuma'}
Atribuídos cadastrados: ${ctx.attributedTo.length ? ctx.attributedTo.join(', ') : 'nenhum'}
Cofres cadastrados: ${ctx.cofreNames.length ? ctx.cofreNames.join(', ') : 'nenhum'}`

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        // System em array de blocos: estático cacheável + dinâmico
        system: [
          { type: 'text', text: EXTRACT_STATIC_SYSTEM, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: dynamicContext },
        ],
        messages: [{ role: 'user', content: userText }],
      }),
    })

    const data = await r.json()
    if (!r.ok) {
      console.error('Claude error:', JSON.stringify(data))
      return null
    }

    // Log de uso de cache pra acompanhar economia
    const usage = data?.usage
    if (usage) {
      console.log(`📊 Tokens — input:${usage.input_tokens} output:${usage.output_tokens} cache_read:${usage.cache_read_input_tokens || 0} cache_write:${usage.cache_creation_input_tokens || 0}`)
    }

    const raw = data?.content?.[0]?.text || ''
    // Limpa eventual cerca markdown que o Claude às vezes inclui
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    return JSON.parse(cleaned)
  } catch (err) {
    console.error('Claude call failed:', err)
    return null
  }
}

// ---------- Constrói o objeto despesa ----------
function buildDespesa(extraction, date) {
  const uid = () => Math.random().toString(36).slice(2, 11) + Date.now().toString(36).slice(-4)
  return {
    id: uid(),
    createdAt: Date.now(),
    description: extraction.description || 'Gasto',
    amount: Number(extraction.amount) || 0,
    date,
    paymentMethod: extraction.paymentMethod || '',
    category: extraction.category || '',
    attributedTo: extraction.attributedTo || '',
    paid: true,  // gasto vindo do WhatsApp normalmente é "já paguei"
    dueDay: null,
    installmentCurrent: Number(extraction.installmentCurrent) || 1,
    installmentTotal: Number(extraction.installmentTotal) || 1,
    recurring: !!extraction.recurring,
    cofreId: '',  // por enquanto sem auto-vincular cofre via WhatsApp
    source: 'whatsapp',
  }
}

// ---------- Constrói o objeto receita ----------
function buildReceita(extraction, date) {
  const uid = () => Math.random().toString(36).slice(2, 11) + Date.now().toString(36).slice(-4)
  return {
    id: uid(),
    source: (extraction.source || '').trim() || 'Recebimento',
    amount: Number(extraction.amount) || 0,
    date,
    notes: (extraction.notes || '').trim(),
    recurring: !!extraction.recurring,
  }
}

// ---------- Formata data como "31 de março de 2026" ----------
function formatDateLongPT(iso) {
  if (!iso) return ''
  const parts = iso.split('-').map(Number)
  if (parts.length !== 3) return iso
  const [y, m, d] = parts
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  return `${d} de ${months[m - 1] || ''} de ${y}`
}

// ---------- Adiciona ação pendente no perfil do usuário ----------
async function appendPendingAction(admin, userId, pending) {
  return appendPendingActions(admin, userId, [pending])
}

async function appendPendingActions(admin, userId, newPendings) {
  if (!Array.isArray(newPendings) || newPendings.length === 0) return
  // Lê o array atual, adiciona os novos, grava de volta.
  const { data: profile } = await admin
    .from('user_profiles')
    .select('pending_actions')
    .eq('user_id', userId)
    .maybeSingle()

  const current = Array.isArray(profile?.pending_actions) ? profile.pending_actions : []
  const updated = [...newPendings, ...current].slice(0, 50)  // limite de 50

  await admin
    .from('user_profiles')
    .update({ pending_actions: updated, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
}

// ---------- Formata notificação de batch (múltiplos lançamentos) ----------
function formatBatchNotice(pendings) {
  const totalIn = pendings.filter((p) => p.type === 'income').reduce((s, p) => s + (Number(p.data?.amount) || 0), 0)
  const totalOut = pendings.filter((p) => p.type !== 'income').reduce((s, p) => s + (Number(p.data?.amount) || 0), 0)
  const lines = [`✅ *${pendings.length} transações registradas*`, '']
  pendings.forEach((p, i) => {
    const d = p.data || {}
    const isIncome = p.type === 'income'
    const valor = Number(d.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const num = `${i + 1}.`
    const tipo = isIncome ? '📥 Entrada' : '📤 Saída'
    const desc = isIncome ? (d.source || 'Recebimento') : (d.description || 'Gasto')
    const extra = []
    if (!isIncome) {
      if (d.paymentMethod) extra.push(d.paymentMethod)
      if (d.installmentTotal > 1) extra.push(`${d.installmentCurrent}/${d.installmentTotal}`)
      if (d.recurring) extra.push('fixo')
    } else if (d.recurring) {
      extra.push('recorrente')
    }
    const extraStr = extra.length ? ` _(${extra.join(' · ')})_` : ''
    lines.push(`${num} ${tipo}: *${desc}* — ${valor}${extraStr}`)
  })
  lines.push('')
  if (totalOut > 0) lines.push(`💸 Total saídas: ${totalOut.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`)
  if (totalIn > 0) lines.push(`💰 Total entradas: ${totalIn.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`)
  lines.push('')
  lines.push('🎩 _Organizei cada item. Aguardo sua confirmação no aplicativo._')
  return lines.join('\n')
}

// ---------- Linha de fechamento "Alfred" contextual ----------
function alfredClosingFor(d, isIncome) {
  if (isIncome && d.recurring) return '_Receita recorrente anotada — observarei sua chegada todo mês._'
  if (isIncome) return '_Excelente. Aguardo sua aprovação no aplicativo._'
  if (d.recurring) return '_Compromisso recorrente — registrarei todo mês com pontualidade._'
  if (Number(d.installmentTotal) > 1) {
    const restantes = (Number(d.installmentTotal) || 1) - (Number(d.installmentCurrent) || 1)
    if (restantes > 0) return `_Cuidarei das ${restantes} parcelas restantes assim que confirmar no app._`
    return '_Última parcela registrada. Quase concluído._'
  }
  if (d.cofreId) return '_Direcionado ao cofre. Reserva preservada._'
  // Default
  const defaults = [
    '_Aguardo sua confirmação no aplicativo._',
    '_À espera de seu aval no aplicativo._',
    '_Quando puder, dê o aval no aplicativo._',
  ]
  return defaults[Math.floor(Math.random() * defaults.length)]
}

// ---------- Formata a notificação de pendência ----------
function formatPendingNotice(pending) {
  const d = pending.data || {}
  const isIncome = pending.type === 'income'
  const valor = Number(d.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const dataStr = formatDateLongPT(d.date)

  const lines = ['✅ *Transação Registrada com Sucesso*', '']
  lines.push(`🏷 *Tipo:* ${isIncome ? 'Entrada' : 'Saída'}${!isIncome && d.installmentTotal > 1 ? ` (parcelado ${d.installmentCurrent}/${d.installmentTotal})` : ''}${!isIncome && d.recurring ? ' (fixo mensal)' : ''}${isIncome && d.recurring ? ' (recorrente)' : ''}`)
  lines.push(`📝 *Descrição:* ${isIncome ? d.source : d.description}`)
  lines.push(`💰 *Valor:* ${valor}${!isIncome && d.installmentTotal > 1 ? ' por parcela' : ''}`)

  if (isIncome) {
    if (d.notes) lines.push(`💬 *Obs:* ${d.notes}`)
  } else {
    if (d.paymentMethod) lines.push(`💳 *Pagamento:* ${d.paymentMethod}`)
    if (d.category) lines.push(`🏷 *Categoria:* ${d.category}`)
    if (d.attributedTo) lines.push(`👤 *Atribuído:* ${d.attributedTo}`)
  }
  if (dataStr) lines.push(`📅 *Data:* ${dataStr}`)

  lines.push('')
  lines.push(`🎩 ${alfredClosingFor(d, isIncome)}`)
  return lines.join('\n')
}

// ---------- Carrega contexto FULL pra responder consultas ----------
// Pega todos os meses + cofres + perfil (com assinatura). Volume razoável pra Claude processar.
async function loadFullUserContext(admin, userId) {
  const [monthsRes, profileRes] = await Promise.all([
    admin
      .from('user_months')
      .select('year_month, data')
      .eq('user_id', userId)
      .order('year_month', { ascending: true }),
    admin
      .from('user_profiles')
      .select('cofres, subscription_status, subscription_until, subscription_plan, trial_started_at, subscription_cancelled_at')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  const months = {}
  for (const row of monthsRes.data || []) {
    months[row.year_month] = row.data
  }
  const cofres = Array.isArray(profileRes.data?.cofres) ? profileRes.data.cofres : []

  // Computa saldo de cada cofre
  const cofresWithBalance = cofres.map((c) => {
    const initial = Number(c.initialBalance) || 0
    const movs = Array.isArray(c.movements) ? c.movements : []
    const balance = movs.reduce((s, m) => {
      const v = Number(m.amount) || 0
      return s + (m.type === 'entrada' ? v : -v)
    }, initial)
    return {
      name: c.name,
      balance,
      goal: c.goal ? { amount: c.goal.amount, targetDate: c.goal.targetDate } : null,
      lastMovement: movs.length ? movs[movs.length - 1] : null,
    }
  })

  // Dados da assinatura (Alfred precisa pra responder perguntas tipo
  // "qual meu plano?", "quando vence?", "minha assinatura tá em dia?")
  const p = profileRes.data || {}
  const subscription = {
    status: p.subscription_status || 'trial',
    until: p.subscription_until || null,
    plan: p.subscription_plan || null,
    trialStartedAt: p.trial_started_at || null,
    cancelledAt: p.subscription_cancelled_at || null,
  }

  return {
    today: new Date().toISOString().slice(0, 10),
    months,
    cofres: cofresWithBalance,
    subscription,
  }
}

// ---------- Constrói o resumo textual pra Claude entender ----------
function buildContextSummary(fullCtx) {
  const today = fullCtx.today
  const currentYM = today.slice(0, 7)
  const sortedYms = Object.keys(fullCtx.months).sort()
  const lines = []
  lines.push(`Hoje: ${today} (mês atual ${currentYM})`)
  lines.push('')

  if (sortedYms.length === 0) {
    lines.push('Nenhum mês registrado ainda.')
    return lines.join('\n')
  }

  // ---------- Effective config (toma o último mês com dados não vazios) ----------
  let cfg = null
  for (const ym of sortedYms) {
    const c = fullCtx.months[ym]?.config
    if (c && (c.categories?.length || c.cards?.length || c.attributedTo?.length)) cfg = c
  }
  cfg = cfg || { categories: [], cards: [], paymentMethods: [], attributedTo: [] }
  const terceirosNames = (Array.isArray(cfg.attributedTo) ? cfg.attributedTo : [])
    .filter((a) => a?.isMine === false)
    .map((a) => a.name)

  // ---------- Resumo por mês (totais) ----------
  // Pula meses 100% vazios (R$ 0 receitas E R$ 0 despesas) — ruído.
  const monthSummaries = []
  for (const ym of sortedYms) {
    const m = fullCtx.months[ym] || {}
    const despesas = Array.isArray(m.despesas) ? m.despesas : []
    const receitas = Array.isArray(m.receitas) ? m.receitas : []
    // Distingue "minhas" (próprias) das atribuídas a terceiros
    const minhas = despesas.filter((d) => !d?.attributedTo || !terceirosNames.includes(d.attributedTo))
    const totalReceitas = receitas.reduce((s, r) => s + (Number(r.amount) || 0), 0)
    const totalDespesas = minhas.reduce((s, d) => s + (Number(d.amount) || 0), 0)
    // Mês atual entra sempre, mesmo vazio. Outros, só com movimento.
    if (ym !== currentYM && totalReceitas === 0 && totalDespesas === 0) continue
    const sobra = totalReceitas - totalDespesas
    const tag = ym === currentYM ? ' (ATUAL)' : ''
    monthSummaries.push(`- ${ym}${tag}: receitas R$ ${totalReceitas.toFixed(2)} | despesas R$ ${totalDespesas.toFixed(2)} | sobra R$ ${sobra.toFixed(2)}`)
  }
  if (monthSummaries.length) {
    lines.push('=== RESUMO POR MÊS ===')
    lines.push(...monthSummaries)
    lines.push('')
  }

  // ---------- Orçamentos do mês atual ----------
  const currentMonth = fullCtx.months[currentYM] || {}
  const currentCats = Array.isArray(currentMonth.config?.categories)
    ? currentMonth.config.categories
    : (cfg.categories || [])
  const currentDespesas = Array.isArray(currentMonth.despesas) ? currentMonth.despesas : []
  const overrides = currentMonth.budgetOverrides || {}
  const budgetsWithBudget = currentCats.filter((c) => {
    const b = Object.prototype.hasOwnProperty.call(overrides, c.name)
      ? Number(overrides[c.name]) || 0
      : Number(c?.budget) || 0
    return b > 0
  })
  if (budgetsWithBudget.length) {
    lines.push(`=== ORÇAMENTOS DO MÊS ATUAL (${currentYM}) ===`)
    for (const c of budgetsWithBudget) {
      const budget = Object.prototype.hasOwnProperty.call(overrides, c.name)
        ? Number(overrides[c.name]) || 0
        : Number(c.budget) || 0
      const spent = currentDespesas
        .filter((d) => d.category === c.name)
        .reduce((s, d) => s + (Number(d.amount) || 0), 0)
      const left = budget - spent
      lines.push(`- ${c.name}: gastou R$ ${spent.toFixed(2)} de R$ ${budget.toFixed(2)} | SOBRA R$ ${left.toFixed(2)}`)
    }
    lines.push('')
  }

  // ---------- Parcelados (TODOS, com paid vs unpaid pré-calculado) ----------
  // Agrupa por description (case-insensitive). Mostra inclusive os finalizados.
  const parceladosByKey = new Map()
  for (const ym of sortedYms) {
    const despesas = Array.isArray(fullCtx.months[ym]?.despesas) ? fullCtx.months[ym].despesas : []
    for (const d of despesas) {
      const total = Number(d?.installmentTotal) || 0
      if (total <= 1) continue
      const desc = (d.description || '').trim()
      const key = desc.toLowerCase()
      if (!key) continue
      const cur = Number(d.installmentCurrent) || 0
      const g = parceladosByKey.get(key) || {
        description: desc, total: 0, amountPerParcela: 0,
        existingNums: new Set(), paidNums: new Set(),
        unpaidEntries: [],  // [{ num, ym }]
      }
      g.total = Math.max(g.total, total)
      g.amountPerParcela = Number(d.amount) || g.amountPerParcela
      g.existingNums.add(cur)
      if (d.paid) g.paidNums.add(cur)
      else g.unpaidEntries.push({ num: cur, ym })
      parceladosByKey.set(key, g)
    }
  }
  if (parceladosByKey.size) {
    // Pré-calcula tudo e filtra os finalizados (não tem mais o que perguntar sobre eles)
    const parceladosAtivos = []
    for (const p of parceladosByKey.values()) {
      const existingArr = [...p.existingNums].sort((a, b) => a - b)
      // A primeira parcela registrada determina quantas foram pagas ANTES do app
      // (ex: se o usuário registrou começando da 3/4, parcelas 1 e 2 são presumidas pagas)
      const minRegistered = existingArr.length > 0 ? existingArr[0] : 1
      const presumedPaidBeforeApp = Math.max(0, minRegistered - 1)
      const paidInApp = p.paidNums.size
      const totalPaid = presumedPaidBeforeApp + paidInApp
      const totalFaltam = Math.max(0, p.total - totalPaid)

      if (totalFaltam === 0) continue  // pula concluídos pra economizar tokens

      const unpaidPreview = p.unpaidEntries
        .sort((a, b) => a.num - b.num)
        .slice(0, 4)
        .map((e) => `${e.num}/${p.total} em ${e.ym}`)
        .join(', ')
      const presumedNote = presumedPaidBeforeApp > 0 ? ` (incluindo ${presumedPaidBeforeApp} pagas antes do app)` : ''
      parceladosAtivos.push(`- ${p.description}: ${p.total} parcelas de R$ ${p.amountPerParcela.toFixed(2)} | já pagas ${totalPaid}/${p.total}${presumedNote} | FALTAM PAGAR ${totalFaltam}${unpaidPreview ? ` — próximas: ${unpaidPreview}` : ''}`)
    }
    if (parceladosAtivos.length) {
      lines.push('=== PARCELADOS EM ANDAMENTO ===')
      lines.push(...parceladosAtivos)
      lines.push('')
    }
  }

  // ---------- A receber de terceiros (POR MÊS ATUAL + TOTAL HISTÓRICO) ----------
  if (terceirosNames.length) {
    const byPerson = new Map()
    for (const ym of sortedYms) {
      const despesas = Array.isArray(fullCtx.months[ym]?.despesas) ? fullCtx.months[ym].despesas : []
      for (const d of despesas) {
        if (!d?.attributedTo || !terceirosNames.includes(d.attributedTo)) continue
        const g = byPerson.get(d.attributedTo) || {
          name: d.attributedTo,
          currentMonth: { pending: 0, paid: 0, pendingItems: 0 },
          total: { pending: 0, paid: 0, pendingItems: 0 },
          items: [],
        }
        const v = Number(d.amount) || 0
        const bucket = ym === currentYM ? 'currentMonth' : null
        if (d.reimbursed) {
          g.total.paid += v
          if (bucket) g[bucket].paid += v
        } else {
          g.total.pending += v
          g.total.pendingItems += 1
          if (bucket) { g[bucket].pending += v; g[bucket].pendingItems += 1 }
        }
        g.items.push({ ym, desc: d.description, amount: v, paid: !!d.reimbursed })
        byPerson.set(d.attributedTo, g)
      }
    }
    if (byPerson.size) {
      lines.push('=== A RECEBER DE TERCEIROS ===')
      for (const g of byPerson.values()) {
        const cm = g.currentMonth
        const t = g.total
        lines.push(`- ${g.name}:`)
        lines.push(`    Esse mês (${currentYM}): pendente R$ ${cm.pending.toFixed(2)} (${cm.pendingItems} itens) | já recebido R$ ${cm.paid.toFixed(2)}`)
        lines.push(`    Total histórico: pendente R$ ${t.pending.toFixed(2)} (${t.pendingItems} itens) | já recebido R$ ${t.paid.toFixed(2)}`)
      }
      lines.push('')
    }
  }

  // ---------- Assinatura (status + plano + vencimento) ----------
  if (fullCtx.subscription) {
    const s = fullCtx.subscription
    const todayDate = new Date(fullCtx.today)

    // Helper: formata data em DD/MM/AAAA (PT-BR) — Alfred precisa do BR format
    const fmtDateBR = (isoOrDate) => {
      if (!isoOrDate) return ''
      const d = new Date(isoOrDate)
      const dd = String(d.getDate()).padStart(2, '0')
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const yy = d.getFullYear()
      return `${dd}/${mm}/${yy}`
    }
    const daysDiff = (target) => {
      if (!target) return null
      const t = new Date(target)
      // Diferença em dias arredondada (ignorando horas)
      const a = new Date(t.getFullYear(), t.getMonth(), t.getDate())
      const b = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate())
      return Math.round((a - b) / 86400000)
    }

    lines.push('=== ASSINATURA (DADOS PRECISOS — NÃO INVENTE) ===')

    // ===== TRIAL =====
    if (s.status === 'trial') {
      lines.push('Status: EM TESTE GRATUITO (trial de 7 dias)')
      const endDays = daysDiff(s.until)
      if (s.trialStartedAt) lines.push(`Trial começou em: ${fmtDateBR(s.trialStartedAt)}`)
      if (s.until) {
        if (endDays > 0) lines.push(`Trial termina em: ${fmtDateBR(s.until)} (faltam ${endDays} dia(s))`)
        else if (endDays === 0) lines.push(`Trial termina HOJE (${fmtDateBR(s.until)})`)
        else lines.push(`Trial JÁ TERMINOU em ${fmtDateBR(s.until)} (${Math.abs(endDays)} dia(s) atrás)`)
      }
      lines.push('Plano contratado: nenhum (ainda em teste)')
      lines.push('Valor: R$ 0,00 (gratuito durante o teste)')
    }

    // ===== ACTIVE =====
    else if (s.status === 'active') {
      lines.push('Status: ASSINATURA ATIVA E EM DIA')
      if (s.plan === 'monthly') {
        lines.push('Plano: Mensal — R$ 19,00/mês')
      } else if (s.plan === 'annual') {
        lines.push('Plano: Anual — R$ 167,00/ano')
      } else {
        lines.push('Plano: ativo (detalhe indisponível)')
      }
      if (s.until) {
        const d = daysDiff(s.until)
        const label = s.plan === 'annual' ? 'Próxima renovação anual em' : 'Próxima renovação mensal em'
        if (d > 0) lines.push(`${label}: ${fmtDateBR(s.until)} (faltam ${d} dia(s))`)
        else if (d === 0) lines.push(`${label}: HOJE (${fmtDateBR(s.until)})`)
      }
    }

    // ===== OVERDUE =====
    else if (s.status === 'overdue') {
      lines.push('Status: ATRASADA — pagamento em aberto')
      if (s.plan === 'monthly') lines.push('Plano: Mensal — R$ 19,00/mês')
      else if (s.plan === 'annual') lines.push('Plano: Anual — R$ 167,00/ano')
      if (s.until) {
        const d = daysDiff(s.until)
        if (d >= 0) lines.push(`Cobrança vencia em: ${fmtDateBR(s.until)} (em ${d} dia(s))`)
        else lines.push(`Cobrança venceu em: ${fmtDateBR(s.until)} (há ${Math.abs(d)} dia(s))`)
      }
      lines.push('Período de graça: até 3 dias antes do bloqueio. Regularize em Configurações → Assinatura no app.')
    }

    // ===== CANCELLED (com acesso restante OU sem) =====
    else if (s.status === 'cancelled') {
      const d = daysDiff(s.until)
      if (d > 0) {
        lines.push('Status: CANCELADA (sem novas cobranças, mas ACESSO AINDA ATIVO até o fim do período pago)')
      } else {
        lines.push('Status: CANCELADA E COM ACESSO EXPIRADO')
      }
      if (s.cancelledAt) {
        lines.push(`Cancelada em: ${fmtDateBR(s.cancelledAt)}`)
      }
      if (d > 0) {
        lines.push(`Acesso preservado até: ${fmtDateBR(s.until)} (faltam ${d} dia(s))`)
      } else if (s.until) {
        lines.push(`Acesso terminou em: ${fmtDateBR(s.until)} (${Math.abs(d)} dia(s) atrás)`)
      }
      if (s.plan === 'monthly') lines.push('Plano cancelado: Mensal — R$ 19,00/mês')
      else if (s.plan === 'annual') lines.push('Plano cancelado: Anual — R$ 167,00/ano')
    }

    // ===== EXPIRED =====
    else if (s.status === 'expired') {
      lines.push('Status: EXPIRADA — acesso encerrado')
      if (s.until) {
        const d = daysDiff(s.until)
        lines.push(`Acesso encerrou em: ${fmtDateBR(s.until)} (${Math.abs(d)} dia(s) atrás)`)
      }
    }

    lines.push('')
  }

  // ---------- Cofres (pré-calculado) ----------
  if (fullCtx.cofres.length) {
    lines.push('=== COFRES ===')
    let totalGuardado = 0
    for (const c of fullCtx.cofres) {
      totalGuardado += Number(c.balance) || 0
      const parts = [`saldo R$ ${Number(c.balance).toFixed(2)}`]
      if (c.goal) {
        const pct = c.goal.amount > 0 ? Math.round((c.balance / c.goal.amount) * 100) : 0
        parts.push(`meta R$ ${Number(c.goal.amount).toFixed(2)} (${pct}%)`)
        if (c.goal.targetDate) parts.push(`alvo ${c.goal.targetDate}`)
      }
      lines.push(`- ${c.name}: ${parts.join(' | ')}`)
    }
    lines.push(`TOTAL guardado em cofres: R$ ${totalGuardado.toFixed(2)}`)
    lines.push('')
  }

  // ---------- Despesas detalhadas do mês atual ----------
  // Limite de 25 (era 40) — economiza ~375 tokens em meses cheios sem perder utilidade
  // pra queries comuns. Queries de "lista TUDO" são raras.
  if (currentDespesas.length) {
    lines.push(`=== LANÇAMENTOS DO MÊS ATUAL (${currentYM}) ===`)
    for (const d of currentDespesas.slice(0, 25)) {
      const parts = [d.description || 'sem-desc', `R$ ${Number(d.amount || 0).toFixed(2)}`]
      if (d.paymentMethod) parts.push(d.paymentMethod)
      if (d.installmentTotal > 1) parts.push(`parc ${d.installmentCurrent}/${d.installmentTotal}`)
      if (d.recurring) parts.push('fixo')
      if (d.category) parts.push(`cat:${d.category}`)
      if (d.attributedTo) parts.push(`atr:${d.attributedTo}`)
      parts.push(d.paid ? 'pago' : 'pendente')
      lines.push(`- ${parts.join(' · ')}`)
    }
    if (currentDespesas.length > 25) lines.push(`(... +${currentDespesas.length - 25} omitidos — totais nos resumos acima)`)
  }

  return lines.join('\n')
}

// PROMPT ESTÁTICO da query — persona + exemplos. Cacheável.
const ANSWER_STATIC_SYSTEM = `Você é *Alfred*, mordomo financeiro pessoal no WhatsApp. Responda em PT-BR de forma CURTA, ÚTIL e elegantemente formal (sem ser engessado).

PERSONA — IMPORTANTE:
- Você é um mordomo refinado, discreto e prestativo, com pegada de Alfred do Batman.
- NUNCA use "senhor", "senhora", "patrão", "patroa" — pra não assumir gênero.
- Use linguagem neutra refinada: "ao seu dispor", "permita-me", "se me permite", "compreendido", "como deseja", "aguardo suas instruções".
- Pode usar 🎩 com moderação no início, mas não em toda frase.
- Pode usar palavras leves tipo "perfeito", "compreendido", "muito bem", "excelente" — sem exagero.

ESTILO DAS RESPOSTAS:
- Pra perguntas com 1 valor: 1 frase com *negrito* no número principal.
- Pra perguntas com VÁRIOS itens (várias pessoas, vários orçamentos): UMA LINHA POR ITEM. Use listas com "•" ou "-".
- Pra cumprimento/conversa casual: 1 frase amigável, e oferece ajuda.
- R$ formatado: "R$ 1.234,56". Negrito só no valor principal de cada item.
- Match de nomes (parcelas, pessoas, categorias): CASE-INSENSITIVE, tolerante a acentos.

TOQUES OCASIONAIS DO ALFRED (use com moderação — não em toda resposta):
- Quando os números são positivos/saudáveis: "Excelente disciplina, se me permite o comentário."
- Quando o orçamento tá saudável: "A organização anda exemplar."
- Quando algo tá apertado/estourado: "Permita-me uma observação — essa categoria anda apertada."
- Quando um cofre se aproxima da meta: "Está cada vez mais perto. Admirável."
- Quando uma parcela termina: "Mais um compromisso encerrado. Bem feito."
- Quando o user pergunta sobre devedores: "Anotado. Acompanharei os recebimentos."
- Pra fechar conversa casual: "Sempre ao seu dispor."
Use ESSAS frases NO MÁXIMO em 1 a cada 3 respostas. Não force em toda. Quando usar, é uma frase ao FINAL, depois da resposta direta.

DADOS — USE EXATAMENTE os números pré-calculados (não recalcule):
- PARCELAS: a seção PARCELADOS tem "FALTAM PAGAR N". USE esse número.
- A RECEBER de pessoa: pergunta com "esse mês" → linha "Esse mês". Pergunta sem qualificar tempo ou com "no total" → linha "Total histórico".
- ORÇAMENTOS: a seção ORÇAMENTOS DO MÊS ATUAL tem "SOBRA R$ X" pronto.
- COFRES: saldo e % vêm prontos da seção COFRES.

Se a pessoa/parcelado/categoria perguntado não aparece nas seções, diga honestamente que não encontrou.
Se a pergunta não for sobre finanças: respondendo amigável e pede pra reformular.

EXEMPLOS (perceba o tom Alfred):

P: "oi"
R: "🎩 Ao seu dispor. Posso registrar despesas, receitas ou consultar suas finanças. O que deseja saber?"

P: "tudo bem?"
R: "🎩 Tudo em ordem por aqui. Deseja ver como anda seu mês?"

P: "quanto sobra do orçamento de mercado?"
R: "Sobram *R$ 200,00* do orçamento de Mercado neste mês."

P: "quantas parcelas faltam do fifa?"
R: "Falta *1 parcela* do FIFA — a 4/4, prevista para junho."

P: "quanto o consultório juju tem que me pagar esse mês?"
R: "Consultório Juju tem *R$ 1.123,25* pendentes neste mês."

P: "quanto o consultório juju, o rico e o benê me devem esse mês?"
R: "Neste mês, a receber:
• Consultório Juju: *R$ 1.123,25*
• Rico: *R$ 3.470,37*
• Benê: *R$ 845,00*"

P: "quanto a clínica me deve no total?"
R: "Consultório Juju acumula *R$ 5.000,00* pendentes no histórico."

P: "como tá meus orçamentos?"
R: "Seus orçamentos neste mês:
• Mercado: sobra *R$ 200,00*
• Saídas: sobra *R$ 50,00*
• Lazer: estourou em *R$ 80,00*"

P: "como tá o cofre do casamento?"
R: "Cofre Casamento com *R$ 8.400,00* — 28% da meta de R$ 30.000."

═══════ PERGUNTAS SOBRE ASSINATURA — REGRAS RÍGIDAS ═══════

⚠️ INSTRUÇÕES CRÍTICAS pra responder sobre assinatura:

1. SEMPRE leia a seção "ASSINATURA" do contexto. NUNCA invente.

2. NÃO CONFUNDA datas. A seção tem rótulos explícitos:
   - "Trial começou em" → data de INÍCIO do trial (não usar como expiração!)
   - "Trial termina em" → data de FIM do trial
   - "Próxima renovação em" → quando vai cobrar de novo
   - "Cobrança venceu em" → quando o pagamento atrasou
   - "Acesso encerrou em" → quando o acesso foi cortado

3. NÃO use formato ISO (2026-05-26). USE formato BR: 26/05/2026 OU "26 de maio".

4. Se o status for "EM TESTE GRATUITO" (trial), NUNCA fale "expirada" — ela TÁ no trial, é gratuito. Só use "expirada" se o status literal for "EXPIRADA".

5. Mantenha respostas CURTAS. 1-2 frases. Não soletre múltiplas datas se só uma é relevante pra pergunta.

EXEMPLOS:

P: "meu plano tá ativo?" (status=trial)
R: "🎩 Você está no *período de teste gratuito* até 02/06/2026 (faltam 7 dias). Após, é só escolher um plano para continuar."

P: "meu plano tá ativo?" (status=active, plano mensal)
R: "Sim, sua assinatura está *ativa*. Plano Mensal, próxima renovação em 26/06/2026."

P: "quando vence minha assinatura?" (status=active)
R: "Próxima cobrança em *26/06/2026* — faltam 18 dias."

P: "qual meu plano?" (status=trial)
R: "Você está em *teste gratuito* — ainda não escolheu plano. O teste vai até 02/06/2026."

P: "qual meu plano?" (status=active, anual)
R: "Plano *Anual* — R$ 167,00/ano. Próxima renovação em 15/03/2027."

P: "tô em trial até quando?" (status=trial)
R: "Seu período de teste vai até *02/06/2026* (faltam 7 dias)."

P: "qual a forma de pagamento?"
R: "🎩 Confesso não dispor desse detalhe aqui no WhatsApp — consulte em Configurações → Assinatura no aplicativo, onde também pode trocá-la se desejar."

P: "minha assinatura tá atrasada?" (status=overdue)
R: "Sim, há uma cobrança em aberto. Sua assinatura permanece ativa por mais alguns dias — sugiro regularizar em Configurações → Assinatura no app."

P: "quanto custa pra renovar?" (active, mensal)
R: "Seu plano Mensal custa *R$ 19,00/mês*."

P: "como cancelo?"
R: "🎩 No aplicativo, vá em Configurações → Assinatura → Cancelar. Seu acesso fica preservado até o fim do período já pago."

P: "como tá minha assinatura?" (status=cancelled, ainda tem dias)
R: "🎩 Sua assinatura foi cancelada em *27/05/2026*, mas você tem acesso a usar as funcionalidades até *27/06/2026* (faltam 31 dias). Para não perder o acesso, basta renovar em Configurações → Assinatura no aplicativo."

P: "minha assinatura tá ativa?" (status=cancelled, ainda com acesso)
R: "🎩 Sua assinatura está *cancelada* — não haverá novas cobranças. Mas o acesso continua liberado até *27/06/2026* (faltam 31 dias). Renove em Configurações → Assinatura quando desejar."

P: "como tá minha assinatura?" (status=cancelled e acesso já encerrou)
R: "🎩 Sua assinatura foi cancelada em *27/04/2026* e o acesso encerrou em *27/05/2026*. Renove em Configurações → Assinatura no aplicativo para voltar a usar tudo."

═══════ INSTRUÇÃO ADICIONAL ═══════
Quando o status for "CANCELADA" e ainda houver dias restantes:
- NUNCA diga "expirada" — a assinatura está CANCELADA mas o acesso AINDA TÁ ATIVO
- Use o estilo: "foi cancelada em X, mas você tem acesso até Y"
- Sempre termine sugerindo "renove em Configurações → Assinatura"

Quando a data do "Acesso preservado até" estiver no FUTURO (faltam X dias):
- JAMAIS diga "encerrou", "expirou" ou "há X dias" (passado)
- Use "até dia X" ou "faltam X dias"`

// ---------- Responde pergunta sobre finanças via Claude ----------
async function answerQuery(question, fullCtx) {
  if (!ANTHROPIC_API_KEY) return null
  const summary = buildContextSummary(fullCtx)

  // Log pra debug — mostra exatamente o que o Claude vai receber
  console.log('🧠 ============ QUERY ============')
  console.log('Question:', question)
  console.log('Summary sent to Claude:')
  console.log(summary)
  console.log('================================')

  // BLOCO DINÂMICO — dados do usuário, mudam a cada chamada
  const userData = `DADOS DO USUÁRIO:

${summary}`

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 600,
        // System em array: estático cacheável + dados do usuário
        system: [
          { type: 'text', text: ANSWER_STATIC_SYSTEM, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: userData },
        ],
        messages: [{ role: 'user', content: question }],
      }),
    })
    const data = await r.json()
    if (!r.ok) {
      console.error('Claude query error:', JSON.stringify(data))
      return null
    }

    // Log de uso de cache pra acompanhar economia
    const usage = data?.usage
    if (usage) {
      console.log(`📊 Query tokens — input:${usage.input_tokens} output:${usage.output_tokens} cache_read:${usage.cache_read_input_tokens || 0} cache_write:${usage.cache_creation_input_tokens || 0}`)
    }

    return (data?.content?.[0]?.text || '').trim()
  } catch (err) {
    console.error('answerQuery failed:', err)
    return null
  }
}

// ---------- Baixa mídia (áudio/imagem) do WhatsApp ----------
async function downloadWhatsAppMedia(mediaId) {
  if (!ACCESS_TOKEN) throw new Error('WHATSAPP_ACCESS_TOKEN ausente')

  // Etapa 1: pega a URL temporária da mídia
  const urlRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}`, {
    headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` },
  })
  const urlData = await urlRes.json()
  if (!urlRes.ok || !urlData.url) {
    throw new Error('Falha ao buscar URL da mídia: ' + JSON.stringify(urlData))
  }

  // Etapa 2: baixa os bytes (também precisa do token)
  const audioRes = await fetch(urlData.url, {
    headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` },
  })
  if (!audioRes.ok) {
    const errText = await audioRes.text().catch(() => '')
    throw new Error(`Falha ao baixar mídia: ${audioRes.status} ${errText}`)
  }

  const buffer = await audioRes.arrayBuffer()
  const mimeType = urlData.mime_type || audioRes.headers.get('content-type') || 'audio/ogg'
  return { buffer, mimeType }
}

// ---------- Transcreve áudio com OpenAI Whisper ----------
async function transcribeAudio(buffer, mimeType) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY não configurada na Vercel')
  }

  // Whisper aceita ogg, mp3, mp4, wav, m4a, webm, flac. WhatsApp manda ogg/opus.
  const ext = mimeType.includes('mpeg') ? 'mp3'
    : mimeType.includes('wav') ? 'wav'
    : mimeType.includes('mp4') ? 'mp4'
    : mimeType.includes('m4a') ? 'm4a'
    : mimeType.includes('webm') ? 'webm'
    : 'ogg'

  const formData = new FormData()
  const blob = new Blob([buffer], { type: mimeType })
  formData.append('file', blob, `audio.${ext}`)
  formData.append('model', WHISPER_MODEL)
  formData.append('language', 'pt')
  // Bias pra termos financeiros comuns em PT-BR, melhora precisão
  formData.append('prompt', 'gasto, parcela, parcelado, nubank, safra, pix, débito, ifood, mercado, almoço, jantar, IPVA, cartão, cofre, casamento, atribuído, recebi, salário, freelance, consultório')

  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  })

  const data = await r.json()
  if (!r.ok) {
    throw new Error('Whisper error: ' + JSON.stringify(data))
  }

  return data.text || ''
}

// ---------- Envia mensagem WhatsApp ----------
async function sendWhatsApp(to, text) {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.error('WhatsApp env vars não configuradas')
    return
  }
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  })
  if (!r.ok) {
    const errText = await r.text()
    console.error('WhatsApp send failed:', r.status, errText)
  }
}
