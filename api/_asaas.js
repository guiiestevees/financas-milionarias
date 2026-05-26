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
    value: 29.90,
    cycle: 'MONTHLY',
    label: 'R$ 29,90/mês',
    description: 'Acesso completo + WhatsApp com Alfred',
  },
  annual: {
    id: 'annual',
    name: 'Anual',
    value: 249.00,
    cycle: 'YEARLY',
    label: 'R$ 249/ano',
    description: 'Acesso completo + WhatsApp com Alfred (economia de R$ 110)',
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
    const err = new Error(`Asaas API error: ${errMsg}`)
    err.status = res.status
    err.data = data
    throw err
  }

  return data
}

// ---------- Customer ----------
/**
 * Cria um cliente no Asaas. Idempotente por externalReference (nosso user_id).
 * Se já existe, retorna o cliente existente.
 */
export async function createOrFindCustomer({ userId, name, email, cpfCnpj, phone }) {
  // Tenta achar pelo externalReference primeiro
  const existing = await asaasFetch(`/customers?externalReference=${encodeURIComponent(userId)}`)
    .catch(() => null)
  if (existing?.data?.length > 0) {
    return existing.data[0]
  }

  // Cria novo
  const payload = {
    name: name || email || 'Usuário Finanças Milionárias',
    email: email || undefined,
    cpfCnpj: cpfCnpj || undefined,
    mobilePhone: phone || undefined,
    externalReference: userId,
    notificationDisabled: true,  // a gente notifica pelo Alfred no WhatsApp
  }

  return asaasFetch('/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
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
    description: `${plan.name} — Finanças Milionárias`,
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
