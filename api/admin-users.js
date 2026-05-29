// GET /api/admin/users?search=&status=&limit=&offset=
// Lista usuários com busca/filtro/paginação.
// Cruza user_profiles + auth.users pra ter email + dados de signup.

import { admin, assertAdmin } from './_admin.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await assertAdmin(req, res)
  if (!auth) return

  try {
    const a = admin()
    const search = String(req.query.search || '').trim().toLowerCase()
    const status = String(req.query.status || '').trim()
    const limit = Math.min(parseInt(req.query.limit) || 50, 500)
    const offset = parseInt(req.query.offset) || 0

    // 1) Lista de profiles
    let query = a.from('user_profiles')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })

    if (status) {
      query = query.eq('subscription_status', status)
    }

    const { data: profiles, count, error } = await query.range(offset, offset + limit - 1)
    if (error) throw error

    // 2) Pega emails do auth.users
    const ids = (profiles || []).map((p) => p.user_id)
    if (ids.length === 0) {
      return res.status(200).json({ users: [], total: count || 0 })
    }

    // Admin API só lista paginada, não busca por ID em batch.
    // Pra MVP, listamos todos e fazemos lookup local.
    const { data: authData } = await a.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const authUsers = authData?.users || []
    const byId = Object.fromEntries(authUsers.map((u) => [u.id, u]))

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
        createdAt: u?.created_at || p.created_at,
        lastSignInAt: u?.last_sign_in_at || null,
      }
    })

    // 3) Filtro de busca (frontend faz local, mas se houver search aplica aqui também)
    if (search) {
      users = users.filter((u) => {
        const target = `${u.email} ${u.name} ${u.cpf} ${u.phone}`.toLowerCase()
        return target.includes(search)
      })
    }

    return res.status(200).json({
      users,
      total: count || users.length,
      limit,
      offset,
    })
  } catch (err) {
    console.error('admin-users error:', err)
    return res.status(500).json({ error: err.message || 'Erro interno' })
  }
}
