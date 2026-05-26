// Cria/recupera cliente no Asaas + cria assinatura + retorna URL de checkout.
// Chamado pelo frontend quando o usuário clica "Assinar plano X".
//
// Request: POST /api/checkout
// Body: { planId: 'monthly' | 'annual', name, email, cpfCnpj, phone }
// Auth: precisa do JWT do Supabase no header Authorization: Bearer <token>
//
// Response: { checkoutUrl: string, subscriptionId: string }

import { createClient } from '@supabase/supabase-js'
import { createOrFindCustomer, createSubscription, getFirstChargeUrl, PLANS } from './_asaas.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 1) Identifica o usuário pelo JWT
    const authHeader = req.headers.authorization || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) {
      return res.status(401).json({ error: 'No token' })
    }

    // Cliente "user-scope" só pra validar o token
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    })

    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData?.user) {
      return res.status(401).json({ error: 'Invalid token' })
    }
    const user = userData.user

    // 2) Valida o plano
    const { planId, name, email, cpfCnpj, phone } = req.body || {}
    if (!planId || !PLANS[planId]) {
      return res.status(400).json({ error: 'Plano inválido' })
    }
    if (!cpfCnpj) {
      return res.status(400).json({ error: 'CPF/CNPJ obrigatório' })
    }

    // 3) Cliente admin pra atualizar o profile
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 4) Busca/cria cliente no Asaas
    const customer = await createOrFindCustomer({
      userId: user.id,
      name: name || user.email,
      email: email || user.email,
      cpfCnpj,
      phone,
    })

    // 5) Cria assinatura (cliente vai escolher forma de pagamento na hora do checkout)
    const subscription = await createSubscription({
      customerId: customer.id,
      planId,
      billingType: 'UNDEFINED',  // deixa cliente escolher na tela do Asaas
      trialDays: 7,
    })

    // 6) Pega URL da primeira cobrança pra usar como checkout
    const checkoutUrl = await getFirstChargeUrl(subscription.id)
    if (!checkoutUrl) {
      console.error('Sem invoiceUrl pra subscription', subscription.id)
      return res.status(500).json({ error: 'Falha ao gerar link de pagamento' })
    }

    // 7) Salva referências no profile do usuário
    await admin
      .from('user_profiles')
      .update({
        asaas_customer_id: customer.id,
        asaas_subscription_id: subscription.id,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    return res.status(200).json({
      checkoutUrl,
      subscriptionId: subscription.id,
      plan: PLANS[planId],
    })
  } catch (err) {
    console.error('checkout error:', err)
    return res.status(500).json({
      error: err.message || 'Erro interno',
      detail: err.data || undefined,
    })
  }
}
