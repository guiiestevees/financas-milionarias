// GET /api/checkout-status?paymentId=xxx
// Auth: Bearer <supabase JWT>
//
// Retorna status atual do pagamento — usado pra polling do PIX.
// Response: { status, isPaid, isPending, isFailed, paidAt? }

import { createClient } from '@supabase/supabase-js'
import { getPayment } from './_asaas.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

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
