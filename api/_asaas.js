// Helper pra chamar a API do Asaas.
// Usado pelos endpoints /api/checkout e /api/asaas-webhook.
//
// Env vars:
//   ASAAS_API_KEY — chave da API (sandbox começa com $aact_hmlg_; produção com $aact_prod_)
//   ASAAS_ENV     — 'sandbox' (default) ou 'production'
//
// Docs: https://docs.asaas.com

const API_KEY = process.env.ASAAS_API_KEY
const ENV = process.env.ASAAS_ENV || 'sandbox'

const BASE_URL = ENV === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://api-sandbox.asaas.com/v3'

// ---------- Plans ----------
// Definição central dos planos. Mudou aqui, muda no app inteiro.
export const PLANS = {
  monthly: {
    id: 'monthly',
    name: 'Mensal',
    value: 19.00,
    cycle: 'MONTHLY',
    label: 'R$ 19,00/mês',
    description: 'Acesso completo + WhatsApp com Alfred',
  },
  annual: {
    id: 'annual',
    name: 'Anual',
    value: 167.00,
    cycle: 'YEARLY',
    label: 'R$ 167/ano',
    description: 'Acesso completo + WhatsApp com Alfred (economia de R$ 61)',
  },
}

// ---------- Low-level HTTP wrapper ----------
async function asaasFetch(path, options = {}) {
  if (!API_KEY) {
    throw new Error('ASAAS_API_KEY não configurada no Vercel')
  }

  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'access_token': API_KEY,
      'Content-Type': 'application/json',
      'User-Agent': 'FinancasMilionarias/1.0',
      ...(options.headers || {}),
    },
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const errMsg = data?.errors?.[0]?.description || data?.message || `HTTP ${res.status}`
    // Log detalhado pra debug de problemas de cartão recusado, antifraude, etc.
    console.error(`🔴 Asaas HTTP ${res.status} em ${path}:`)
    console.error('   message:', errMsg)
    console.error('   full response:', JSON.stringify(data).slice(0, 1500))
    console.error('   env:', ENV, 'base:', BASE_URL)
    const err = new Error(`Asaas API error: ${errMsg}`)
    err.status = res.status
    err.data = data
    throw err
  }

  return data
}

// ---------- Customer ----------
/**
 * Cria um cliente no Asaas (ou atualiza se já existe).
 * Idempotente por externalReference (nosso user_id).
 *
 * Endereço completo é necessário pra emissão de nota fiscal (Asaas Notas
 * ou exportação pra outro emissor).
 *
 * @param address  { postalCode, street, addressNumber, complement,
 *                   neighborhood, city, state }  — todos opcionais individualmente,
 *                   mas Asaas só aceita NF se estiver preenchido.
 */
// Normaliza telefone pro formato que o Asaas BR espera:
// 10 ou 11 dígitos (DDD + número). Remove DDI 55 se vier no início.
// Ex: '5519997557872' → '19997557872'
//     '19997557872'   → '19997557872' (sem mudança)
function normalizePhoneBR(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return undefined
  // Tem 12 ou 13 dígitos começando com 55? Remove o DDI.
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return digits.slice(2)
  }
  // Já tá no formato BR de 10 ou 11 dígitos
  if (digits.length === 10 || digits.length === 11) return digits
  // Formato desconhecido — não envia (deixa Asaas reclamar de outra coisa, não do telefone)
  return undefined
}

export async function createOrFindCustomer({ userId, name, email, cpfCnpj, phone, address }) {
  // Monta payload de endereço pro Asaas (campos com nomes que ele espera)
  const addressPayload = address ? {
    postalCode: (address.postalCode || '').replace(/\D/g, '') || undefined,
    address: address.street || undefined,
    addressNumber: address.addressNumber || undefined,
    complement: address.complement || undefined,
    province: address.neighborhood || undefined,  // Asaas chama bairro de "province"
    city: address.city || undefined,
    state: address.state || undefined,
  } : {}

  const phoneNormalized = normalizePhoneBR(phone)

  const basePayload = {
    name: name || email || 'Usuário Domus',
    email: email || undefined,
    cpfCnpj: cpfCnpj || undefined,
    mobilePhone: phoneNormalized,
    notificationDisabled: true,  // a gente notifica pelo Alfred no WhatsApp
    ...addressPayload,
  }

  // Tenta achar pelo externalReference primeiro
  const existing = await asaasFetch(`/customers?externalReference=${encodeURIComponent(userId)}`)
    .catch(() => null)

  if (existing?.data?.length > 0) {
    const customer = existing.data[0]
    // Se temos endereço novo OU dados que faltam, atualiza o customer.
    // Asaas usa POST /customers/{id} pra update (não PUT).
    const needsUpdate =
      (address && addressPayload.postalCode && !customer.postalCode) ||
      (address && addressPayload.address && !customer.address) ||
      (cpfCnpj && !customer.cpfCnpj) ||
      (phone && !customer.mobilePhone)

    if (needsUpdate) {
      try {
        const updated = await asaasFetch(`/customers/${customer.id}`, {
          method: 'POST',
          body: JSON.stringify(basePayload),
        })
        return updated
      } catch (e) {
        // Se update falhar, retorna o existente mesmo — não bloqueia checkout
        console.warn('Customer update falhou, usando existente:', e.message)
        return customer
      }
    }
    return customer
  }

  // Cria novo
  return asaasFetch('/customers', {
    method: 'POST',
    body: JSON.stringify({
      ...basePayload,
      externalReference: userId,
    }),
  })
}

// ---------- Subscription ----------
/**
 * Cria uma assinatura recorrente.
 * billingType: 'CREDIT_CARD' | 'PIX' | 'BOLETO' | 'UNDEFINED'
 *   UNDEFINED = cliente escolhe na hora do pagamento (mais flexível)
 */
export async function createSubscription({ customerId, planId, billingType = 'UNDEFINED', trialDays = 7 }) {
  const plan = PLANS[planId]
  if (!plan) throw new Error(`Plano inválido: ${planId}`)

  // Data da primeira cobrança = hoje + trialDays
  const firstDueDate = new Date(Date.now() + trialDays * 86400000)
    .toISOString().slice(0, 10)

  const payload = {
    customer: customerId,
    billingType,
    nextDueDate: firstDueDate,
    value: plan.value,
    cycle: plan.cycle,
    description: `${plan.name} — Domus`,
    externalReference: `plan:${planId}`,
  }

  return asaasFetch('/subscriptions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Cancela uma assinatura (não estorna pagamentos já feitos).
 */
export async function cancelSubscription(subscriptionId) {
  return asaasFetch(`/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
  })
}

/**
 * Busca dados de uma assinatura.
 */
export async function getSubscription(subscriptionId) {
  return asaasFetch(`/subscriptions/${subscriptionId}`)
}

// ---------- Checkout / Payment Link ----------
/**
 * Cria um link de checkout pra o cliente preencher pagamento.
 * O Asaas retorna invoiceUrl que a gente redireciona o cliente pra lá.
 *
 * Como Asaas não tem "checkout de assinatura" embutido, a gente cria
 * a assinatura primeiro, pega a primeira cobrança gerada, e usa o
 * invoiceUrl dela como checkout. O cliente ao pagar, autoriza recorrência.
 */
export async function getFirstChargeUrl(subscriptionId) {
  // Lista pagamentos da assinatura (geralmente só tem 1 nesse ponto: o primeiro)
  const payments = await asaasFetch(`/subscriptions/${subscriptionId}/payments`)
  const first = payments?.data?.[0]
  return first?.invoiceUrl || null
}

// ---------- PIX QR Code ----------
/**
 * Busca o QR Code PIX de um pagamento.
 * Retorna { encodedImage (base64), payload (copia-cola), expirationDate }
 */
export async function getPixQrCode(paymentId) {
  return asaasFetch(`/payments/${paymentId}/pixQrCode`)
}

// ---------- PIX Automático (Adesão Imediata) ----------
/**
 * Cria uma autorização de PIX Automático com adesão imediata.
 * O QR Code retornado paga o primeiro PIX E autoriza débito recorrente
 * para os próximos meses, tudo no mesmo escaneamento.
 *
 * Bacen Pix Automático — exige que o banco do cliente suporte.
 *
 * @param customerId   ID do cliente no Asaas
 * @param planId       'monthly' ou 'annual'
 * @returns objeto com id da autorização + QR Code
 */
export async function createPixAutomaticAuthorization({ customerId, planId }) {
  const plan = PLANS[planId]
  if (!plan) throw new Error(`Plano inválido: ${planId}`)

  // frequency aceita: WEEKLY, MONTHLY, QUARTERLY, SEMIANNUALLY, YEARLY
  const frequency = plan.cycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY'

  // Hoje (o cliente paga agora E autoriza débitos futuros no mesmo ato)
  const startDate = new Date().toISOString().slice(0, 10)

  const payload = {
    customer: customerId,
    value: plan.value,
    frequency,
    startDate,
    description: `${plan.name} — Domus`,
    originType: 'IMMEDIATE_PAYMENT_AND_RECURRING_QR_CODE',
    externalReference: `plan:${planId}`,
  }

  return asaasFetch('/pix/automatic/authorizations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Busca status de uma autorização Pix Automático (pra polling).
 */
export async function getPixAutomaticAuthorization(authorizationId) {
  return asaasFetch(`/pix/automatic/authorizations/${authorizationId}`)
}

/**
 * Busca status de um pagamento (pra polling do PIX).
 */
export async function getPayment(paymentId) {
  return asaasFetch(`/payments/${paymentId}`)
}

// ---------- Pagamento avulso parcelado no cartão (anual) ----------
/**
 * Cria UM pagamento (não é subscription) parcelado no cartão.
 * Usado pro plano ANUAL pago no cartão (à vista ou em até 12x).
 * Asaas cobra o cartão N vezes mensalmente sem juros, mas o
 * recebível é nosso de uma vez.
 */
export async function createInstallmentPaymentWithCard({
  customerId, planId, installments = 1, cardData, holderInfo,
}) {
  const plan = PLANS[planId]
  if (!plan) throw new Error(`Plano inválido: ${planId}`)
  const n = Math.max(1, Math.min(12, Number(installments) || 1))

  const dueDate = new Date().toISOString().slice(0, 10)
  const remoteIp = holderInfo.remoteIp || '127.0.0.1'

  // Pra 1× usa /payments simples. Pra 2-12× usa /installments
  if (n === 1) {
    const payload = {
      customer: customerId,
      billingType: 'CREDIT_CARD',
      value: plan.value,
      dueDate,
      description: `${plan.name} — Domus`,
      externalReference: `plan:${planId}`,
      creditCard: {
        holderName: cardData.holderName,
        number: cardData.number,
        expiryMonth: cardData.expiryMonth,
        expiryYear: cardData.expiryYear,
        ccv: cardData.ccv,
      },
      creditCardHolderInfo: buildHolderInfo(holderInfo),
      remoteIp,
    }
    return asaasFetch('/payments', { method: 'POST', body: JSON.stringify(payload) })
  }

  // Parcelado em 2-12×
  const payload = {
    customer: customerId,
    billingType: 'CREDIT_CARD',
    installmentCount: n,
    totalValue: plan.value,  // valor total — Asaas divide em N
    dueDate,
    description: `${plan.name} — Domus (${n}x)`,
    externalReference: `plan:${planId}`,
    creditCard: {
      holderName: cardData.holderName,
      number: cardData.number,
      expiryMonth: cardData.expiryMonth,
      expiryYear: cardData.expiryYear,
      ccv: cardData.ccv,
    },
    creditCardHolderInfo: buildHolderInfo(holderInfo),
    remoteIp,
  }
  return asaasFetch('/payments', { method: 'POST', body: JSON.stringify(payload) })
}

// Detecta bandeira pelo prefixo do número (pra log de debug)
function detectBrand(num) {
  const n = String(num || '').replace(/\D/g, '')
  if (/^4/.test(n)) return 'visa'
  if (/^5[1-5]/.test(n)) return 'mastercard'
  if (/^3[47]/.test(n)) return 'amex'
  if (/^6(?:011|5)/.test(n)) return 'discover'
  if (/^3(?:0[0-5]|[68])/.test(n)) return 'diners'
  if (/^35/.test(n)) return 'jcb'
  if (/^(606282|3841|636368)/.test(n)) return 'hipercard/elo'
  return 'unknown'
}

// Helper interno: monta o creditCardHolderInfo que vai no Asaas pra antifraude.
// Aceita o holder em dois formatos:
//   (a) flat:    { postalCode, addressNumber }  ← formato legado
//   (b) nested:  { address: { postalCode, addressNumber, ... } }  ← formato novo
function buildHolderInfo(h) {
  const addr = h.address || {}
  const postalCode = (addr.postalCode || h.postalCode || '').replace(/\D/g, '')
  const addressNumber = addr.addressNumber || h.addressNumber || ''
  const phoneNormalized = normalizePhoneBR(h.phone)
  return {
    name: h.name,
    email: h.email,
    cpfCnpj: h.cpfCnpj,
    postalCode: postalCode || '01310100',  // fallback Av. Paulista (não recomendado)
    addressNumber: addressNumber || '0',
    phone: phoneNormalized,
    mobilePhone: phoneNormalized,
  }
}

// ---------- Pagamento avulso PIX (anual à vista) ----------
/**
 * Cria UM pagamento PIX avulso (não é subscription).
 * Usado pro plano ANUAL via PIX (paga R$ 167 e fica 12 meses).
 */
export async function createPixPayment({ customerId, planId }) {
  const plan = PLANS[planId]
  if (!plan) throw new Error(`Plano inválido: ${planId}`)

  const dueDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10)  // amanhã
  const payload = {
    customer: customerId,
    billingType: 'PIX',
    value: plan.value,
    dueDate,
    description: `${plan.name} — Domus`,
    externalReference: `plan:${planId}`,
  }
  return asaasFetch('/payments', { method: 'POST', body: JSON.stringify(payload) })
}

// ---------- Cartão de crédito — fluxo híbrido (cobrança imediata + subscription) ----------
/**
 * Cria assinatura recorrente no cartão com COBRANÇA IMEDIATA do primeiro mês.
 *
 * Fluxo em 2 passos (porque o Asaas, ao criar subscription, agenda a primeira
 * cobrança pro PRÓXIMO ciclo — não cobra "hoje"):
 *
 *  PASSO 1 — Cobra a primeira mensalidade AGORA via /payments
 *            • Asaas autoriza o cartão imediatamente
 *            • Retorna creditCardToken (cartão tokenizado pra próximas cobranças)
 *            • Se cartão recusar, JOGA ERRO antes de criar subscription
 *
 *  PASSO 2 — Cria a subscription com nextDueDate = +30 dias
 *            • Usa creditCardToken pra não re-pedir dados do cartão
 *            • A partir do mês 2, Asaas cobra automaticamente
 *
 * Retorna { firstPayment, subscription } pra checkout-pay.js decidir o status.
 */
export async function createSubscriptionWithCard({ customerId, planId, cardData, holderInfo, trialDays = 0 }) {
  const plan = PLANS[planId]
  if (!plan) throw new Error(`Plano inválido: ${planId}`)

  const today = new Date(Date.now() + trialDays * 86400000)
    .toISOString().slice(0, 10)
  const remoteIp = holderInfo.remoteIp || '127.0.0.1'
  const holderInfoPayload = buildHolderInfo(holderInfo)

  // ========== PASSO 1: cobra primeira mensalidade AGORA ==========
  const firstPaymentPayload = {
    customer: customerId,
    billingType: 'CREDIT_CARD',
    value: plan.value,
    dueDate: today,
    description: `${plan.name} — Domus (mês 1)`,
    externalReference: `plan:${planId}:first`,
    creditCard: {
      holderName: cardData.holderName,
      number: cardData.number,
      expiryMonth: cardData.expiryMonth,
      expiryYear: cardData.expiryYear,
      ccv: cardData.ccv,
    },
    creditCardHolderInfo: holderInfoPayload,
    remoteIp,
  }
  console.log('🟡 Tentando cobrar cartão. Payload (sem dados sensíveis):', JSON.stringify({
    customer: firstPaymentPayload.customer,
    value: firstPaymentPayload.value,
    dueDate: firstPaymentPayload.dueDate,
    cardLast4: cardData.number?.slice(-4),
    cardBrand: detectBrand(cardData.number),
    holderName: cardData.holderName,
    holderInfo: { ...holderInfoPayload, cpfCnpj: holderInfoPayload.cpfCnpj?.slice(0, 3) + '***' },
    remoteIp,
  }))

  const firstPayment = await asaasFetch('/payments', {
    method: 'POST',
    body: JSON.stringify(firstPaymentPayload),
  })

  console.log('🟢 Asaas retornou:', JSON.stringify({
    id: firstPayment.id,
    status: firstPayment.status,
    statusReason: firstPayment.statusReason,
    refundReason: firstPayment.refundReason,
    creditCard: firstPayment.creditCard,
    creditCardOwnerName: firstPayment.creditCard?.creditCardHolderName,
    fullObject: firstPayment,
  }).slice(0, 2000))

  // Se a primeira cobrança não autorizou, NÃO criamos a subscription.
  // Cliente vai ver o erro e tentar de novo com outro cartão.
  if (!['CONFIRMED', 'RECEIVED'].includes(firstPayment.status)) {
    // Erro descritivo com motivo do Asaas se houver
    const reason = firstPayment.statusReason
      || firstPayment.refundReason
      || (firstPayment.status === 'AWAITING_RISK_ANALYSIS' ? 'em análise antifraude do Asaas — pode levar até 24h' : null)
      || `status devolvido: ${firstPayment.status}`
    const err = new Error(`Cartão não autorizado — ${reason}`)
    err.status = 400
    err.data = { firstPayment }
    throw err
  }

  // ========== PASSO 2: cria subscription pra renovações futuras ==========
  // nextDueDate = hoje + 30 dias (primeira cobrança recorrente do mês 2)
  // Usa creditCardToken retornado pelo passo 1 — evita re-pedir cartão
  const nextDueDate = new Date(Date.now() + 30 * 86400000)
    .toISOString().slice(0, 10)
  const ccToken = firstPayment.creditCard?.creditCardToken

  const subscriptionPayload = {
    customer: customerId,
    billingType: 'CREDIT_CARD',
    nextDueDate,
    value: plan.value,
    cycle: plan.cycle,
    description: `${plan.name} — Domus`,
    externalReference: `plan:${planId}`,
    creditCardToken: ccToken,
    creditCardHolderInfo: holderInfoPayload,
    remoteIp,
  }
  const subscription = await asaasFetch('/subscriptions', {
    method: 'POST',
    body: JSON.stringify(subscriptionPayload),
  })

  return { firstPayment, subscription }
}

// ---------- Helpers ----------
/**
 * Calcula a data até quando o usuário tem acesso, dado o plano.
 */
export function nextExpirationDate(planId) {
  const months = planId === 'annual' ? 12 : 1
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toISOString()
}
