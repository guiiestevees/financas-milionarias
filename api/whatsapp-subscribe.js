// Vercel Function helper: inscreve o app no WhatsApp Business Account.
// Necessário rodar uma vez após configurar o webhook na Meta,
// senão as mensagens recebidas no número não chegam no webhook.
//
// Uso: abra no navegador:
//   https://<seu-vercel>.vercel.app/api/whatsapp-subscribe
//
// Idempotente: pode rodar várias vezes sem problema.

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '974174428811946'
const GRAPH_VERSION = 'v21.0'

export default async function handler(req, res) {
  if (!ACCESS_TOKEN) {
    return res.status(500).send('WHATSAPP_ACCESS_TOKEN não configurado na Vercel')
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${WABA_ID}/subscribed_apps`

  try {
    // POST: inscreve o app
    const subRes = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` },
    })
    const subData = await subRes.json()

    // GET: confirma que tá inscrito agora
    const listRes = await fetch(url, {
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` },
    })
    const listData = await listRes.json()

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.status(200).send(`
      <html>
        <body style="font-family: monospace; max-width: 800px; margin: 40px auto; padding: 20px; background: #0a0d18; color: white;">
          <h1 style="color: ${subRes.ok ? '#10b981' : '#f43f5e'};">
            ${subRes.ok ? '✅ App inscrito com sucesso!' : '❌ Falha ao inscrever'}
          </h1>
          <h3>Subscribe response (POST):</h3>
          <pre style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">${JSON.stringify(subData, null, 2)}</pre>
          <h3>Apps inscritos atualmente (GET):</h3>
          <pre style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">${JSON.stringify(listData, null, 2)}</pre>
          <p style="margin-top: 20px;">
            Se subscribed = true ou um app aparece na lista do GET, está pronto.<br/>
            Agora manda uma mensagem pro número de teste — o webhook deve disparar.
          </p>
        </body>
      </html>
    `)
  } catch (err) {
    return res.status(500).send('Erro: ' + err.message)
  }
}
