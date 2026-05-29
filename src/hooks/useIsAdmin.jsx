import { useAuth } from './useAuth'

// Lista de emails admin — espelha a env var ADMIN_EMAILS no backend.
// O frontend usa isso só pra ESCONDER UI (botões/rotas) — segurança real
// está nos endpoints de /api/admin/* que validam de novo no backend.
//
// Pra alterar, edite VITE_ADMIN_EMAILS no Vercel (separado por vírgula).
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export function useIsAdmin() {
  const { user } = useAuth()
  const email = (user?.email || '').toLowerCase()
  const isAdmin = email && ADMIN_EMAILS.includes(email)
  return { isAdmin }
}
