// Envia código de verificação de 6 dígitos.
// POST /api/verify-send
// Body: { method: 'whatsapp' | 'email' }
// Auth: Bearer <Supabase JWT>
//
// Comportamento:
// - 'whatsapp': gera código 6 dígitos, salva hash, manda via WhatsApp template HSM.
//   Se template não aprovado / outro erro Meta → retorna erro pra UI cair pro email.
// - 'email': dispara resend do email de confirmação via Supabase Auth Admin API.
//
// Rate limits:
// - 1 envio por minuto (last_sent_at)
// - 5 envios por dia (send_count_day reseta a meia-noite)

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { applyCors } from './_cors.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const WHATSAPP_OTP_TEMPLATE = process.env.WHATSAPP_OTP_TEMPLATE || 'domus_auth_code'
const WHATSAPP_OTP_LANG = process.env.WHATSAPP_OTP_LANG || 'pt_BR'

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function userClient(token) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })
}

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex')
}

function generateCode() {
  // 6 dígitos, primeiro nunca é 0 (mais legível)
  const first = 1 + Math.floor(Math.random() * 9)
  const rest = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `${first}${rest}`
}

// Manda o código via template HSM da Meta (categoria Authentication).
// Template precisa estar APROVADO no Business Manager com 1 parâmetro {{1}}.
// Retorna { ok: true } ou { ok: false, reason }.
async function sendWhatsAppOtp(phone, code) {
  if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
    return { ok: false, reason: 'whatsapp_not_configured' }
  }
  try {
    const url = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`
    const payload = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: WHATSAPP_OTP_TEMPLATE,
        language: { code: WHATSAPP_OTP_LANG },
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', text: code }],
          },
          // Botão de copiar código (categoria Authentication exige)
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: code }],
          },
        ],
      },
    }
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) {
      console.warn('WhatsApp OTP send failed:', r.status, JSON.stringify(data).slice(0, 400))
      // Detecta erro de template não aprovado pra dar dica pro UI cair pro email
      const errMsg = data?.error?.message || ''
      if (errMsg.includes('template') || data?.error?.code === 132001 || data?.error?.code === 132000) {
        return { ok: false, reason: 'template_not_approved' }
      }
      if (data?.error?.code === 131026 || data?.error?.code === 131047) {
        return { ok: false, reason: 'phone_invalid_or_unreachable' }
      }
      return { ok: false, reason: 'whatsapp_error', detail: errMsg }
    }
    return { ok: true }
  } catch (e) {
    console.warn('WhatsApp OTP exception:', e.message)
    return { ok: false, reason: 'whatsapp_exception' }
  }
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Recuperação de senha por celular (SEM login) — multiplexada aqui pra não
  // criar uma nova Serverless Function (limite de 12 no plano Hobby da Vercel).
  const recoverAction = (req.body || {}).action
  if (recoverAction === 'recover-send' || recoverAction === 'recover-reset') {
    return handleRecover(req, res, recoverAction)
  }

  try {
    // 1) Auth
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (!token) return res.status(401).json({ error: 'No token' })
    const { data: { user }, error: authErr } = await userClient(token).auth.getUser()
    if (authErr || !user) return res.status(401).json({ error: 'Invalid token' })

    const { method = 'whatsapp' } = req.body || {}
    if (!['whatsapp', 'email'].includes(method)) {
      return res.status(400).json({ error: 'Método inválido' })
    }

    const a = admin()

    // 2) Carrega profile pra pegar telefone
    const { data: profile, error: profErr } = await a
      .from('user_profiles')
      .select('whatsapp_phone, account_verified_at')
      .eq('user_id', user.id)
      .maybeSingle()
    if (profErr) {
      console.error('profile error:', profErr)
      return res.status(500).json({ error: 'Falha ao carregar perfil' })
    }

    if (profile?.account_verified_at) {
      return res.status(200).json({ ok: true, alreadyVerified: true })
    }

    // ============ FALLBACK EMAIL ============
    if (method === 'email') {
      try {
        const { error } = await a.auth.admin.generateLink({
          type: 'signup',
          email: user.email,
        })
        if (error) {
          console.warn('admin.generateLink error:', error)
          // Tenta outro caminho — resend
          const { error: resendErr } = await a.auth.resend({
            type: 'signup',
            email: user.email,
          })
          if (resendErr) throw resendErr
        }
        return res.status(200).json({ ok: true, method: 'email', email: user.email })
      } catch (e) {
        console.error('email resend failed:', e)
        return res.status(500).json({ error: 'Não foi possível mandar o email. Tente de novo em alguns segundos.' })
      }
    }

    // ============ WHATSAPP ============
    const phone = profile?.whatsapp_phone
    if (!phone) {
      return res.status(400).json({ error: 'Sem telefone cadastrado. Use a opção de email.' })
    }

    // Rate limit: pega o registro existente
    const { data: existing } = await a
      .from('phone_verifications')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      // 1 envio por minuto
      const sinceLast = Date.now() - new Date(existing.last_sent_at).getTime()
      if (sinceLast < 60 * 1000) {
        const waitSec = Math.ceil((60 * 1000 - sinceLast) / 1000)
        return res.status(429).json({
          error: `Aguarde ${waitSec}s antes de pedir outro código.`,
          retryAfter: waitSec,
        })
      }
      // 5 envios por dia
      const today = new Date().toISOString().slice(0, 10)
      if (existing.send_count_day === today && existing.send_count >= 5) {
        return res.status(429).json({
          error: 'Você atingiu o limite de envios hoje. Tente novamente amanhã ou use o email.',
        })
      }
    }

    // Gera código e envia
    const code = generateCode()
    const result = await sendWhatsAppOtp(phone, code)

    if (!result.ok) {
      const msg = result.reason === 'template_not_approved'
        ? 'WhatsApp ainda não disponível. Use a opção de email por enquanto.'
        : result.reason === 'phone_invalid_or_unreachable'
        ? 'Não consegui enviar pro seu WhatsApp. Verifique o número ou use o email.'
        : 'Falha ao enviar pelo WhatsApp. Use o email como alternativa.'
      return res.status(502).json({ error: msg, fallback: 'email', detail: result.reason })
    }

    // Sucesso — salva hash do código
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min
    const today = new Date().toISOString().slice(0, 10)
    const newSendCount = (existing?.send_count_day === today)
      ? (existing.send_count || 0) + 1
      : 1

    const { error: upsertErr } = await a
      .from('phone_verifications')
      .upsert({
        user_id: user.id,
        phone,
        code_hash: hashCode(code),
        expires_at: expiresAt,
        attempts: 0,
        last_sent_at: new Date().toISOString(),
        send_count: newSendCount,
        send_count_day: today,
      }, { onConflict: 'user_id' })

    if (upsertErr) {
      console.error('phone_verifications upsert error:', upsertErr)
      return res.status(500).json({ error: 'Falha interna ao salvar código' })
    }

    return res.status(200).json({
      ok: true,
      method: 'whatsapp',
      phoneMasked: maskPhone(phone),
      expiresAt,
    })
  } catch (err) {
    console.error('verify-send error:', err)
    return res.status(500).json({ error: err.message || 'Erro interno' })
  }
}

function maskPhone(p) {
  // 5511987654321 → "+55 (11) 9 ****-4321"
  const s = String(p)
  if (s.length < 6) return s
  const last4 = s.slice(-4)
  const cc = s.slice(0, 2)
  const ddd = s.slice(2, 4)
  return `+${cc} (${ddd}) *****-${last4}`
}

// ============================================================
// Recuperação de senha por CELULAR (sem login).
// action: 'recover-send' { phone } → manda código no WhatsApp
// action: 'recover-reset' { phone, code, newPassword } → valida e troca senha
// Acha a conta pelo whatsapp_phone; reaproveita phone_verifications + helpers acima.
// ============================================================
function normalizePhone(input) {
  const digits = String(input || '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('55') && digits.length >= 12) return digits
  if (digits.length === 10 || digits.length === 11) return '55' + digits
  if (digits.length >= 10) return digits
  return null
}

async function findUserIdByPhone(a, phone) {
  const { data, error } = await a
    .from('user_profiles')
    .select('user_id, whatsapp_phone')
    .eq('whatsapp_phone', phone)
    .limit(1)
  if (error) { console.error('findUserIdByPhone error:', error); return null }
  return data && data[0] ? data[0].user_id : null
}

async function handleRecover(req, res, action) {
  try {
    const phone = normalizePhone(req.body?.phone)
    if (!phone) return res.status(400).json({ error: 'Número inválido. Informe com DDD.' })

    const a = admin()
    const userId = await findUserIdByPhone(a, phone)
    if (!userId) return res.status(404).json({ error: 'Não encontrei nenhuma conta com esse número de WhatsApp.' })

    // ----- enviar código -----
    if (action === 'recover-send') {
      const { data: existing } = await a.from('phone_verifications').select('*').eq('user_id', userId).maybeSingle()
      if (existing) {
        const sinceLast = Date.now() - new Date(existing.last_sent_at).getTime()
        if (sinceLast < 60 * 1000) {
          const waitSec = Math.ceil((60 * 1000 - sinceLast) / 1000)
          return res.status(429).json({ error: `Aguarde ${waitSec}s antes de pedir outro código.`, retryAfter: waitSec })
        }
        const today = new Date().toISOString().slice(0, 10)
        if (existing.send_count_day === today && existing.send_count >= 5) {
          return res.status(429).json({ error: 'Você atingiu o limite de envios hoje. Tente novamente amanhã.' })
        }
      }
      const code = generateCode()
      const result = await sendWhatsAppOtp(phone, code)
      if (!result.ok) {
        const msg = result.reason === 'template_not_approved'
          ? 'WhatsApp indisponível no momento. Tente novamente mais tarde.'
          : result.reason === 'phone_invalid_or_unreachable'
          ? 'Não consegui enviar pro WhatsApp desse número.'
          : 'Falha ao enviar o código pelo WhatsApp.'
        return res.status(502).json({ error: msg, detail: result.reason })
      }
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
      const today = new Date().toISOString().slice(0, 10)
      const newSendCount = (existing?.send_count_day === today) ? (existing.send_count || 0) + 1 : 1
      const { error: upErr } = await a.from('phone_verifications').upsert({
        user_id: userId, phone, code_hash: hashCode(code), expires_at: expiresAt,
        attempts: 0, last_sent_at: new Date().toISOString(), send_count: newSendCount, send_count_day: today,
      }, { onConflict: 'user_id' })
      if (upErr) { console.error('recover upsert error:', upErr); return res.status(500).json({ error: 'Falha interna ao salvar código' }) }
      return res.status(200).json({ ok: true, phoneMasked: maskPhone(phone), expiresAt })
    }

    // ----- validar e trocar senha -----
    const code = String(req.body?.code || '').replace(/\D/g, '')
    const newPassword = String(req.body?.newPassword || '')
    if (code.length !== 6) return res.status(400).json({ error: 'Código precisa ter 6 dígitos.' })
    if (newPassword.length < 6) return res.status(400).json({ error: 'A nova senha precisa ter pelo menos 6 caracteres.' })

    const { data: rec } = await a.from('phone_verifications').select('*').eq('user_id', userId).maybeSingle()
    if (!rec) return res.status(400).json({ error: 'Nenhum código pendente. Peça um novo código.' })
    if (new Date(rec.expires_at).getTime() < Date.now()) return res.status(400).json({ error: 'Código expirado. Peça um novo.' })
    if ((rec.attempts || 0) >= 3) return res.status(429).json({ error: 'Muitas tentativas. Peça um novo código.' })
    if (hashCode(code) !== rec.code_hash) {
      await a.from('phone_verifications').update({ attempts: (rec.attempts || 0) + 1 }).eq('user_id', userId)
      const restantes = Math.max(0, 2 - (rec.attempts || 0))
      return res.status(400).json({ error: restantes > 0 ? `Código incorreto. ${restantes} tentativa(s) restante(s).` : 'Código incorreto. Peça um novo código.' })
    }

    const { error: updErr } = await a.auth.admin.updateUserById(userId, { password: newPassword })
    if (updErr) { console.error('updateUserById error:', updErr); return res.status(500).json({ error: 'Falha ao trocar a senha. Tente novamente.' }) }
    await a.from('phone_verifications').update({ expires_at: new Date(0).toISOString(), attempts: 99 }).eq('user_id', userId)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('handleRecover error:', err)
    return res.status(500).json({ error: err.message || 'Erro interno' })
  }
}
