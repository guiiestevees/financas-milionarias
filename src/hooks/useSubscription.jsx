import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Carrega e mantém o status de assinatura do usuário atualizado.
// Retorna { loading, status, until, plan, daysLeft, isActive, isTrial, isOverdue, isBlocked, refresh }
//
// Status possíveis:
//   trial      → 7 dias grátis (default pra novos usuários)
//   active     → assinatura paga em dia
//   overdue    → atrasou pagamento (banner amarelo + 3 dias de graça)
//   expired    → trial acabou OU pagamento atrasou demais (BLOQUEIA)
//   cancelled  → cliente cancelou (BLOQUEIA)
//
// isBlocked = true quando precisa mostrar tela de "assine pra continuar"

export function useSubscription() {
  const { user } = useAuth()
  const [state, setState] = useState({
    loading: true,
    status: 'trial',
    until: null,
    plan: null,
    trialStartedAt: null,
  })

  const load = useCallback(async () => {
    if (!user || !supabase) {
      setState((s) => ({ ...s, loading: false }))
      return
    }
    const { data, error } = await supabase
      .from('user_profiles')
      .select('subscription_status, subscription_until, subscription_plan, trial_started_at')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) {
      console.error('useSubscription load error:', error)
      setState((s) => ({ ...s, loading: false }))
      return
    }
    setState({
      loading: false,
      status: data?.subscription_status || 'trial',
      until: data?.subscription_until || null,
      plan: data?.subscription_plan || null,
      trialStartedAt: data?.trial_started_at || null,
    })
  }, [user])

  useEffect(() => { load() }, [load])

  // Deriva valores úteis pra UI
  const now = Date.now()
  const untilMs = state.until ? new Date(state.until).getTime() : null
  const msLeft = untilMs ? untilMs - now : 0
  const daysLeft = Math.max(0, Math.ceil(msLeft / 86400000))
  const hoursLeft = Math.max(0, Math.ceil(msLeft / 3600000))

  const isTrial = state.status === 'trial'
  const isActive = state.status === 'active'
  const isOverdue = state.status === 'overdue'
  const isCancelled = state.status === 'cancelled'
  const isExpired = state.status === 'expired'

  // Cancelado mantém acesso até a data que já foi paga (subscription_until).
  // Só bloqueia quando passou da data.
  const hasTimeLeft = msLeft > 0
  const cancelledButActive = isCancelled && hasTimeLeft

  // 3 dias de graça pra "overdue" — depois disso bloqueia
  const overdueGraceLeft = isOverdue ? daysLeft : null

  // Bloqueia só nesses casos:
  // - status 'expired' (acesso terminou de fato)
  // - status 'cancelled' E data já passou
  // - overdue há mais de 3 dias
  // - trial vencido
  const isBlocked =
    isExpired ||
    (isCancelled && !hasTimeLeft) ||
    (isOverdue && daysLeft === 0) ||
    (isTrial && !hasTimeLeft)

  return {
    ...state,
    daysLeft,
    hoursLeft,
    isTrial,
    isActive,
    isOverdue,
    isCancelled,
    isExpired,
    isBlocked,
    cancelledButActive,
    overdueGraceLeft,
    refresh: load,
  }
}
