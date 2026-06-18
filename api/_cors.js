// CORS compartilhado para os endpoints chamados pelo app nativo (Capacitor).
//
// No iOS/Android o webview roda em origem capacitor://localhost (ou
// https://localhost), diferente de meudomus.com — então o navegador exige
// cabeçalhos CORS e um preflight OPTIONS antes do POST/GET com Authorization.
//
// A autenticação é só por Bearer token (sem cookies), então liberar a origem
// com "*" é seguro aqui — não há credenciais de sessão sendo enviadas.
//
// Uso no handler:
//   import { applyCors } from './_cors.js'
//   export default async function handler(req, res) {
//     if (applyCors(req, res)) return   // responde o preflight e encerra
//     ...
//   }
export function applyCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Access-Control-Max-Age', '86400')
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }
  return false
}
