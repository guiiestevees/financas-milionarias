import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

// When VITE_SUPABASE_URL is not set the app runs in local-only mode without auth
const LOCAL_USER = { id: 'local', email: 'local@app', app_metadata: {}, user_metadata: {} }

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setSession({ user: LOCAL_USER })
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    if (!supabase) return { error: null }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  // Login flexível: aceita email OU CPF OU celular.
  // Se for CPF/celular, consulta RPC pra descobrir o email vinculado.
  //
  // Estratégia de detecção:
  // - Tem '@' → email
  // - 11 dígitos → tenta CPF primeiro, depois celular (cobre ambos formatos)
  // - 10 dígitos → só pode ser celular (DDD + 8 dígitos)
  // - Outros → erro
  const signInWithIdentifier = async (identifier, password) => {
    if (!supabase) return { error: { message: 'Sistema indisponível' } }
    const id = String(identifier || '').trim()
    let email = id

    if (!id.includes('@')) {
      const digits = id.replace(/\D/g, '')

      if (digits.length < 10) {
        return { error: { message: 'Informe email, CPF (11 dígitos) ou celular com DDD' } }
      }

      // Tenta CPF se tiver 11 dígitos
      if (digits.length === 11) {
        const { data: cpfEmail, error: cpfErr } = await supabase.rpc('lookup_email_by_cpf', { p_cpf: digits })
        if (cpfErr) console.warn('CPF lookup error:', cpfErr)
        if (cpfEmail) email = cpfEmail
      }

      // Se ainda não achou, tenta como celular (10 ou 11 dígitos)
      if (email === id) {
        const { data: phoneEmail, error: phoneErr } = await supabase.rpc('lookup_email_by_phone', { p_phone: digits })
        if (phoneErr) console.warn('Phone lookup error:', phoneErr)
        if (phoneEmail) email = phoneEmail
      }

      if (email === id) {
        return { error: { message: 'Não encontrei nenhum cadastro com esses dados. Confira CPF ou número.' } }
      }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (email, password, name, cpf = null, phone = null) => {
    if (!supabase) return { error: null }
    // Guarda metadados (name, cpf, phone) — depois também são salvos
    // diretamente no user_profiles pra busca por CPF/telefone funcionar
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, cpf: cpf || null, phone: phone || null } },
    })
    return { error, data }
  }

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  const resetPassword = async (email) => {
    if (!supabase) return { error: null }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  }

  const updatePassword = async (newPassword) => {
    if (!supabase) return { error: null }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error }
  }

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, signIn, signInWithIdentifier, signUp, signOut, resetPassword, updatePassword }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
