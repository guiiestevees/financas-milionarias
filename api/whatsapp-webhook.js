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
        text = (await transcribeAudio(buffer, mimeType)).trim()
        console.log(`🎤 Transcrito: "${text}"`)
      } catch (err) {
        console.error('Audio handling failed:', err)
        await sendWhatsApp(from, '🎤 Não consegui processar o áudio. Tenta gravar de novo ou manda por texto.')
        return res.status(200).json({ ok: true })
      }
    } else {
      // imagem, vídeo, sticker, etc — ainda não suportado
      await sendWhatsApp(from, '🤖 Entendo texto e áudio. Foto da nota chega na próxima fase.')
      return res.status(200).json({ ok: true })
    }

    if (!text) {
      if (cameFromAudio) {
        await sendWhatsApp(from, '🎤 Não consegui entender o que você falou. Pode tentar de novo?')
      }
      return res.status(200).json({ ok: true })
    }

    console.log(`📲 ${from} (${type}): ${text}`)

    // Se veio de áudio, manda um "ouvi: ..." pro user confirmar visualmente o que entendi
    if (cameFromAudio) {
      await sendWhatsApp(from, `🎤 Ouvi: _"${text}"_`)
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
      await sendWhatsApp(from, '👋 Olá! Esse número não está vinculado a nenhuma conta. Abra o app, vá em Configurações → WhatsApp e adicione esse número aqui.')
      return res.status(200).json({ ok: true })
    }

    const userId = profile.user_id

    // 2) Carrega contexto do usuário (cards, categorias, atribuídos, cofres)
    const context = await loadUserContext(admin, userId)

    // 3) Pede pro Claude extrair o gasto
    const extraction = await extractExpense(text, context)
    console.log('🧠 Claude:', JSON.stringify(extraction))

    if (!extraction) {
      await sendWhatsApp(from, '🤖 Não consegui processar agora. Tenta de novo em alguns segundos.')
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

    // 4c) Outras intenções (saudação, conversa, etc)
    if (extraction.intent !== 'register_expense' && extraction.intent !== 'register_income') {
      await sendWhatsApp(from, `🤖 ${extraction.reply || 'Manda um gasto, uma receita ou uma pergunta sobre suas finanças.'}`)
      return res.status(200).json({ ok: true })
    }

    if (!extraction.amount || extraction.amount <= 0) {
      await sendWhatsApp(from, '🤖 Não consegui identificar o valor. Manda algo tipo "almoço 25 pix" — o número é o que importa.')
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

  const system = `Você é um assistente financeiro brasileiro super inteligente que conversa naturalmente em português. Sua função é entender o que o usuário quer (registrar gasto, registrar receita, perguntar sobre finanças, ou conversar) e responder com um JSON estruturado.

Hoje é ${todayPT} (data ISO: ${todayISO}).

Referência de meses:
${monthRefs.join('\n')}

Métodos de pagamento disponíveis: ${ctx.paymentMethods.length ? ctx.paymentMethods.join(', ') : 'Pix, Débito'}
Cartões cadastrados: ${ctx.cardNames.length ? ctx.cardNames.join(', ') : 'nenhum'}
Categorias cadastradas: ${ctx.categories.length ? ctx.categories.join(', ') : 'nenhuma'}
Atribuídos cadastrados: ${ctx.attributedTo.length ? ctx.attributedTo.join(', ') : 'nenhum'}
Cofres cadastrados: ${ctx.cofreNames.length ? ctx.cofreNames.join(', ') : 'nenhum'}

SUA TAREFA: retorne APENAS um JSON válido (sem markdown, sem texto fora do JSON), classificando a mensagem em um destes intents:

- "register_expense" → gasto / saída de dinheiro
- "register_income" → receita / entrada de dinheiro
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
  "date": "YYYY-MM-DD (use a tabela de meses acima pra resolver expressões relativas) ou null se for hoje",
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

Use a tabela de meses acima. NÃO calcule de cabeça:
- "hoje", "agora" → null (= ${todayISO})
- "ontem" → ${(new Date(now - 86400000)).toISOString().slice(0, 10)}
- "anteontem" → ${(new Date(now - 2 * 86400000)).toISOString().slice(0, 10)}
- "amanhã" → ${(new Date(now.getTime() + 86400000)).toISOString().slice(0, 10)}
- "mês que vem" / "próximo mês" / "no mês que vem" SEM DIA → use o dia 01 do mês seguinte (veja tabela acima)
- "dia X do mês que vem" → use o dia X do mês seguinte
- "DD/MM" sozinho → assume ano atual (ou próximo se DD/MM já passou)
- "DD/MM/AAAA" → exatamente essa data
- "semana que vem" → 7 dias à frente

═══════ REGRAS DE EXTRAÇÃO ═══════

- paymentMethod / category / attributedTo: SÓ se a pessoa mencionou EXPLICITAMENTE e o valor existe NA LISTA acima. Match case-insensitive e tolerante a acentos. Em caso de dúvida, retorne null (NÃO INVENTE).
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

"lança um gasto pro mês que vem" → {"intent":"clarify","reply":"Claro! Me passa a descrição, o valor e o método (pix, cartão, etc)."}

"recebi um valor" → {"intent":"clarify","reply":"Beleza! Quanto e de quem?"}

"oi" → {"intent":"other","reply":"Oi! 👋 Manda um gasto pra registrar, uma receita ou pergunta sobre suas finanças."}

"tudo bem?" → {"intent":"other","reply":"Tudo! Quer ver como tá seu mês ou registrar algo?"}

"obrigado" → {"intent":"other","reply":"Pra você! Qualquer coisa, é só chamar. 💪"}`

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
        system,
        messages: [{ role: 'user', content: userText }],
      }),
    })

    const data = await r.json()
    if (!r.ok) {
      console.error('Claude error:', JSON.stringify(data))
      return null
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
  // Lê o array atual, adiciona o novo, grava de volta.
  const { data: profile } = await admin
    .from('user_profiles')
    .select('pending_actions')
    .eq('user_id', userId)
    .maybeSingle()

  const current = Array.isArray(profile?.pending_actions) ? profile.pending_actions : []
  const updated = [pending, ...current].slice(0, 50)  // limite de 50 pendings pra evitar buffer enorme

  await admin
    .from('user_profiles')
    .update({ pending_actions: updated, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
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
  lines.push('👀 _Aguardando confirmação no app._')
  if (!isIncome && d.installmentTotal > 1) {
    lines.push(`_(Ao confirmar, criarei as ${d.installmentTotal - d.installmentCurrent} parcelas restantes nos próximos meses.)_`)
  }
  return lines.join('\n')
}

// ---------- Carrega contexto FULL pra responder consultas ----------
// Pega todos os meses + cofres + perfil. Volume razoável pra Claude processar.
async function loadFullUserContext(admin, userId) {
  const [monthsRes, profileRes] = await Promise.all([
    admin
      .from('user_months')
      .select('year_month, data')
      .eq('user_id', userId)
      .order('year_month', { ascending: true }),
    admin
      .from('user_profiles')
      .select('cofres')
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

  return {
    today: new Date().toISOString().slice(0, 10),
    months,
    cofres: cofresWithBalance,
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
  lines.push('=== RESUMO POR MÊS ===')
  for (const ym of sortedYms) {
    const m = fullCtx.months[ym] || {}
    const despesas = Array.isArray(m.despesas) ? m.despesas : []
    const receitas = Array.isArray(m.receitas) ? m.receitas : []
    // Distingue "minhas" (próprias) das atribuídas a terceiros
    const minhas = despesas.filter((d) => !d?.attributedTo || !terceirosNames.includes(d.attributedTo))
    const totalReceitas = receitas.reduce((s, r) => s + (Number(r.amount) || 0), 0)
    const totalDespesas = minhas.reduce((s, d) => s + (Number(d.amount) || 0), 0)
    const sobra = totalReceitas - totalDespesas
    const tag = ym === currentYM ? ' (ATUAL)' : ''
    lines.push(`- ${ym}${tag}: receitas R$ ${totalReceitas.toFixed(2)} | despesas R$ ${totalDespesas.toFixed(2)} | sobra R$ ${sobra.toFixed(2)}`)
  }
  lines.push('')

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
    lines.push('=== PARCELADOS ===')
    for (const p of parceladosByKey.values()) {
      const existingArr = [...p.existingNums].sort((a, b) => a - b)
      // A primeira parcela registrada determina quantas foram pagas ANTES do app
      // (ex: se o usuário registrou começando da 3/4, parcelas 1 e 2 são presumidas pagas)
      const minRegistered = existingArr.length > 0 ? existingArr[0] : 1
      const presumedPaidBeforeApp = Math.max(0, minRegistered - 1)
      const paidInApp = p.paidNums.size
      const totalPaid = presumedPaidBeforeApp + paidInApp
      const totalFaltam = Math.max(0, p.total - totalPaid)

      if (totalFaltam === 0) {
        lines.push(`- ${p.description}: ${p.total} parcelas de R$ ${p.amountPerParcela.toFixed(2)} | TODAS PAGAS (concluído)`)
      } else {
        const unpaidPreview = p.unpaidEntries
          .sort((a, b) => a.num - b.num)
          .slice(0, 4)
          .map((e) => `${e.num}/${p.total} em ${e.ym}`)
          .join(', ')
        const presumedNote = presumedPaidBeforeApp > 0 ? ` (incluindo ${presumedPaidBeforeApp} pagas antes do app)` : ''
        lines.push(`- ${p.description}: ${p.total} parcelas de R$ ${p.amountPerParcela.toFixed(2)} | já pagas ${totalPaid}/${p.total}${presumedNote} | FALTAM PAGAR ${totalFaltam}${unpaidPreview ? ` — próximas: ${unpaidPreview}` : ''}`)
      }
    }
    lines.push('')
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
  if (currentDespesas.length) {
    lines.push(`=== LANÇAMENTOS DO MÊS ATUAL (${currentYM}) ===`)
    for (const d of currentDespesas.slice(0, 40)) {
      const parts = [d.description || 'sem-desc', `R$ ${Number(d.amount || 0).toFixed(2)}`]
      if (d.paymentMethod) parts.push(d.paymentMethod)
      if (d.installmentTotal > 1) parts.push(`parc ${d.installmentCurrent}/${d.installmentTotal}`)
      if (d.recurring) parts.push('fixo')
      if (d.category) parts.push(`cat:${d.category}`)
      if (d.attributedTo) parts.push(`atr:${d.attributedTo}`)
      parts.push(d.paid ? 'pago' : 'pendente')
      lines.push(`- ${parts.join(' · ')}`)
    }
    if (currentDespesas.length > 40) lines.push(`(... +${currentDespesas.length - 40} omitidos)`)
  }

  return lines.join('\n')
}

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

  const system = `Você é um assistente financeiro pessoal pra WhatsApp. Responda em PT-BR de forma CURTA, ÚTIL e levemente amigável.

ESTILO:
- Direto ao ponto, mas sem ser robótico. Pode usar uma palavra leve tipo "boa", "ótimo", "tranquilo" se fizer sentido.
- Pra perguntas com 1 valor: 1 frase com *negrito* no número principal.
- Pra perguntas com VÁRIOS itens (várias pessoas, vários orçamentos): UMA LINHA POR ITEM. Use listas com "•" ou "-".
- Pra cumprimento/conversa casual: 1 frase amigável, e oferece ajuda.
- R$ formatado: "R$ 1.234,56". Negrito só no valor principal de cada item.
- Match de nomes (parcelas, pessoas, categorias): CASE-INSENSITIVE, tolerante a acentos.

DADOS — USE EXATAMENTE os números pré-calculados (não recalcule):
- PARCELAS: a seção PARCELADOS tem "FALTAM PAGAR N". USE esse número.
- A RECEBER de pessoa: pergunta com "esse mês" → linha "Esse mês". Pergunta sem qualificar tempo ou com "no total" → linha "Total histórico".
- ORÇAMENTOS: a seção ORÇAMENTOS DO MÊS ATUAL tem "SOBRA R$ X" pronto.
- COFRES: saldo e % vêm prontos da seção COFRES.

Se a pessoa/parcelado/categoria perguntado não aparece nas seções, diga honestamente que não encontrou.
Se a pergunta não for sobre finanças: respondendo amigável e pede pra reformular.

EXEMPLOS:

P: "oi"
R: "Oi! Posso te ajudar com seus gastos, receitas, orçamentos ou cofres. Manda a pergunta. 👋"

P: "tudo bem?"
R: "Tudo certo! Quer ver como tá seu mês ou registrar algo?"

P: "quanto sobra do orçamento de mercado?"
R: "Sobram *R$ 200,00* do orçamento de Mercado esse mês."

P: "quantas parcelas faltam do fifa?"
R: "Falta *1 parcela* do FIFA (4/4 em junho)."

P: "quanto o consultório juju tem que me pagar esse mês?"
R: "Consultório Juju tem *R$ 1.123,25* pendentes esse mês."

P: "quanto o consultório juju, o rico e o benê me devem esse mês?"
R: "Esse mês você tem a receber:
• Consultório Juju: *R$ 1.123,25*
• Rico: *R$ 3.470,37*
• Benê: *R$ 845,00*"

P: "quanto a clínica me deve no total?"
R: "Consultório Juju acumula *R$ 5.000,00* pendentes no histórico."

P: "como tá meus orçamentos?"
R: "Seus orçamentos esse mês:
• Mercado: sobra *R$ 200,00*
• Saídas: sobra *R$ 50,00*
• Lazer: estourou em *R$ 80,00*"

P: "como tá o cofre do casamento?"
R: "Cofre Casamento: *R$ 8.400,00* — 28% da meta de R$ 30.000."

DADOS DO USUÁRIO:

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
        system,
        messages: [{ role: 'user', content: question }],
      }),
    })
    const data = await r.json()
    if (!r.ok) {
      console.error('Claude query error:', JSON.stringify(data))
      return null
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
