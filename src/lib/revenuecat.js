// Ponte com o RevenueCat (pagamento In-App da Apple/Google).
//
// SÓ roda no app nativo (Capacitor). No web/PWA todas as funções são no-op
// — o site continua usando o checkout do Asaas normalmente.
//
// O identificador do "direito" (entitlement) configurado no RevenueCat é
// `premium`. Os produtos (mensal/anual) vêm da "offering" atual, então não
// precisamos cravar os IDs aqui — o painel do RevenueCat manda.

import { isNativeApp } from './platform'

// Chave PÚBLICA do RevenueCat (Apple) — pode ficar no código, não é segredo.
const RC_APPLE_API_KEY = 'appl_oQWICeGcisbzpYAqYWHGZOmwRqK'

export const ENTITLEMENT_ID = 'premium'

let configured = false

// Importa o plugin só quando estamos no nativo (evita carregar no bundle web).
async function getPlugin() {
  const mod = await import('@revenuecat/purchases-capacitor')
  return mod.Purchases
}

// Configura o SDK uma única vez, amarrando a compra ao usuário do Supabase
// (appUserID = user.id) pra a assinatura seguir a conta entre aparelhos.
export async function initPurchases(appUserID) {
  if (!isNativeApp()) return false
  if (configured) {
    // Já configurado: só garante que o usuário logado está correto.
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
    const { customerInfo } = await Purchases.getCustomerInfo()
    return customerInfo
  } catch (e) {
    console.error('RevenueCat getCustomerInfo error:', e)
    return null
  }
}

// Retorna a "offering" atual (os planos visíveis na tela de assinatura).
export async function getCurrentOffering() {
  if (!isNativeApp()) return null
  try {
    const Purchases = await getPlugin()
    const offerings = await Purchases.getOfferings()
    return offerings?.current || null
  } catch (e) {
    console.error('RevenueCat getOfferings error:', e)
    return null
  }
}

// Compra um pacote. Retorna { customerInfo } em caso de sucesso,
// { cancelled: true } se o usuário desistiu, ou lança em erro real.
export async function purchasePackage(pkg) {
  const Purchases = await getPlugin()
  try {
    const res = await Purchases.purchasePackage({ aPackage: pkg })
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
