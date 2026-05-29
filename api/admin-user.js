// GET    /api/admin/user?id=<userId>           — busca detalhe completo
// POST   /api/admin/user?id=<userId>&action=update
//        Body: { name?, email?, cpf?, phone?, planId? }
// POST   /api/admin/user?id=<userId>&action=cancel-subscription
//        Cancela no Asaas + marca como cancelled no profile
// POST   /api/admin/user?id=<userId>&action=grant-access
//        Body: { days: number }
//        Força subscription_status='active' por N dias (cortesia)
// POST   /api/admin/user?id=<userId>&action=mark-verified
//        Força account_verified_at = NOW()
// POST   /api/admin/user?id=<userId>&action=delete
//        Exclui usuário do Auth + profile (LGPD)

import { admin, assertAdmin, asaasFetch } from './_admin.js'

export default async function handler(req, res) {
  const auth = await assertAdmin(req, res)
  if (!auth) return

  const userId = String(req.query.id || '').trim()
  if (!userId) return res.status(400).json({ error: 'id obrigatório' })

  if (req.method === 'GET') return getDetail(res, userId)
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const action = String(req.query.action || '').trim()

  try {
    switch (action) {
      case 'update': return await actionUpdate(req, res, userId)
      case 'cancel-subscription': return await actionCancel(res, userId)
      case 'grant-access': return await actionGrant(req, res, userId)
      case 'mark-verified': return await actionMarkVerified(res, userId)
      case 'delete': return await actionDelete(res, userId)
      default: return res.status(400).json({ error: 'Action desconhecida' })
    }
  } catch (err) {
    console.error(`admin-user action=${action} error:`, err)
    return res.status(500).json({ error: err.message || 'Erro interno' })
  }
}

// ---------- GET: detalhe completo ----------
async function getDetail(res, userId) {
  const a = admin()

  // Profile
  const { data: profile, error: profErr } = await a
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (profErr) throw profErr
  if (!profile) return res.status(404).json({ error: 'Usuário não encontrado' })

  // Auth user (admin API só permite get by id)
  const { data: authData } = await a.auth.admin.getUserById(userId)
  const authUser = authData?.user

  // Asaas: customer + subscription + payments
  let asaasCustomer = null, asaasSubscription = null, asaasPayments = []
  if (profile.asaas_customer_id) {
    try {
      asaasCustomer = await asaasFetch(`/customers/${profile.asaas_customer_id}`)
    } catch (e) { console.warn('asaas customer fetch:', e.message) }
  }
  if (profile.asaas_subscription_id) {
    try {
      asaasSubscription = await asaasFetch(`/subscriptions/${profile.asaas_subscription_id}`)
    } catch (e) { console.warn('asaas sub fetch:', e.message) }
  }
  if (profile.asaas_customer_id) {
    try {
      const r = await asaasFetch(`/payments?customer=${profile.asaas_customer_id}&limit=20`)
      asaasPayments = r?.data || []
    } catch (e) { console.warn('asaas payments fetch:', e.message) }
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
    asaas: {
      customer: asaasCustomer,
      subscription: asaasSubscription,
      payments: asaasPayments,
    },
  })
}

// ---------- POST update ----------
async function actionUpdate(req, res, userId) {
  const a = admin()
  const body = req.body || {}

  // Atualiza auth.users (email + metadata)
  if (body.email || body.name) {
    const updates = {}
    if (body.email) updates.email = body.email
    if (body.name) updates.user_metadata = { name: body.name }
    const { error } = await a.auth.admin.updateUserById(userId, updates)
    if (error) throw error
  }

  // Atualiza user_profiles
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

// ---------- POST cancel-subscription ----------
async function actionCancel(res, userId) {
  const a = admin()
  const { data: profile } = await a
    .from('user_profiles')
    .select('asaas_subscription_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (profile?.asaas_subscription_id) {
    try {
      await asaasFetch(`/subscriptions/${profile.asaas_subscription_id}`, { method: 'DELETE' })
    } catch (e) {
      console.warn('Asaas cancel error (continuando):', e.message)
      // Não bloqueia — pode já ter sido cancelado no Asaas
    }
  }

  await a.from('user_profiles').update({
    subscription_status: 'cancelled',
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)

  return res.status(200).json({ ok: true })
}

// ---------- POST grant-access ----------
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

// ---------- POST mark-verified ----------
async function actionMarkVerified(res, userId) {
  const a = admin()
  await a.from('user_profiles').update({
    account_verified_at: new Date().toISOString(),
    verification_method: 'admin',
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)
  return res.status(200).json({ ok: true })
}

// ---------- POST delete ----------
async function actionDelete(res, userId) {
  const a = admin()
  // Delete auth.users → cascata em user_profiles via FK
  const { error } = await a.auth.admin.deleteUser(userId)
  if (error) throw error
  return res.status(200).json({ ok: true })
}
