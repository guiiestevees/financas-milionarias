// Recuperação de senha por CELULAR (sem depender de email).
// POST /api/recover-phone
//   { action: 'send',  phone }                    → manda código de 6 dígitos no WhatsApp
//   { action: 'reset', phone, code, newPassword } → valida o código e troca a senha
//
// NÃO exige login (é pra quem perdeu o acesso). A conta é localizada pelo número
// de WhatsApp salvo em user_profiles.whatsapp_phone. Reaproveita a tabela
// phone_verifications e o mesmo template OTP aprovado do WhatsApp.

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { applyCors } from './_cors.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const WHATSAPP_OTP_TEMPLATE = process.env.WHATSAPP_OTP_TEMPLATE || 'domus_auth_code'
const WHATSAPP_OTP_LANG = process.env.WHATSAPP_OTP_LANG || 'pt_BR'

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex')
}

function generateCode() {
  const first = 1 + Math.floor(Math.random() * 9)
  const rest = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `${first}${rest}`
}

function normalizePhone(input) {
  const digits = String(input || '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('55') && digits.length >= 12) return digits
  if (digits.length === 10 || digits.length === 11) return '55' + digits
  if (digits.length >= 10) return digits
  return null
}

function maskPhone(p) {
  const s = String(p)
  if (s.length < 6) return s
  return `+${s.slice(0, 2)} (${s.slice(2, 4)}) *****-${s.slice(-4)}`
}

// Mesmo envio via template HSM usado em verify-send.js
async function sendWhatsAppOtp(phone, code) {
  if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) return { ok: false, reason: 'whatsapp_not_configured' }
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
          { type: 'body', parameters: [{ type: 'text', text: code }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
        ],
      },
    }
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) {
      const errMsg = data?.error?.message || ''
      if (errMsg.includes('template') || data?.error?.code === 132001 || data?.error?.code === 132000) return { ok: false, reason: 'template_not_approved' }
      if (data?.error?.code === 131026 || data?.error?.code === 131047) return { ok: false, reason: 'phone_invalid_or_unreachable' }
      return { ok: false, reason: 'whatsapp_error', detail: errMsg }
    }
    return { ok: true }
  } catch (e) {
    console.warn('recover sendWhatsAppOtp exception:', e.message)
    return { ok: false, reason: 'whatsapp_exception' }
  }
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

export default async function handler(req, res) {
  if (applyCors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Servidor sem credenciais configuradas' })
  }

  try {
    const { action } = req.body || {}
    const phone = normalizePhone(req.body?.phone)
    if (!phone) return res.status(400).json({ error: 'Número inválido. Informe com DDD.' })

    const a = admin()
    const userId = await findUserIdByPhone(a, phone)
    if (!userId) {
      return res.status(404).json({ error: 'Não encontrei nenhuma conta com esse número de WhatsApp.' })
    }

    // ===== ENVIAR CÓDIGO =====
    if (action === 'send') {
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
        user_id: userId,
        phone,
        code_hash: hashCode(code),
        expires_at: expiresAt,
        attempts: 0,
        last_sent_at: new Date().toISOString(),
        send_count: newSendCount,
        send_count_day: today,
      }, { onConflict: 'user_id' })
      if (upErr) { console.error('recover upsert error:', upErr); return res.status(500).json({ error: 'Falha interna ao salvar código' }) }

      return res.status(200).json({ ok: true, phoneMasked: maskPhone(phone), expiresAt })
    }

    // ===== VALIDAR E TROCAR A SENHA =====
    if (action === 'reset') {
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

      // Invalida o código usado
      await a.from('phone_verifications').update({ expires_at: new Date(0).toISOString(), attempts: 99 }).eq('user_id', userId)

      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ error: 'Ação inválida.' })
  } catch (err) {
    console.error('recover-phone error:', err)
    return res.status(500).json({ error: err.message || 'Erro interno' })
  }
}
