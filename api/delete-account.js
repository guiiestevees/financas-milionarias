// Vercel Serverless Function: deletes the authenticated user's account.
// Uses the service_role key (server-side only) to call auth.admin.deleteUser.
// ON DELETE CASCADE in the DB removes user_profiles and user_months automatically.
//
// Required env vars on Vercel:
//   - VITE_SUPABASE_URL  (or SUPABASE_URL)
//   - VITE_SUPABASE_ANON_KEY  (or SUPABASE_ANON_KEY)
//   - SUPABASE_SERVICE_ROLE_KEY  (NEVER expose this to the client)

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  // Allow only POST
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS')
    return res.status(204).end()
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Servidor sem credenciais configuradas' })
  }

  const authHeader = req.headers.authorization || req.headers.Authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Token ausente' })

  // Validate the token by asking Supabase who the user is.
  // We use the anon client with the user's JWT to identify them safely.
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada' })
  }

  // Admin client deletes the user. CASCADE in DB will remove related rows.
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
  if (deleteError) {
    console.error('delete-account failed:', deleteError)
    return res.status(500).json({ error: 'Falha ao excluir conta. Tente novamente em instantes.' })
  }

  return res.status(200).json({ ok: true })
}
