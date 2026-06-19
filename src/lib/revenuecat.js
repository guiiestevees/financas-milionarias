// Ponte com o RevenueCat (pagamento In-App da Apple/Google).
//
// SÓ roda no app nativo (Capacitor). No web/PWA todas as funções são no-op
// — o site continua usando o checkout do Asaas normalmente.
//
// Buscamos os produtos DIRETO pelo ID (domus_mensal/domus_anual) em vez de
// depender de uma "offering". O direito (entitlement) configurado no
// RevenueCat é `premium`, com os dois produtos anexados — é o que destrava
// o app após a compra.

import { isNativeApp } from './platform'

// Chave PÚBLICA do RevenueCat (Apple) — pode ficar no código, não é segredo.
const RC_APPLE_API_KEY = 'appl_oQWICeGcisbzpYAqYWHGZOmwRqK'

export const ENTITLEMENT_ID = 'premium'

// IDs dos produtos no App Store Connect (anual primeiro = destaque "melhor valor")
export const PRODUCT_IDS = ['domus_anual', 'domus_mensal']

let configured = false

// Importa o plugin só quando estamos no nativo (evita carregar no bundle web).
async function getPlugin() {
  const mod = await import('@revenuecat/purchases-capacitor')
  return mod.Purchases
}

// Garante que uma chamada nunca trave a UI pra sempre: se passar do tempo,
// resolve com um fallback (ex.: lista vazia) em vez de ficar girando.
function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])
}

// Configura o SDK uma única vez, amarrando a compra ao usuário do Supabase
// (appUserID = user.id) pra a assinatura seguir a conta entre aparelhos.
export async function initPurchases(appUserID) {
  if (!isNativeApp()) return false
  if (configured) {
    if (appUserID) {
      try {
        const Purchases = await getPlugin()
        await Purchases.logIn({ appUserID })
      } catch (e) { /* ignore */ }
    }
    return true
  }
  try {
    const Purchases = await getPlugin()
    await Purchases.configure({
      apiKey: RC_APPLE_API_KEY,
      appUserID: appUserID || undefined,
    })
    configured = true
    return true
  } catch (e) {
    console.error('RevenueCat configure error:', e)
    return false
  }
}

// true se o usuário tem o direito "premium" ativo.
export function isEntitled(customerInfo) {
  return !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]
}

export async function getCustomerInfo() {
  if (!isNativeApp()) return null
  try {
    const Purchases = await getPlugin()
    const { customerInfo } = await withTimeout(Purchases.getCustomerInfo(), 12000, { customerInfo: null })
    return customerInfo
  } catch (e) {
    console.error('RevenueCat getCustomerInfo error:', e)
    return null
  }
}

// Busca os produtos de assinatura direto pelos IDs. Retorna [] no web/erro.
export async function getSubscriptionProducts() {
  if (!isNativeApp()) return []
  try {
    const Purchases = await getPlugin()
    const { products } = await withTimeout(Purchases.getProducts({ productIdentifiers: PRODUCT_IDS }), 12000, { products: [] })
    // Ordena anual primeiro (igual à ordem de PRODUCT_IDS)
    return (products || []).slice().sort(
      (a, b) => PRODUCT_IDS.indexOf(a.identifier) - PRODUCT_IDS.indexOf(b.identifier)
    )
  } catch (e) {
    console.error('RevenueCat getProducts error:', e)
    return []
  }
}

// Compra um produto. Retorna { customerInfo } em sucesso,
// { cancelled: true } se o usuário desistiu, ou lança em erro real.
export async function purchaseProduct(product) {
  const Purchases = await getPlugin()
  try {
    const res = await Purchases.purchaseStoreProduct({ product })
    return { customerInfo: res?.customerInfo }
  } catch (e) {
    if (e?.code === 'PURCHASE_CANCELLED' || e?.userCancelled) {
      return { cancelled: true }
    }
    throw e
  }
}

// Restaura compras anteriores (Apple exige esse botão na tela de assinatura).
export async function restorePurchases() {
  const Purchases = await getPlugin()
  const { customerInfo } = await Purchases.restorePurchases()
  return customerInfo
}

// Registra um callback pra quando o status de assinatura mudar.
export async function addCustomerInfoListener(cb) {
  if (!isNativeApp()) return
  try {
    const Purchases = await getPlugin()
    await Purchases.addCustomerInfoUpdateListener(cb)
  } catch (e) { /* ignore */ }
}
