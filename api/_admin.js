// Helpers compartilhados pelos endpoints /api/admin/*
// - assertAdmin(req): valida JWT + checa se email tá em ADMIN_EMAILS
// - admin(): cliente Supabase com service_role (bypass RLS)
// - asaasFetch(path): wrapper pro Asaas

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

const ASAAS_API_KEY = process.env.ASAAS_API_KEY
const ASAAS_ENV = process.env.ASAAS_ENV || 'sandbox'
const ASAAS_BASE = ASAAS_ENV === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://api-sandbox.asaas.com/v3'

// Lista de emails com acesso admin, separados por vírgula no env var
// Exemplo: ADMIN_EMAILS="guiiestevees@gmail.com,outro@example.com"
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export function admin() {
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

/**
 * Verifica se o request vem de um usuário admin.
 * Retorna { user } se OK, ou manda res e retorna null se não.
 */
export async function assertAdmin(req, res) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) {
    res.status(401).json({ error: 'No token' })
    return null
  }
  const { data: { user }, error } = await userClient(token).auth.getUser()
  if (error || !user) {
    res.status(401).json({ error: 'Invalid token' })
    return null
  }
  const email = (user.email || '').toLowerCase()
  if (!ADMIN_EMAILS.includes(email)) {
    res.status(403).json({ error: 'Acesso restrito a administradores' })
    return null
  }
  return { user }
}

export async function asaasFetch(path, options = {}) {
  if (!ASAAS_API_KEY) throw new Error('ASAAS_API_KEY não configurada')
  const r = await fetch(`${ASAAS_BASE}${path}`, {
    ...options,
    headers: {
      'access_token': ASAAS_API_KEY,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) {
    const err = new Error(data?.errors?.[0]?.description || data?.message || `HTTP ${r.status}`)
    err.status = r.status
    err.data = data
    throw err
  }
  return data
}

// Define se uma data ISO está no mês atual (BR/UTC)
export function isThisMonth(iso) {
  if (!iso) return false
  const d = new Date(iso)
  const now = new Date()
  return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth()
}

// Início do mês atual em ISO
export function startOfMonthISO() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

// Início do mês passado em ISO
export function startOfLastMonthISO() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString()
}
