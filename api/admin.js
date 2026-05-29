// Endpoint admin consolidado — roteia por query param `resource`.
// Vercel Hobby plan limita a 12 serverless functions, então juntamos
// admin-stats, admin-users e admin-user em um único endpoint.
//
// Roteamento:
//   GET  /api/admin?resource=stats                              → métricas agregadas
//   GET  /api/admin?resource=users&search=&status=&limit=       → lista de usuários
//   GET  /api/admin?resource=user&id=<userId>                   → detalhe de usuário
//   POST /api/admin?resource=user&id=<userId>&action=<action>   → ação no usuário
//     actions: update | cancel-subscription | grant-access | mark-verified | delete
//
// Auth: Bearer <Supabase JWT> + email em ADMIN_EMAILS env var

import { admin, assertAdmin, asaasFetch, startOfMonthISO, startOfLastMonthISO } from './_admin.js'
import { sendEmail, subscriptionCancelledEmail } from './_email.js'
import { sendWhatsApp } from './_whatsapp.js'

const PRICES = { monthly: 19.00, annual: 167.00 }

export default async function handler(req, res) {
  const auth = await assertAdmin(req, res)
  if (!auth) return

  const resource = String(req.query.resource || '').trim()

  try {
    if (resource === 'stats') return await handleStats(req, res)
    if (resource === 'users') return await handleUsers(req, res)
    if (resource === 'user') return await handleUser(req, res)
    return res.status(400).json({ error: 'resource inválido (use stats, users ou user)' })
  } catch (err) {
    console.error(`admin resource=${resource} error:`, err)
    return res.status(500).json({ error: err.message || 'Erro interno' })
  }
}

// ========== STATS ==========
async function handleStats(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const a = admin()
  const startMonth = startOfMonthISO()
  const startLastMonth = startOfLastMonthISO()

  // NOTA: user_profiles não tem coluna created_at — pegamos do auth.users (authById)
  const { data: profiles, error } = await a
    .from('user_profiles')
    .select('user_id, subscription_status, subscription_until, asaas_subscription_id, updated_at, plan_id, asaas_customer_id')
    .order('updated_at', { ascending: false })
    .limit(10000)
  if (error) throw error
  const list = profiles || []

  const { data: authUsersData } = await a.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const authUsers = authUsersData?.users || []
  const authById = Object.fromEntries(authUsers.map((u) => [u.id, u]))

  const totalUsers = list.length
  const active = list.filter((p) => p.subscription_status === 'active')
  const trial = list.filter((p) => p.subscription_status === 'trial')
  const cancelled = list.filter((p) => p.subscription_status === 'cancelled')
  const expired = list.filter((p) => p.subscription_status === 'expired')
  const overdue = list.filter((p) => p.subscription_status === 'overdue')

  let monthlyCount = 0, annualCount = 0
  active.forEach((p) => {
    const planId = (p.plan_id || '').toLowerCase()
    if (planId.includes('annual')) annualCount++
    else monthlyCount++
  })

  const mrr = (monthlyCount * PRICES.monthly) + (annualCount * (PRICES.annual / 12))
  const arr = mrr * 12
  const arpu = active.length > 0 ? (mrr / active.length) : 0

  const newThisMonth = list.filter((p) => {
    const u = authById[p.user_id]
    const createdAt = u?.created_at
    return createdAt && createdAt >= startMonth
  }).length

  const newLastMonth = list.filter((p) => {
    const u = authById[p.user_id]
    const createdAt = u?.created_at
    return createdAt && createdAt >= startLastMonth && createdAt < startMonth
  }).length

  const cancelsThisMonth = list.filter((p) =>
    (p.subscription_status === 'cancelled' || p.subscription_status === 'expired')
    && p.updated_at >= startMonth
  ).length

  const activeAtStart = active.length + cancelsThisMonth
  const churnPct = activeAtStart > 0 ? (cancelsThisMonth / activeAtStart) * 100 : 0

  // Busca pagamentos confirmados dos últimos 12 meses (1 request, agrupa local).
  // Recibos do Asaas têm paymentDate (quando foi recebido) — usamos isso.
  let monthlyRevenue = 0
  const monthlyRevenueHistory = []  // [{ month: 'jan/26', revenue: N }, ...]
  try {
    // 12 meses atrás
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
    twelveMonthsAgo.setDate(1)
    const dateFrom = twelveMonthsAgo.toISOString().slice(0, 10)
    const today = new Date().toISOString().slice(0, 10)

    // Asaas paginação: paga até 100 por request; pegamos 500 (suficiente pra produto novo)
    const paymentsRes = await asaasFetch(
      `/payments?status%5B%5D=RECEIVED&status%5B%5D=CONFIRMED&paymentDate%5Bge%5D=${dateFrom}&paymentDate%5Ble%5D=${today}&limit=500`
    ).catch(() => null)

    const allPayments = paymentsRes?.data || []

    // Agrupa por YYYY-MM
    const byMonth = {}
    for (const p of allPayments) {
      const pd = p.paymentDate || p.dueDate
      if (!pd) continue
      const ym = pd.slice(0, 7)  // YYYY-MM
      byMonth[ym] = (byMonth[ym] || 0) + (Number(p.netValue || p.value) || 0)
    }

    // Monta array dos últimos 12 meses, mesmo os zerados
    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      monthlyRevenueHistory.push({ month: label, ym, revenue: byMonth[ym] || 0 })
    }

    // Receita do mês atual = último da lista
    monthlyRevenue = monthlyRevenueHistory[monthlyRevenueHistory.length - 1]?.revenue || 0
  } catch (e) {
    console.warn('monthlyRevenue history:', e.message)
  }

  const predictedNextMonth = mrr

  const subscribersOverTime = []
  for (let i = 5; i >= 0; i--) {
    const now = new Date()
    const ms = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString()
    const me = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1)).toISOString()
    const monthLabel = new Date(ms).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    const news = list.filter((p) => {
      const u = authById[p.user_id]
      const createdAt = u?.created_at
      return createdAt && createdAt >= ms && createdAt < me
    }).length
    subscribersOverTime.push({ month: monthLabel, news })
  }

  return res.status(200).json({
    totalUsers,
    activeSubs: active.length,
    trialUsers: trial.length,
    cancelledUsers: cancelled.length,
    expiredUsers: expired.length,
    overdueUsers: overdue.length,
    mrr, arr, arpu, monthlyRevenue, predictedNextMonth,
    newThisMonth, newLastMonth, cancelsThisMonth, churnPct,
    planMix: { monthly: monthlyCount, annual: annualCount },
    subscribersOverTime,
    monthlyRevenueHistory,  // novo: receita mensal dos últimos 12 meses
  })
}

// ========== USERS LIST ==========
async function handleUsers(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const a = admin()
  const search = String(req.query.search || '').trim().toLowerCase()
  const status = String(req.query.status || '').trim()
  const limit = Math.min(parseInt(req.query.limit) || 50, 500)
  const offset = parseInt(req.query.offset) || 0

  let query = a.from('user_profiles')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false })
  if (status) query = query.eq('subscription_status', status)

  const { data: profiles, count, error } = await query.range(offset, offset + limit - 1)
  if (error) throw error

  const ids = (profiles || []).map((p) => p.user_id)
  if (ids.length === 0) return res.status(200).json({ users: [], total: count || 0 })

  const { data: authData } = await a.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const byId = Object.fromEntries((authData?.users || []).map((u) => [u.id, u]))

  let users = (profiles || []).map((p) => {
    const u = byId[p.user_id]
    return {
      userId: p.user_id,
      email: u?.email || '',
      name: u?.user_metadata?.name || '',
      cpf: p.cpf || '',
      phone: p.whatsapp_phone || '',
      subscriptionStatus: p.subscription_status || 'expired',
      subscriptionUntil: p.subscription_until,
      planId: p.plan_id || null,
      asaasSubscriptionId: p.asaas_subscription_id || null,
      asaasCustomerId: p.asaas_customer_id || null,
      accountVerifiedAt: p.account_verified_at,
      createdAt: u?.created_at,
      lastSignInAt: u?.last_sign_in_at || null,
    }
  })

  if (search) {
    users = users.filter((u) => `${u.email} ${u.name} ${u.cpf} ${u.phone}`.toLowerCase().includes(search))
  }

  return res.status(200).json({ users, total: count || users.length, limit, offset })
}

// ========== USER DETAIL + ACTIONS ==========
async function handleUser(req, res) {
  const userId = String(req.query.id || '').trim()
  if (!userId) return res.status(400).json({ error: 'id obrigatório' })

  if (req.method === 'GET') return getUserDetail(res, userId)
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const action = String(req.query.action || '').trim()
  switch (action) {
    case 'update': return await actionUpdate(req, res, userId)
    case 'cancel-subscription': return await actionCancel(res, userId)
    case 'grant-access': return await actionGrant(req, res, userId)
    case 'mark-verified': return await actionMarkVerified(res, userId)
    case 'delete': return await actionDelete(res, userId)
    case 'notify-email': return await actionNotifyEmail(res, userId)
    case 'notify-whatsapp': return await actionNotifyWhatsApp(res, userId)
    default: return res.status(400).json({ error: 'Action desconhecida' })
  }
}

async function getUserDetail(res, userId) {
  const a = admin()
  const { data: profile, error } = await a.from('user_profiles').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!profile) return res.status(404).json({ error: 'Usuário não encontrado' })

  const { data: authData } = await a.auth.admin.getUserById(userId)
  const authUser = authData?.user

  let asaasCustomer = null, asaasSubscription = null, asaasPayments = []
  if (profile.asaas_customer_id) {
    try { asaasCustomer = await asaasFetch(`/customers/${profile.asaas_customer_id}`) } catch (e) {}
  }
  if (profile.asaas_subscription_id) {
    try { asaasSubscription = await asaasFetch(`/subscriptions/${profile.asaas_subscription_id}`) } catch (e) {}
  }
  if (profile.asaas_customer_id) {
    try {
      const r = await asaasFetch(`/payments?customer=${profile.asaas_customer_id}&limit=20`)
      asaasPayments = r?.data || []
    } catch (e) {}
  }

  return res.status(200).json({
    profile,
    authUser: authUser ? {
      id: authUser.id,
      email: authUser.email,
      emailConfirmedAt: authUser.email_confirmed_at,
      lastSignInAt: authUser.last_sign_in_at,
      createdAt: authUser.created_at,
      userMetadata: authUser.user_metadata,
    } : null,
    asaas: { customer: asaasCustomer, subscription: asaasSubscription, payments: asaasPayments },
  })
}

async function actionUpdate(req, res, userId) {
  const a = admin()
  const body = req.body || {}
  if (body.email || body.name) {
    const updates = {}
    if (body.email) updates.email = body.email
    if (body.name) updates.user_metadata = { name: body.name }
    const { error } = await a.auth.admin.updateUserById(userId, updates)
    if (error) throw error
  }
  const profileUpdates = {}
  if (body.cpf !== undefined) profileUpdates.cpf = String(body.cpf).replace(/\D/g, '')
  if (body.phone !== undefined) profileUpdates.whatsapp_phone = String(body.phone).replace(/\D/g, '')
  if (body.planId !== undefined) profileUpdates.plan_id = body.planId
  if (Object.keys(profileUpdates).length > 0) {
    profileUpdates.updated_at = new Date().toISOString()
    const { error } = await a.from('user_profiles').update(profileUpdates).eq('user_id', userId)
    if (error) throw error
  }
  return res.status(200).json({ ok: true })
}

async function actionCancel(res, userId) {
  const a = admin()
  const { data: profile } = await a.from('user_profiles').select('asaas_subscription_id').eq('user_id', userId).maybeSingle()
  if (profile?.asaas_subscription_id) {
    try { await asaasFetch(`/subscriptions/${profile.asaas_subscription_id}`, { method: 'DELETE' }) }
    catch (e) { console.warn('Asaas cancel:', e.message) }
  }
  await a.from('user_profiles').update({
    subscription_status: 'cancelled',
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)
  return res.status(200).json({ ok: true })
}

async function actionGrant(req, res, userId) {
  const a = admin()
  const days = Math.max(1, Math.min(365, parseInt(req.body?.days) || 30))
  const until = new Date(Date.now() + days * 86400000).toISOString()
  await a.from('user_profiles').update({
    subscription_status: 'active',
    subscription_until: until,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)
  return res.status(200).json({ ok: true, until })
}

async function actionMarkVerified(res, userId) {
  const a = admin()
  await a.from('user_profiles').update({
    account_verified_at: new Date().toISOString(),
    verification_method: 'admin',
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)
  return res.status(200).json({ ok: true })
}

async function actionDelete(res, userId) {
  const a = admin()
  const { error } = await a.auth.admin.deleteUser(userId)
  if (error) throw error
  return res.status(200).json({ ok: true })
}

// ---------- POST notify-email — manda email de cancelamento ----------
async function actionNotifyEmail(res, userId) {
  const a = admin()
  const { data: profile } = await a.from('user_profiles')
    .select('subscription_until')
    .eq('user_id', userId)
    .maybeSingle()
  const { data: authData } = await a.auth.admin.getUserById(userId)
  const u = authData?.user
  if (!u?.email) {
    return res.status(400).json({ error: 'Usuário sem email cadastrado' })
  }
  const name = u.user_metadata?.name || u.email.split('@')[0]
  const validUntil = formatDateBR(profile?.subscription_until)

  const { subject, html, text } = subscriptionCancelledEmail({ name, validUntil })
  const ok = await sendEmail({ to: u.email, subject, html, text })
  if (!ok) return res.status(502).json({ error: 'Falha ao enviar email — confira logs' })
  return res.status(200).json({ ok: true, to: u.email })
}

// ---------- POST notify-whatsapp — manda mensagem de cancelamento ----------
async function actionNotifyWhatsApp(res, userId) {
  const a = admin()
  const { data: profile } = await a.from('user_profiles')
    .select('subscription_until, whatsapp_phone')
    .eq('user_id', userId)
    .maybeSingle()
  if (!profile?.whatsapp_phone) {
    return res.status(400).json({ error: 'Usuário sem WhatsApp cadastrado' })
  }
  const { data: authData } = await a.auth.admin.getUserById(userId)
  const u = authData?.user
  const name = u?.user_metadata?.name || ''
  const firstName = (name || '').split(' ')[0] || 'amigo(a)'
  const validUntil = formatDateBR(profile.subscription_until)

  const msg = [
    `🎩 Olá, ${firstName}.`,
    '',
    'Confirmando: sua assinatura do Domus foi cancelada.',
    '',
    validUntil
      ? `Você continua com acesso até *${validUntil}*. Depois dessa data, encerro discretamente sem cobrança adicional.`
      : 'O acesso será encerrado em breve.',
    '',
    'Caso mude de ideia, basta voltar em meudomus.com — seus dados permanecem preservados.',
    '',
    'Sentirei sua falta. Permaneço ao seu dispor caso precise.',
  ].join('\n')

  const ok = await sendWhatsApp(profile.whatsapp_phone, msg)
  if (!ok) {
    return res.status(502).json({
      error: 'Não consegui mandar pelo WhatsApp. Pode ser que o cliente não tenha aberto janela com Alfred nas últimas 24h.'
    })
  }
  return res.status(200).json({ ok: true, to: profile.whatsapp_phone })
}

function formatDateBR(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}
