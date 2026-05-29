// GET /api/admin/stats
// Retorna métricas agregadas do negócio:
// - totalUsers, activeSubs, trialUsers, expiredUsers, cancelledUsers
// - mrr, arr, monthlyRevenue, predictedNextMonth
// - newSubsThisMonth, cancelsThisMonth, churnPct
// - planMix: { monthly: count, annual: count }
// - arpu (average revenue per user)
// - subscribersOverTime: últimos 6 meses (gráfico)

import { admin, assertAdmin, startOfMonthISO, startOfLastMonthISO } from './_admin.js'

// Preços hardcoded — mesmos do PLANS no _asaas.js
const PRICES = {
  monthly: 19.00,
  annual: 167.00,
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await assertAdmin(req, res)
  if (!auth) return

  try {
    const a = admin()
    const startMonth = startOfMonthISO()
    const startLastMonth = startOfLastMonthISO()

    // 1) Todos os profiles (limit alto pra cobrir crescimento inicial)
    const { data: profiles, error } = await a
      .from('user_profiles')
      .select('user_id, subscription_status, subscription_until, asaas_subscription_id, created_at, updated_at, plan_id, asaas_customer_id')
      .order('created_at', { ascending: false })
      .limit(10000)
    if (error) throw error

    const list = profiles || []

    // 2) Auth users pra cruzar created_at (criação real)
    // Pegamos via Admin API
    const { data: authUsersData } = await a.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const authUsers = authUsersData?.users || []
    const authById = Object.fromEntries(authUsers.map((u) => [u.id, u]))

    // 3) Classifica por status
    const totalUsers = list.length
    const active = list.filter((p) => p.subscription_status === 'active')
    const trial = list.filter((p) => p.subscription_status === 'trial')
    const cancelled = list.filter((p) => p.subscription_status === 'cancelled')
    const expired = list.filter((p) => p.subscription_status === 'expired')
    const overdue = list.filter((p) => p.subscription_status === 'overdue')

    // 4) Mix de planos (monthly/annual)
    let monthlyCount = 0, annualCount = 0
    active.forEach((p) => {
      const planId = (p.plan_id || '').toLowerCase()
      if (planId.includes('annual')) annualCount++
      else monthlyCount++
    })

    // 5) MRR — receita recorrente mensal
    // Anual conta como (167 / 12) = ~13,92/mês
    const mrr = (monthlyCount * PRICES.monthly) + (annualCount * (PRICES.annual / 12))
    const arr = mrr * 12

    // 6) ARPU
    const arpu = active.length > 0 ? (mrr / active.length) : 0

    // 7) Novos assinantes do mês — usa auth.users.created_at
    const newThisMonth = list.filter((p) => {
      const authUser = authById[p.user_id]
      const createdAt = authUser?.created_at || p.created_at
      return createdAt && createdAt >= startMonth
    }).length

    const newLastMonth = list.filter((p) => {
      const authUser = authById[p.user_id]
      const createdAt = authUser?.created_at || p.created_at
      return createdAt && createdAt >= startLastMonth && createdAt < startMonth
    }).length

    // 8) Cancelamentos do mês — usa updated_at do profile (proxy)
    const cancelsThisMonth = list.filter((p) =>
      (p.subscription_status === 'cancelled' || p.subscription_status === 'expired')
      && p.updated_at >= startMonth
    ).length

    // 9) Churn % — cancelados ÷ (ativos no início do mês)
    // Aproximação: ativos no início = ativos atuais + cancelados do mês
    const activeAtStart = active.length + cancelsThisMonth
    const churnPct = activeAtStart > 0 ? (cancelsThisMonth / activeAtStart) * 100 : 0

    // 10) Receita do mês — soma de pagamentos confirmados.
    // Buscamos no Asaas em batch.
    // OBS: pode ser lento se tiver muitos. Pra MVP, ok.
    let monthlyRevenue = 0
    try {
      // Lista pagamentos confirmados no mês via Asaas
      // Filtro: paymentDate >= primeiro dia do mês
      const dateFrom = startMonth.slice(0, 10)
      const today = new Date().toISOString().slice(0, 10)
      const { asaasFetch } = await import('./_admin.js')
      const paymentsRes = await asaasFetch(
        `/payments?status=RECEIVED&paymentDate%5Bge%5D=${dateFrom}&paymentDate%5Ble%5D=${today}&limit=100`
      ).catch(() => null)
      if (paymentsRes?.data) {
        monthlyRevenue = paymentsRes.data.reduce((sum, p) => sum + (Number(p.netValue || p.value) || 0), 0)
      }
    } catch (e) {
      console.warn('monthlyRevenue fetch failed:', e.message)
    }

    // 11) Previsão próximo mês
    // Soma das assinaturas ativas que vão renovar (subscription_until > hoje e < +60 dias)
    // Aproximação: MRR atual (assumindo retenção 100%)
    const predictedNextMonth = mrr

    // 12) Gráfico — assinantes ativos nos últimos 6 meses (aproximação)
    // Pra cada mês, conta quantos profiles foram criados ATÉ aquele mês e estão active.
    // Pra simplificar, vamos contar novos por mês (mais útil que cumulativo).
    const subscribersOverTime = []
    for (let i = 5; i >= 0; i--) {
      const now = new Date()
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString()
      const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1)).toISOString()
      const monthLabel = new Date(monthStart).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      const news = list.filter((p) => {
        const authUser = authById[p.user_id]
        const createdAt = authUser?.created_at || p.created_at
        return createdAt && createdAt >= monthStart && createdAt < monthEnd
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
      mrr,
      arr,
      arpu,
      monthlyRevenue,
      predictedNextMonth,
      newThisMonth,
      newLastMonth,
      cancelsThisMonth,
      churnPct,
      planMix: { monthly: monthlyCount, annual: annualCount },
      subscribersOverTime,
    })
  } catch (err) {
    console.error('admin-stats error:', err)
    return res.status(500).json({ error: err.message || 'Erro interno' })
  }
}
