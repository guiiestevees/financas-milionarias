// GET  /api/subscription → retorna detalhes da assinatura + últimos pagamentos
// POST /api/subscription/cancel → cancela a assinatura no Asaas
// POST /api/subscription/change-payment → gera novo link pra trocar forma de pagamento
//
// Auth: precisa do JWT do Supabase no header Authorization: Bearer <token>

import { createClient } from '@supabase/supabase-js'
import { cancelSubscription, getSubscription, createSubscription, getFirstChargeUrl, PLANS } from './_asaas.js'
import { applyCors } from './_cors.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const ASAAS_API_KEY = process.env.ASAAS_API_KEY
const ASAAS_ENV = process.env.ASAAS_ENV || 'sandbox'
const ASAAS_BASE = ASAAS_ENV === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://api-sandbox.asaas.com/v3'

async function getUserFromToken(token) {
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })
  const { data, error } = await userClient.auth.getUser()
  if (error || !data?.user) return null
  return data.user
}

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function loadProfile(userId) {
  const { data } = await admin()
    .from('user_profiles')
    .select('subscription_status, subscription_until, subscription_plan, asaas_customer_id, asaas_subscription_id, trial_started_at, subscription_cancelled_at')
    .eq('user_id', userId)
    .maybeSingle()
  return data
}

// Busca últimos pagamentos da assinatura no Asaas
async function fetchPayments(subscriptionId, limit = 5) {
  if (!subscriptionId) return []
  const res = await fetch(`${ASAAS_BASE}/subscriptions/${subscriptionId}/payments?limit=${limit}`, {
    headers: { 'access_token': ASAAS_API_KEY },
  })
  if (!res.ok) return []
  const data = await res.json().catch(() => ({}))
  return Array.isArray(data?.data) ? data.data : []
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return
  try {
    // Auth
    const authHeader = req.headers.authorization || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) return res.status(401).json({ error: 'No token' })

    const user = await getUserFromToken(token)
    if (!user) return res.status(401).json({ error: 'Invalid token' })

    // Roteamento por método + ação no body (Vercel não suporta path params nativamente sem dynamic route)
    const action = req.body?.action || req.query?.action

    if (req.method === 'GET') {
      return handleGet(user, res)
    }

    if (req.method === 'POST') {
      if (action === 'cancel') return handleCancel(user, req, res)
      if (action === 'change-payment') return handleChangePayment(user, res)
      return res.status(400).json({ error: 'Action inválida (use: cancel, change-payment)' })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('subscription error:', err)
    return res.status(500).json({ error: err.message || 'Erro interno' })
  }
}

// ---------- GET: detalhes da assinatura ----------
async function handleGet(user, res) {
  const profile = await loadProfile(user.id)
  if (!profile) {
    return res.status(200).json({
      status: 'trial',
      plan: null,
      until: null,
      hasAsaasSubscription: false,
      payments: [],
      planDetails: null,
    })
  }

  const payments = profile.asaas_subscription_id
    ? await fetchPayments(profile.asaas_subscription_id, 5)
    : []

  // Mapeia payments pra um formato amigável pro frontend
  const paymentHistory = payments.map((p) => ({
    id: p.id,
    value: p.value,
    netValue: p.netValue,
    status: p.status,         // PENDING, RECEIVED, CONFIRMED, OVERDUE, REFUNDED
    billingType: p.billingType, // PIX, BOLETO, CREDIT_CARD, etc
    dueDate: p.dueDate,
    paymentDate: p.paymentDate || p.confirmedDate,
    invoiceUrl: p.invoiceUrl,
    description: p.description,
  }))

  return res.status(200).json({
    status: profile.subscription_status,
    plan: profile.subscription_plan,
    until: profile.subscription_until,
    trialStartedAt: profile.trial_started_at,
    hasAsaasSubscription: !!profile.asaas_subscription_id,
    asaasSubscriptionId: profile.asaas_subscription_id,
    planDetails: profile.subscription_plan ? PLANS[profile.subscription_plan] : null,
    payments: paymentHistory,
  })
}

// ---------- POST action=cancel ----------
// Aceita opcionalmente reason/feedback da pesquisa de saída.
const VALID_CANCEL_REASONS = ['price', 'usage', 'missing_feature', 'technical', 'other']

async function handleCancel(user, req, res) {
  const profile = await loadProfile(user.id)
  const now = new Date().toISOString()

  // Cancela no Asaas (se tiver assinatura lá)
  if (profile?.asaas_subscription_id) {
    try {
      await cancelSubscription(profile.asaas_subscription_id)
    } catch (err) {
      console.error('Asaas cancel error:', err)
      // Continua e marca como cancelado localmente — pode estar já cancelado lá
    }
  }

  // Update CRÍTICO — status do cancelamento (sempre roda)
  await admin().from('user_profiles').update({
    subscription_status: 'cancelled',
    subscription_cancelled_at: profile?.subscription_cancelled_at || now,
    updated_at: now,
  }).eq('user_id', user.id)

  // Pesquisa de saída — best-effort em update separado.
  // Se as colunas não existirem (migration não rodada), só loga.
  const rawReason = req.body?.reason
  const rawFeedback = req.body?.feedback
  const surveyFields = {}
  if (VALID_CANCEL_REASONS.includes(rawReason)) surveyFields.cancel_reason = rawReason
  if (typeof rawFeedback === 'string' && rawFeedback.trim()) {
    surveyFields.cancel_feedback = rawFeedback.trim().slice(0, 1000)
  }
  if (Object.keys(surveyFields).length > 0) {
    const { error: surveyErr } = await admin()
      .from('user_profiles')
      .update(surveyFields)
      .eq('user_id', user.id)
    if (surveyErr) console.warn('cancel survey não salvou (migration?):', surveyErr.message)
    else console.log(`📋 Cancel survey: user ${user.id} → ${rawReason}`)
  }

  return res.status(200).json({ ok: true, cancelled: true })
}

// ---------- POST action=change-payment ----------
// Gera um NOVO link de checkout pra cliente trocar forma de pagamento.
// Implementação simples: cria uma nova assinatura, cancela a antiga,
// usuário paga com forma nova, webhook ativa.
async function handleChangePayment(user, res) {
  const profile = await loadProfile(user.id)
  if (!profile?.asaas_customer_id) {
    return res.status(400).json({ error: 'Sem cliente cadastrado no Asaas. Faça uma nova assinatura.' })
  }

  const planId = profile.subscription_plan || 'monthly'

  // Cancela a antiga (se existir)
  if (profile.asaas_subscription_id) {
    try {
      await cancelSubscription(profile.asaas_subscription_id)
    } catch (err) {
      console.warn('Antiga já cancelada ou erro:', err.message)
    }
  }

  // Cria nova
  const subscription = await createSubscription({
    customerId: profile.asaas_customer_id,
    planId,
    billingType: 'UNDEFINED',
    trialDays: 0,  // sem trial nesse caso, já é renovação
  })

  const checkoutUrl = await getFirstChargeUrl(subscription.id)
  if (!checkoutUrl) {
    return res.status(500).json({ error: 'Falha ao gerar novo link' })
  }

  // Salva novo subscription_id
  await admin().from('user_profiles').update({
    asaas_subscription_id: subscription.id,
    updated_at: new Date().toISOString(),
  }).eq('user_id', user.id)

  return res.status(200).json({ ok: true, checkoutUrl })
}
