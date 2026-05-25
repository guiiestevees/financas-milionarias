// WhatsApp Cloud API webhook — Fase 2
// Recebe mensagens, identifica o usuário pelo número de WhatsApp,
// usa Claude (Anthropic) pra extrair o gasto e salva no Supabase.

import { createClient } from '@supabase/supabase-js'

// ---------- Env ----------
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const GRAPH_VERSION = 'v21.0'
const CLAUDE_MODEL = 'claude-haiku-4-5'

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

    // Por enquanto só texto. Áudio/imagem vêm nas próximas fases.
    if (type !== 'text') {
      await sendWhatsApp(from, '🤖 Por enquanto eu só entendo texto. Áudio e foto da nota chegam em breve.')
      return res.status(200).json({ ok: true })
    }

    const text = (message.text?.body || '').trim()
    if (!text) return res.status(200).json({ ok: true })

    console.log(`📲 ${from}: ${text}`)

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

    // 4) Trata os possíveis intents
    if (extraction.intent !== 'register_expense') {
      await sendWhatsApp(from, `🤖 ${extraction.reply || 'Por enquanto eu só registro gastos. Tenta algo tipo "almoço 25 pix" ou "calça 200 nubank parcelado 4x".'}`)
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
    const despesa = buildDespesa(extraction, date)

    const pending = {
      id: 'pend_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36).slice(-4),
      type: 'expense',
      source: 'whatsapp',
      createdAt: Date.now(),
      ym,
      raw: text,
      data: despesa,
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

  const today = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const todayISO = new Date().toISOString().slice(0, 10)

  const system = `Você é um assistente que extrai informações de despesas financeiras a partir de mensagens em português brasileiro.

Hoje é ${today} (${todayISO}).

Métodos de pagamento disponíveis: ${ctx.paymentMethods.length ? ctx.paymentMethods.join(', ') : 'Pix, Débito'}
Cartões cadastrados: ${ctx.cardNames.length ? ctx.cardNames.join(', ') : 'nenhum'}
Categorias cadastradas: ${ctx.categories.length ? ctx.categories.join(', ') : 'nenhuma'}
Atribuídos cadastrados: ${ctx.attributedTo.length ? ctx.attributedTo.join(', ') : 'nenhum'}
Cofres cadastrados: ${ctx.cofreNames.length ? ctx.cofreNames.join(', ') : 'nenhum'}

Sua tarefa: dada uma mensagem do usuário, retorne APENAS um JSON válido (sem markdown, sem explicações fora do JSON) com esta estrutura:

{
  "intent": "register_expense" | "other",
  "reply": "string curta em PT-BR caso intent seja 'other' (saudação, dúvida, etc)",
  "description": "descrição curta do gasto (ex: 'Calça', 'Almoço restaurante X')",
  "amount": número (valor em reais, decimal),
  "paymentMethod": "exatamente como na lista acima, ou null se não mencionado",
  "category": "exatamente como na lista acima, ou null",
  "attributedTo": "exatamente como na lista acima, ou null",
  "date": "YYYY-MM-DD ou null se for hoje",
  "installmentCurrent": número (1 se à vista),
  "installmentTotal": número (1 se à vista),
  "recurring": boolean (true se for fixo mensal),
  "cofreName": "nome do cofre se mencionado, ou null"
}

REGRAS:
- Se o usuário só cumprimentou, fez pergunta ou pediu algo que não é registrar gasto: intent="other" e use "reply" pra responder.
- Se mencionou um valor mas nada mais: intent="register_expense", description="Gasto", e preenche o que conseguir.
- paymentMethod, category, attributedTo: SÓ retorne se o usuário mencionou explicitamente E o valor existe na lista. Não invente.
- Se a mensagem diz "parcelado em 4x" ou "4/6": preenche installmentTotal e installmentCurrent corretamente.
- Se diz "todo mês" ou "fixo" ou "assinatura": recurring=true.
- Se diz "ontem", "hoje", "anteontem", "dia 15": calcule a data ISO. Hoje é ${todayISO}.
- Valor: aceite formatos como "200", "R$200", "200 reais", "200,50". Sempre como número (sem aspas).

Exemplos:
- "calça 200 nubank" → {"intent":"register_expense","description":"Calça","amount":200,"paymentMethod":"Nubank","category":null,"attributedTo":null,"date":null,"installmentCurrent":1,"installmentTotal":1,"recurring":false,"cofreName":null}
- "almoço de 35 reais hoje no pix" → {"intent":"register_expense","description":"Almoço","amount":35,"paymentMethod":"Pix","category":null,"attributedTo":null,"date":null,"installmentCurrent":1,"installmentTotal":1,"recurring":false,"cofreName":null}
- "oi" → {"intent":"other","reply":"Oi! Manda um gasto pra eu registrar — ex: 'almoço 25 pix'."}`

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
  const valor = Number(d.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const lines = [`💸 Gasto entendido: *${d.description}* — ${valor}`]
  const meta = []
  if (d.paymentMethod) meta.push(d.paymentMethod)
  if (d.installmentTotal > 1) meta.push(`parcela ${d.installmentCurrent}/${d.installmentTotal}`)
  if (d.recurring) meta.push('fixo mensal')
  if (d.category) meta.push(d.category)
  if (d.attributedTo) meta.push(d.attributedTo)
  if (meta.length) lines.push(meta.join(' · '))
  lines.push('')
  lines.push('👀 Abre o app pra *confirmar*, *editar* ou *descartar*.')
  return lines.join('\n')
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
