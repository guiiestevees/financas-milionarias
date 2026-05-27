// Helper pra mandar emails transacionais via Resend.
// https://resend.com — 3.000 emails grátis/mês.
//
// Env vars:
//   RESEND_API_KEY — chave da API do Resend
//   EMAIL_FROM     — remetente (ex: 'Alfred <alfred@financasmilionarias.com.br>')
//                    Pra testes pode usar 'onboarding@resend.dev'
//
// Falha silenciosa: se a key não estiver configurada, só loga e segue.

const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || 'Alfred <onboarding@resend.dev>'

/**
 * Envia um email transacional.
 * @returns true se mandou, false se skipou ou falhou
 */
export async function sendEmail({ to, subject, html, text }) {
  if (!RESEND_API_KEY) {
    console.log('📭 RESEND_API_KEY ausente — email skip', { to, subject })
    return false
  }
  if (!to || !subject) {
    console.warn('sendEmail: faltam params, skip')
    return false
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject,
        html,
        text: text || stripHtml(html),
      }),
    })

    const data = await r.json().catch(() => ({}))
    if (!r.ok) {
      console.warn('Resend send failed:', r.status, data?.message || data?.error || '')
      return false
    }
    console.log('📧 Email enviado:', data?.id)
    return true
  } catch (err) {
    console.warn('sendEmail error:', err.message)
    return false
  }
}

function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

// ---------- Templates ----------
// HTML simples, inline styles (clients de email são chatos com CSS externo)

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f8f6f1;
  color: #1a1a1a;
  line-height: 1.6;
`
const wrapStyles = `
  max-width: 560px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  padding: 32px 28px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
`
const headerStyles = `
  text-align: center;
  border-bottom: 1px solid #eee;
  padding-bottom: 20px;
  margin-bottom: 24px;
`
const ctaStyles = `
  display: inline-block;
  padding: 12px 28px;
  background: linear-gradient(180deg, #c9a961, #a88a4a);
  color: #0a0d18;
  text-decoration: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  margin: 16px 0;
`

function wrap({ title, body, cta }) {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="${baseStyles} margin: 0; padding: 24px;">
  <div style="${wrapStyles}">
    <div style="${headerStyles}">
      <img src="https://project-s3mj5.vercel.app/alfred.png" alt="🎩" width="72" height="72" style="display:block;margin:0 auto 10px;width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid rgba(212,175,55,0.4);box-shadow:0 4px 12px rgba(0,0,0,0.06);" />
      <div style="font-family: Georgia, serif; font-size: 20px; color: #1a1a1a; font-weight: 600;">
        Alfred
      </div>
      <div style="font-size: 12px; color: #888; letter-spacing: 0.05em; text-transform: uppercase; margin-top: 2px;">
        Domus
      </div>
    </div>
    <h1 style="font-family: Georgia, serif; font-size: 22px; color: #1a1a1a; margin: 0 0 16px;">${title}</h1>
    <div style="color: #444; font-size: 15px;">${body}</div>
    ${cta ? `<div style="text-align: center; margin-top: 24px;"><a href="${cta.href}" style="${ctaStyles}">${cta.label}</a></div>` : ''}
    <div style="border-top: 1px solid #eee; margin-top: 28px; padding-top: 20px; font-size: 12px; color: #999; text-align: center;">
      Ao seu dispor,<br><strong style="color: #666;">Alfred · Domus</strong>
    </div>
  </div>
</body></html>`
}

// ---------- Templates específicos ----------

export function paymentConfirmedEmail({ name, planName, value, validUntil }) {
  const valueLabel = `R$ ${Number(value).toFixed(2).replace('.', ',')}`
  const dateLabel = new Date(validUntil).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

  return {
    subject: '🎩 Pagamento confirmado — ao seu dispor',
    html: wrap({
      title: 'Pagamento confirmado',
      body: `
        <p>Permita-me confirmar: o pagamento do plano <strong>${planName}</strong> no valor de <strong>${valueLabel}</strong> foi recebido.</p>
        <p>Seu acesso completo está liberado até <strong>${dateLabel}</strong>. Estarei ao seu dispor — qualquer despesa, receita ou consulta, é só me chamar pelo aplicativo ou WhatsApp.</p>
      `,
      cta: { href: 'https://project-s3mj5.vercel.app', label: 'Abrir o aplicativo' },
    }),
  }
}

export function paymentOverdueEmail({ name, value, regularizeUrl }) {
  const valueLabel = `R$ ${Number(value).toFixed(2).replace('.', ',')}`
  return {
    subject: '🎩 Permita-me uma observação — pagamento em aberto',
    html: wrap({
      title: 'Pagamento em aberto',
      body: `
        <p>Permita-me uma observação: a cobrança de <strong>${valueLabel}</strong> consta em aberto.</p>
        <p>Sua assinatura permanecerá ativa por mais 3 dias — tempo suficiente para regularizar com tranquilidade.</p>
        <p style="color: #888; font-size: 13px;">Se a cobrança já foi paga, ignore esta mensagem. A confirmação chega em poucos minutos.</p>
      `,
      cta: regularizeUrl ? { href: regularizeUrl, label: 'Regularizar pagamento' } : null,
    }),
  }
}

export function subscriptionCancelledEmail({ name, validUntil }) {
  const dateLabel = new Date(validUntil).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
  return {
    subject: '🎩 Assinatura encerrada — agradeço a oportunidade',
    html: wrap({
      title: 'Sua assinatura foi encerrada',
      body: `
        <p>Sua assinatura foi cancelada como solicitado — não haverá novas cobranças.</p>
        <p>Você mantém acesso completo até <strong>${dateLabel}</strong>. Pode reativar a qualquer momento — encontrarei tudo exatamente como deixou.</p>
        <p style="color: #888; font-size: 13px;">Se cancelar foi engano, basta abrir o aplicativo e reativar.</p>
      `,
      cta: { href: 'https://project-s3mj5.vercel.app', label: 'Reativar assinatura' },
    }),
  }
}
