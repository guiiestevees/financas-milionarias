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

  // Login flexível: aceita email OU CPF (apenas dígitos ou formatado).
  // Se for CPF, consulta a RPC pra descobrir o email vinculado.
  const signInWithIdentifier = async (identifier, password) => {
    if (!supabase) return { error: { message: 'Sistema indisponível' } }
    const id = String(identifier || '').trim()
    let email = id

    // Se NÃO parece email (sem @), trata como CPF/CNPJ
    if (!id.includes('@')) {
      const cpfDigits = id.replace(/\D/g, '')
      if (cpfDigits.length < 11) {
        return { error: { message: 'Informe um email válido ou CPF completo' } }
      }
      // Consulta RPC pra resolver o email
      const { data, error } = await supabase.rpc('lookup_email_by_cpf', { p_cpf: cpfDigits })
      if (error) {
        console.error('CPF lookup error:', error)
        return { error: { message: 'Falha ao buscar cadastro. Tente com email.' } }
      }
      if (!data) {
        return { error: { message: 'Não encontrei nenhum cadastro com esse CPF' } }
      }
      email = data
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
