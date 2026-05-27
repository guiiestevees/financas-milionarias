// Endpoint pra checkout embedded — não redireciona, processa direto.
//
// POST /api/checkout-pay
// Body: {
//   planId: 'monthly' | 'annual',
//   method: 'PIX' | 'CREDIT_CARD',
//   holder: { name, email, cpfCnpj, phone, postalCode?, addressNumber? },
//   card?: { number, holderName, expiryMonth, expiryYear, ccv }  // só se method=CREDIT_CARD
// }
// Auth: Bearer <supabase JWT>
//
// Response:
//   PIX:        { ok, paymentId, qrCode: { encodedImage, payload, expirationDate } }
//   CREDIT_CARD: { ok, paymentId, status, subscriptionId }
//   Erro:       { error, detail? }

import { createClient } from '@supabase/supabase-js'
import {
  createOrFindCustomer,
  createSubscription,
  createSubscriptionWithCard,
  getFirstChargeUrl,
  getPixQrCode,
  PLANS,
} from './_asaas.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const ASAAS_API_KEY = process.env.ASAAS_API_KEY
const ASAAS_ENV = process.env.ASAAS_ENV || 'sandbox'
const ASAAS_BASE = ASAAS_ENV === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://api-sandbox.asaas.com/v3'

function userClient(token) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })
}

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Pega IP do request (Asaas precisa pra antifraude no cartão)
function getRemoteIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    '127.0.0.1'
  )
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 1) Auth
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (!token) return res.status(401).json({ error: 'No token' })
    const { data: { user }, error: userErr } = await userClient(token).auth.getUser()
    if (userErr || !user) return res.status(401).json({ error: 'Invalid token' })

    // 2) Valida payload
    const { planId, method, holder = {}, card } = req.body || {}
    if (!planId || !PLANS[planId]) {
      return res.status(400).json({ error: 'Plano inválido' })
    }
    if (!['PIX', 'PIX_AUTOMATIC', 'CREDIT_CARD'].includes(method)) {
      return res.status(400).json({ error: 'Método de pagamento inválido' })
    }

    // Asaas só aceita 'PIX' como billingType pra subscriptions.
    // O usuário escolhe "PIX Automático" no app — backend envia PIX, e o
    // cliente autoriza débito automático no app do banco depois de pagar.
    const asaasBillingType = method === 'PIX_AUTOMATIC' ? 'PIX' : method
    if (!holder.name || !holder.cpfCnpj) {
      return res.status(400).json({ error: 'Nome e CPF/CNPJ obrigatórios' })
    }
    if (method === 'CREDIT_CARD') {
      if (!card?.number || !card?.holderName || !card?.expiryMonth || !card?.expiryYear || !card?.ccv) {
        return res.status(400).json({ error: 'Dados do cartão incompletos' })
      }
    }

    // 3) Cliente Asaas
    const customer = await createOrFindCustomer({
      userId: user.id,
      name: holder.name,
      email: holder.email || user.email,
      cpfCnpj: holder.cpfCnpj,
      phone: holder.phone,
    })

    // 4) Cria assinatura conforme método
    let subscription
    if (method === 'CREDIT_CARD') {
      // Cobrança imediata no cartão
      subscription = await createSubscriptionWithCard({
        customerId: customer.id,
        planId,
        cardData: {
          holderName: card.holderName,
          number: card.number.replace(/\D/g, ''),
          expiryMonth: String(card.expiryMonth).padStart(2, '0'),
          expiryYear: String(card.expiryYear),
          ccv: card.ccv,
        },
        holderInfo: {
          name: holder.name,
          email: holder.email || user.email,
          cpfCnpj: holder.cpfCnpj,
          phone: holder.phone,
          postalCode: holder.postalCode,
          addressNumber: holder.addressNumber,
          remoteIp: getRemoteIp(req),
        },
        trialDays: 0,
      })
    } else {
      // PIX ou PIX_AUTOMATIC — cria assinatura, primeira cobrança gera o QR.
      // Asaas usa billingType='PIX' nos 2 casos; a autorização recorrente
      // (PIX Automático) é opt-in que o cliente faz no app do banco dele.
      subscription = await createSubscription({
        customerId: customer.id,
        planId,
        billingType: asaasBillingType,  // sempre 'PIX' (mapeado)
        trialDays: 0,
      })
    }

    // 5) Salva refs no profile (incluindo CPF — útil pra login com CPF depois)
    // Só salva CPF se for CPF (11 dígitos) — pra CNPJ a gente não vincula login
    const cpfClean = String(holder.cpfCnpj || '').replace(/\D/g, '')
    const isCpf = cpfClean.length === 11
    const profileUpdate = {
      asaas_customer_id: customer.id,
      asaas_subscription_id: subscription.id,
      updated_at: new Date().toISOString(),
    }
    if (isCpf) {
      profileUpdate.cpf = cpfClean
    }
    await admin().from('user_profiles').update(profileUpdate).eq('user_id', user.id)

    // 6) Busca primeira cobrança da assinatura
    const paymentsRes = await fetch(`${ASAAS_BASE}/subscriptions/${subscription.id}/payments`, {
      headers: { 'access_token': ASAAS_API_KEY },
    })
    const paymentsData = await paymentsRes.json()
    const firstPayment = paymentsData?.data?.[0]
    if (!firstPayment) {
      return res.status(500).json({ error: 'Cobrança não foi gerada' })
    }

    // 7) Resposta por método
    if (method === 'PIX' || method === 'PIX_AUTOMATIC') {
      // Busca QR Code (vale pra ambos — Asaas gera QR mesmo pra PIX Automático)
      const qrCode = await getPixQrCode(firstPayment.id)
      return res.status(200).json({
        ok: true,
        paymentId: firstPayment.id,
        subscriptionId: subscription.id,
        method,
        value: firstPayment.value,
        invoiceUrl: firstPayment.invoiceUrl,   // link fallback pra PIX Automático (se cliente preferir link)
        qrCode: {
          encodedImage: qrCode.encodedImage,
          payload: qrCode.payload,
          expirationDate: qrCode.expirationDate,
        },
      })
    }

    // CREDIT_CARD
    return res.status(200).json({
      ok: true,
      paymentId: firstPayment.id,
      subscriptionId: subscription.id,
      method: 'CREDIT_CARD',
      value: firstPayment.value,
      status: firstPayment.status,  // CONFIRMED | RECEIVED | PENDING
    })
  } catch (err) {
    console.error('checkout-pay error:', err)
    const msg = err?.data?.errors?.[0]?.description || err.message || 'Erro interno'
    return res.status(err.status || 500).json({
      error: msg,
      detail: err.data,
    })
  }
}
