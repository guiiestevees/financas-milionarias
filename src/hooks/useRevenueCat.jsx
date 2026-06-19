import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { isNativeApp } from '../lib/platform'
import {
  initPurchases,
  getCustomerInfo,
  getCurrentOffering,
  purchasePackage as rcPurchase,
  restorePurchases as rcRestore,
  addCustomerInfoListener,
  isEntitled as rcIsEntitled,
} from '../lib/revenuecat'

// Provider do RevenueCat — mantém o status da assinatura In-App (Apple/Google).
// No web/PWA fica inerte (native=false, isEntitled=false): o site usa Asaas.
const RevenueCatContext = createContext(null)

export function RevenueCatProvider({ children }) {
  const { user } = useAuth()
  const native = isNativeApp()
  const [loading, setLoading] = useState(native)
  const [offering, setOffering] = useState(null)
  const [customerInfo, setCustomerInfo] = useState(null)
  const [error, setError] = useState(null)
  const listenerAdded = useRef(false)

  const refresh = useCallback(async () => {
    if (!native) { setLoading(false); return }
    const [info, off] = await Promise.all([getCustomerInfo(), getCurrentOffering()])
    setCustomerInfo(info)
    setOffering(off)
    setLoading(false)
  }, [native])

  useEffect(() => {
    let cancelled = false
    if (!native) { setLoading(false); return }
    if (!user) return  // espera o login pra amarrar a compra à conta
    ;(async () => {
      setLoading(true)
      await initPurchases(user.id)
      if (cancelled) return
      if (!listenerAdded.current) {
        listenerAdded.current = true
        addCustomerInfoListener((info) => setCustomerInfo(info))
      }
      await refresh()
    })()
    return () => { cancelled = true }
  }, [native, user, refresh])

  const purchase = useCallback(async (pkg) => {
    setError(null)
    const res = await rcPurchase(pkg)
    if (res?.customerInfo) setCustomerInfo(res.customerInfo)
    return res
  }, [])

  const restore = useCallback(async () => {
    setError(null)
    const info = await rcRestore()
    setCustomerInfo(info)
    return info
  }, [])

  const value = {
    native,
    loading,
    offering,
    customerInfo,
    isEntitled: rcIsEntitled(customerInfo),
    error,
    setError,
    purchase,
    restore,
    refresh,
  }

  return <RevenueCatContext.Provider value={value}>{children}</RevenueCatContext.Provider>
}

export function useRevenueCat() {
  const ctx = useContext(RevenueCatContext)
  // Fallback inerte caso usado fora do provider (ex.: web puro)
  if (!ctx) {
    return {
      native: false, loading: false, offering: null, customerInfo: null,
      isEntitled: false, error: null, setError: () => {},
      purchase: async () => ({}), restore: async () => null, refresh: async () => {},
    }
  }
  return ctx
}
