// Helper compartilhado pra mandar mensagens pelo WhatsApp via Alfred.
// Usado pelos webhooks pra notificar pagamentos, atrasos, etc.

const GRAPH_VERSION = 'v21.0'
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN

/**
 * Checa se está em "horário de silêncio" (não-comercial no BR).
 * Brasília (UTC-3): bloqueia das 22h às 8h.
 */
export function isQuietHours() {
  // Hora atual em São Paulo (UTC-3)
  const nowSP = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const hour = nowSP.getUTCHours()
  return hour < 8 || hour >= 22
}

/**
 * Manda mensagem de texto via WhatsApp Cloud API.
 * Falha silenciosa: se o usuário não tem WhatsApp vinculado ou
 * está fora da janela de 24h, não bloqueia o fluxo principal.
 *
 * @param to        número do destinatário (formato 55XXXXXXXXXXX)
 * @param text      texto da mensagem
 * @param opts      { respectQuietHours: true } — pula se for noite
 * @returns true se mandou, false se ignorou ou falhou
 */
export async function sendWhatsApp(to, text, opts = {}) {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.warn('WhatsApp env vars ausentes — skip')
    return false
  }
  if (!to) {
    console.warn('sendWhatsApp: sem destinatário, skip')
    return false
  }

  // Respeita horário de silêncio (22h-8h BR) pra notificações automáticas.
  // Mensagens iniciadas pelo usuário (no webhook do Alfred) NÃO usam essa flag.
  if (opts.respectQuietHours && isQuietHours()) {
    console.log(`🌙 Quiet hours — skip WhatsApp pra ${to.slice(0, 6)}***`)
    return false
  }

  try {
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    })
    if (!r.ok) {
      const errText = await r.text().catch(() => '')
      console.warn('WhatsApp send failed:', r.status, errText.slice(0, 200))
      return false
    }
    return true
  } catch (err) {
    console.warn('WhatsApp send error:', err.message)
    return false
  }
}
