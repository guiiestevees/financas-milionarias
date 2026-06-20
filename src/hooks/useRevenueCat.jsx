import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { isNativeApp } from '../lib/platform'
import {
  initPurchases,
  getCustomerInfo,
  getSubscriptionProducts,
  purchaseProduct as rcPurchase,
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
  const [products, setProducts] = useState([])
  const [customerInfo, setCustomerInfo] = useState(null)
  const [error, setError] = useState(null)
  const listenerAdded = useRef(false)

  // Carrega os produtos PRIMEIRO (libera a tela) e o customerInfo em paralelo,
  // sem deixar o customerInfo travar a exibição dos planos.
  const refresh = useCallback(async () => {
    if (!native) { setLoading(false); return }
    const prods = await getSubscriptionProducts()
    setProducts(prods)
    setLoading(false)
    getCustomerInfo().then((info) => setCustomerInfo(info))
  }, [native])

  useEffect(() => {
    let cancelled = false
    if (!native) { setLoading(false); return }
    if (!user) return  // espera o login pra amarrar a compra à conta

    // Trava de segurança: a tela NUNCA fica carregando mais de 15s.
    const hardStop = setTimeout(() => { if (!cancelled) setLoading(false) }, 15000)

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

    return () => { cancelled = true; clearTimeout(hardStop) }
  }, [native, user, refresh])

  const purchase = useCallback(async (product) => {
    setError(null)
    const res = await rcPurchase(product)
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
    products,
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
      native: false, loading: false, products: [], customerInfo: null,
      isEntitled: false, error: null, setError: () => {},
      purchase: async () => ({}), restore: async () => null, refresh: async () => {},
    }
  }
  return ctx
}
