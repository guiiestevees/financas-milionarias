// Valida o código de 6 dígitos.
// POST /api/verify-check
// Body: { code: '123456' }
// Auth: Bearer <Supabase JWT>
//
// Se OK: marca user_profiles.account_verified_at = NOW() e retorna { ok: true }
// Se errado: incrementa attempts. Depois de 3 → invalida código (precisa pedir novo).

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // 1) Auth
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (!token) return res.status(401).json({ error: 'No token' })
    const { data: { user }, error: authErr } = await userClient(token).auth.getUser()
    if (authErr || !user) return res.status(401).json({ error: 'Invalid token' })

    // 2) Valida payload
    const rawCode = String(req.body?.code || '').replace(/\D/g, '')
    if (rawCode.length !== 6) {
      return res.status(400).json({ error: 'Código precisa ter 6 dígitos' })
    }

    const a = admin()

    // 3) Pega o registro de verificação
    const { data: rec, error: recErr } = await a
      .from('phone_verifications')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (recErr) {
      console.error('phone_verifications select error:', recErr)
      return res.status(500).json({ error: 'Falha interna' })
    }

    if (!rec) {
      return res.status(400).json({ error: 'Nenhum código pendente. Peça um novo código.' })
    }

    // 4) Checa expiração
    if (new Date(rec.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Código expirado. Peça um novo.' })
    }

    // 5) Checa tentativas
    if (rec.attempts >= 3) {
      return res.status(429).json({
        error: 'Muitas tentativas erradas. Peça um novo código.',
      })
    }

    // 6) Compara
    if (hashCode(rawCode) !== rec.code_hash) {
      // Incrementa attempts
      await a
        .from('phone_verifications')
        .update({ attempts: rec.attempts + 1 })
        .eq('user_id', user.id)
      const restantes = Math.max(0, 2 - rec.attempts)
      return res.status(400).json({
        error: restantes > 0
          ? `Código incorreto. ${restantes} tentativa${restantes === 1 ? '' : 's'} restante${restantes === 1 ? '' : 's'}.`
          : 'Código incorreto. Peça um novo código.',
      })
    }

    // 7) Sucesso — marca conta verificada
    const nowIso = new Date().toISOString()
    const { error: updErr } = await a
      .from('user_profiles')
      .update({
        account_verified_at: nowIso,
        verification_method: 'whatsapp',
      })
      .eq('user_id', user.id)
    if (updErr) {
      console.error('profile verify update error:', updErr)
      return res.status(500).json({ error: 'Falha ao confirmar — tente novamente' })
    }

    // Limpa o registro de verificação (evita reuso)
    await a.from('phone_verifications').delete().eq('user_id', user.id)

    return res.status(200).json({ ok: true, verifiedAt: nowIso })
  } catch (err) {
    console.error('verify-check error:', err)
    return res.status(500).json({ error: err.message || 'Erro interno' })
  }
}
