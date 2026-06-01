import { useState, useEffect, useCallback } from 'react'

// Preferência de qual app abrir por padrão ao acessar /app.
// 'launcher' = sempre mostra menu de apps (default seguro)
// 'financas' = vai direto pras finanças
// 'agenda'   = vai direto pra agenda
const STORAGE_KEY = 'domus:default-app'
const VALID = ['launcher', 'financas', 'agenda']

function readInitial() {
  if (typeof window === 'undefined') return 'launcher'
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (VALID.includes(v)) return v
  } catch {}
  return 'launcher'  // default conservador — mostra o menu na primeira vez
}

export function useAppPreference() {
  const [defaultApp, setDefaultAppState] = useState(readInitial)

  const setDefaultApp = useCallback((app) => {
    if (!VALID.includes(app)) return
    setDefaultAppState(app)
    try { localStorage.setItem(STORAGE_KEY, app) } catch {}
  }, [])

  return { defaultApp, setDefaultApp }
}
