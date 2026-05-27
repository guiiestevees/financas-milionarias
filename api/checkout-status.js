// GET /api/checkout-status?paymentId=xxx
// Auth: Bearer <supabase JWT>
//
// Retorna status atual do pagamento — usado pra polling do PIX.
// BÔNUS: quando detecta pagamento confirmado, JÁ atualiza o profile do
// usuário pra subscription_status='active' (defensivo contra atraso do webhook).
//
// Response: { status, isPaid, isPending, isFailed, paidAt? }

import { createClient } from '@supabase/supabase-js'
import { getPayment, nextExpirationDate, PLANS } from './_asaas.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (!token) return res.status(401).json({ error: 'No token' })

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return res.status(401).json({ error: 'Invalid token' })

    const paymentId = req.query.paymentId
    if (!paymentId) return res.status(400).json({ error: 'paymentId obrigatório' })

    const payment = await getPayment(paymentId)
    const status = payment?.status || 'UNKNOWN'

    const isPaid = ['RECEIVED', 'CONFIRMED'].includes(status)
    const isPending = ['PENDING'].includes(status)
    const isFailed = ['REFUNDED', 'OVERDUE', 'DELETED'].includes(status)

    // ============================================================
    // 🚀 Atualização defensiva: quando detectamos pagamento confirmado,
    // já atualizamos o profile (não esperamos só o webhook do Asaas).
    // Idempotência via last_payment_id evita double-update se webhook
    // chegar depois.
    // ============================================================
    if (isPaid) {
      try {
        const a = admin()
        const { data: profile } = await a
          .from('user_profiles')
          .select('subscription_status, last_payment_id, asaas_customer_id, asaas_subscription_id')
          .eq('user_id', user.id)
          .maybeSingle()

        // Só processa se ainda não foi processado e o pagamento pertence a este user
        if (profile
          && profile.last_payment_id !== paymentId
          && profile.asaas_customer_id === payment.customer) {
          const value = Number(payment.value) || 0
          const planId = value >= 50 ? 'annual' : 'monthly'
          const until = nextExpirationDate(planId)

          await a.from('user_profiles').update({
            subscription_status: 'active',
            subscription_until: until,
            subscription_plan: planId,
            asaas_subscription_id: payment.subscription || profile.asaas_subscription_id,
            last_payment_id: paymentId,
            updated_at: new Date().toISOString(),
          }).eq('user_id', user.id)

          console.log(`✅ Polling antecipou ativação: user ${user.id} → ${planId}`)
        }
      } catch (err) {
        // Se falhar, não bloqueia a resposta — webhook eventualmente atualiza
        console.warn('checkout-status: erro ao atualizar profile (webhook vai pegar):', err.message)
      }
    }

    return res.status(200).json({
      status,
      isPaid,
      isPending,
      isFailed,
      paidAt: payment?.paymentDate || payment?.confirmedDate || null,
      value: payment?.value,
    })
  } catch (err) {
    console.error('checkout-status error:', err)
    return res.status(500).json({ error: err.message || 'Erro interno' })
  }
}
