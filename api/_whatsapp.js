// Helper compartilhado pra mandar mensagens pelo WhatsApp via Alfred.
// Usado pelos webhooks pra notificar pagamentos, atrasos, etc.

const GRAPH_VERSION = 'v21.0'
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN

/**
 * Manda mensagem de texto via WhatsApp Cloud API.
 * Falha silenciosa: se o usuário não tem WhatsApp vinculado ou
 * está fora da janela de 24h, não bloqueia o fluxo principal.
 *
 * @returns true se mandou, false se ignorou ou falhou
 */
export async function sendWhatsApp(to, text) {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.warn('WhatsApp env vars ausentes — skip')
    return false
  }
  if (!to) {
    console.warn('sendWhatsApp: sem destinatário, skip')
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
