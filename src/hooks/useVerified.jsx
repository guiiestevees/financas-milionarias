import { useEffect, useState, useCallback } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'

// Hook que verifica se a conta do usuário está confirmada.
// Conta confirmada = user_profiles.account_verified_at IS NOT NULL
//
// Se Supabase estiver desativado (modo local), sempre considera verificado.
//
// Uso típico:
//   const { verified, loading, refresh } = useVerified()
//   if (!verified) <Navigate to="/verify" />
export function useVerified() {
  const { user } = useAuth()
  const [verified, setVerified] = useState(null)  // null = ainda não checou
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!supabase || !user || user.id === 'local') {
      setVerified(true)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('account_verified_at')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) {
        console.warn('useVerified read error:', error)
        // Falha de leitura — assume verificado pra não bloquear o app
        setVerified(true)
      } else {
        setVerified(!!data?.account_verified_at)
      }
    } catch (e) {
      console.warn('useVerified exception:', e)
      setVerified(true)  // fallback otimista
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  return { verified, loading, refresh }
}
