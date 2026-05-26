// Webhook do Asaas — recebe eventos de pagamento e atualiza
// o status de assinatura do usuário no Supabase.
//
// Configure essa URL no painel do Asaas:
//   Configurações → Notificações → Webhooks
//   URL: https://<seu-dominio>.vercel.app/api/asaas-webhook
//   Eventos: PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE,
//            PAYMENT_REFUNDED, SUBSCRIPTION_INACTIVATED
//
// Segurança: Asaas envia um header 'asaas-access-token' que deve bater
// com a env var ASAAS_WEBHOOK_TOKEN configurada no painel deles.

import { createClient } from '@supabase/supabase-js'
import { nextExpirationDate, PLANS } from './_asaas.js'
import { sendWhatsApp } from './_whatsapp.js'
import { sendEmail, paymentConfirmedEmail, paymentOverdueEmail, subscriptionCancelledEmail } from './_email.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN

function supabaseAdmin() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('Supabase env vars ausentes')
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed')
  }

  // Validação opcional do token (Asaas pode mandar o header se configurado)
  if (WEBHOOK_TOKEN) {
    const incoming = req.headers['asaas-access-token']
    if (incoming !== WEBHOOK_TOKEN) {
      console.warn('asaas-webhook: token inválido')
      return res.status(401).send('Unauthorized')
    }
  }

  const event = req.body
  const eventType = event?.event
  const payment = event?.payment
  console.log(`💳 Asaas webhook: ${eventType}`, payment?.id)

  if (!eventType) {
    return res.status(200).json({ ok: true, skipped: 'no event' })
  }

  try {
    const admin = supabaseAdmin()

    switch (eventType) {
      // Pagamento recebido (PIX/Boleto/Cartão aprovado)
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED': {
        await handlePaymentReceived(admin, payment)
        break
      }

      // Pagamento atrasou — começa contagem dos 3 dias de graça
      case 'PAYMENT_OVERDUE': {
        await handlePaymentOverdue(admin, payment)
        break
      }

      // Cliente estornou ou Asaas reembolsou
      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_DELETED': {
        await handlePaymentReverted(admin, payment)
        break
      }

      // Assinatura foi cancelada (pelo cliente, por inadimplência, ou por nós)
      case 'SUBSCRIPTION_INACTIVATED': {
        await handleSubscriptionCancelled(admin, event.subscription)
        break
      }

      default:
        console.log(`⏭ Evento ignorado: ${eventType}`)
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('asaas-webhook error:', err)
    // Retorna 200 mesmo em erro pra Asaas não ficar reenviando.
    // Loga pra investigar.
    return res.status(200).json({ ok: false, error: 'handled' })
  }
}

// ---------- Handlers de cada evento ----------

async function handlePaymentReceived(admin, payment) {
  if (!payment) return
  const customerId = payment.customer
  const subscriptionId = payment.subscription
  const paymentId = payment.id

  // Determina o plano pelo valor (heurística: anual sempre passa de R$ 50)
  const value = Number(payment.value) || 0
  const planId = value >= 50 ? 'annual' : 'monthly'

  // Busca o usuário pelo customer ID — inclui dados pra notificação
  const { data: profile } = await admin
    .from('user_profiles')
    .select('user_id, last_payment_id, subscription_status, whatsapp_phone')
    .eq('asaas_customer_id', customerId)
    .maybeSingle()

  if (!profile) {
    console.warn(`Pagamento recebido pra customer ${customerId}, mas não achei o usuário`)
    return
  }

  // Idempotência: se já processamos esse pagamento, ignora
  if (profile.last_payment_id === paymentId) {
    console.log(`Pagamento ${paymentId} já processado, ignorando`)
    return
  }

  const until = nextExpirationDate(planId)
  const wasFirstPayment = profile.subscription_status !== 'active'

  await admin
    .from('user_profiles')
    .update({
      subscription_status: 'active',
      subscription_until: until,
      subscription_plan: planId,
      asaas_subscription_id: subscriptionId || null,
      last_payment_id: paymentId,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', profile.user_id)

  console.log(`✅ Assinatura ativada: user ${profile.user_id} → ${planId} até ${until}`)

  // 🎩 Notificações (paralelo, falha silenciosa)
  const plan = PLANS[planId]
  await Promise.allSettled([
    sendPaymentConfirmedWhatsApp({
      to: profile.whatsapp_phone,
      planName: plan?.name || planId,
      value,
      isFirst: wasFirstPayment,
    }),
    sendPaymentConfirmedEmail({
      admin, userId: profile.user_id,
      planName: plan?.name || planId,
      value, until,
    }),
  ])
}

// ---------- Helpers de notificação ----------

async function sendPaymentConfirmedWhatsApp({ to, planName, value, isFirst }) {
  if (!to) return
  const valueLabel = `R$ ${Number(value).toFixed(2).replace('.', ',')}`
  const msg = isFirst
    ? `🎩 *Pagamento confirmado.*

Recebi o pagamento de *${valueLabel}* — plano *${planName}* ativado.

Estarei ao seu dispor sempre que precisar. Registre despesas, receitas ou faça consultas: é só me chamar.

_Excelente decisão._`
    : `🎩 *Renovação confirmada.*

Cobrança mensal de *${valueLabel}* processada com sucesso — plano *${planName}* continua ativo.

Permaneço ao seu dispor.`
  await sendWhatsApp(to, msg)
}

async function sendPaymentConfirmedEmail({ admin, userId, planName, value, until }) {
  // Busca email do usuário no Supabase Auth
  const { data: userData } = await admin.auth.admin.getUserById(userId)
  const email = userData?.user?.email
  if (!email) return
  const tpl = paymentConfirmedEmail({ name: '', planName, value, validUntil: until })
  await sendEmail({ to: email, ...tpl })
}

async function handlePaymentOverdue(admin, payment) {
  if (!payment) return
  const customerId = payment.customer
  const value = Number(payment.value) || 0

  const { data: profile } = await admin
    .from('user_profiles')
    .select('user_id, whatsapp_phone')
    .eq('asaas_customer_id', customerId)
    .maybeSingle()

  if (!profile) return

  await admin
    .from('user_profiles')
    .update({
      subscription_status: 'overdue',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', profile.user_id)

  console.log(`⚠ Pagamento atrasou: user ${profile.user_id}`)

  // 🎩 Notificação proativa — cliente pode resolver antes do bloqueio
  const valueLabel = `R$ ${value.toFixed(2).replace('.', ',')}`
  const regularizeUrl = `https://project-s3mj5.vercel.app`  // app abre tela de assinatura

  await Promise.allSettled([
    profile.whatsapp_phone && sendWhatsApp(profile.whatsapp_phone, `🎩 *Permita-me uma observação.*

A cobrança de *${valueLabel}* consta em aberto. Sua assinatura permanece ativa por mais 3 dias — tempo suficiente para regularizar com tranquilidade.

Se já pagou, ignore esta mensagem — a confirmação chega em poucos minutos.

_Para regularizar pelo aplicativo, basta abrir Configurações → Assinatura → Trocar forma de pagamento._`),
    sendOverdueEmail({ admin, userId: profile.user_id, value, regularizeUrl }),
  ])
}

async function sendOverdueEmail({ admin, userId, value, regularizeUrl }) {
  const { data: userData } = await admin.auth.admin.getUserById(userId)
  const email = userData?.user?.email
  if (!email) return
  const tpl = paymentOverdueEmail({ name: '', value, regularizeUrl })
  await sendEmail({ to: email, ...tpl })
}

async function handlePaymentReverted(admin, payment) {
  if (!payment) return
  const customerId = payment.customer

  const { data: profile } = await admin
    .from('user_profiles')
    .select('user_id')
    .eq('asaas_customer_id', customerId)
    .maybeSingle()

  if (!profile) return

  await admin
    .from('user_profiles')
    .update({
      subscription_status: 'expired',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', profile.user_id)

  console.log(`🔄 Pagamento revertido: user ${profile.user_id}`)
}

async function handleSubscriptionCancelled(admin, subscription) {
  if (!subscription) return
  const subscriptionId = subscription.id

  const { data: profile } = await admin
    .from('user_profiles')
    .select('user_id, whatsapp_phone, subscription_until')
    .eq('asaas_subscription_id', subscriptionId)
    .maybeSingle()

  if (!profile) return

  await admin
    .from('user_profiles')
    .update({
      subscription_status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', profile.user_id)

  console.log(`❌ Assinatura cancelada: user ${profile.user_id}`)

  // 🎩 Despedida cordial + lembrete de acesso restante
  const until = profile.subscription_until
  const dateLabel = until ? new Date(until).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }) : 'o fim do período'

  await Promise.allSettled([
    profile.whatsapp_phone && sendWhatsApp(profile.whatsapp_phone, `🎩 *Assinatura encerrada.*

Acato sua decisão. Não haverá novas cobranças.

Seu acesso permanece completo até *${dateLabel}* — seus dados continuam preservados. Pode reativar a qualquer momento e encontrará tudo exatamente como deixou.

_Agradeço a oportunidade de servi-lo._`),
    sendCancelledEmail({ admin, userId: profile.user_id, until }),
  ])
}

async function sendCancelledEmail({ admin, userId, until }) {
  const { data: userData } = await admin.auth.admin.getUserById(userId)
  const email = userData?.user?.email
  if (!email) return
  const tpl = subscriptionCancelledEmail({ name: '', validUntil: until })
  await sendEmail({ to: email, ...tpl })
}
