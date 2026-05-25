// Vercel Serverless Function: WhatsApp Cloud API webhook.
//
// GET  → handshake de verificação do Meta (apenas no setup inicial)
// POST → recebe mensagens enviadas ao número da Meta e responde
//
// Required Vercel env vars:
//   WHATSAPP_VERIFY_TOKEN     → string aleatória que você define (igual no Meta)
//   WHATSAPP_PHONE_NUMBER_ID  → Phone Number ID (público, vem do Meta)
//   WHATSAPP_ACCESS_TOKEN     → Access Token (temporário 24h ou permanente)

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const GRAPH_VERSION = 'v21.0'

export default async function handler(req, res) {
  // ---------- Verificação do webhook (Meta dispara isso 1x no setup) ----------
  if (req.method === 'GET') {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified ✓')
      return res.status(200).send(challenge)
    }
    console.warn('Webhook verification failed (token mismatch)')
    return res.status(403).send('Forbidden')
  }

  // ---------- Mensagens recebidas ----------
  if (req.method === 'POST') {
    try {
      const body = req.body
      console.log('📩 webhook payload:', JSON.stringify(body))

      const entry = body?.entry?.[0]
      const change = entry?.changes?.[0]
      const value = change?.value
      const message = value?.messages?.[0]

      // Ignora notificações de status (entregue/lido) — só processa mensagens
      if (!message) {
        return res.status(200).json({ received: true })
      }

      const from = message.from
      const type = message.type
      let text = ''

      if (type === 'text') text = message.text?.body || ''
      else if (type === 'audio') text = '[áudio]'
      else if (type === 'image') text = '[imagem]'
      else text = `[${type}]`

      console.log(`📲 de ${from} (${type}): ${text}`)

      // Resposta automática provisória — Fase 2 substituirá pela IA
      await sendWhatsAppMessage(
        from,
        type === 'text'
          ? `🤖 Recebi: "${text}"\n\nEm breve eu vou registrar gastos automaticamente. Por enquanto só tô confirmando que a conexão tá funcionando.`
          : `🤖 Recebi um ${type}. Em breve vou processar isso também!`
      )

      return res.status(200).json({ received: true })
    } catch (err) {
      console.error('webhook error:', err)
      // Sempre 200 pro Meta não reentregar a mesma msg em loop
      return res.status(200).json({ received: true, error: 'handled' })
    }
  }

  return res.status(405).send('Method not allowed')
}

// ---------- Envia mensagem de texto via Graph API ----------
async function sendWhatsAppMessage(to, text) {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.error('WhatsApp env vars not configured')
    return
  }
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
    const errText = await r.text()
    console.error('WhatsApp send failed:', r.status, errText)
  }
}
