export const STORAGE_KEY = 'alquimia-financas:v3'

export const DEFAULT_PAYMENT_METHODS = ['Pix', 'Débito']

export const accents = {
  gold:    { hex: '#d4af37', soft: 'rgba(212,175,55,0.14)',  glow: 'rgba(212,175,55,0.4)'  },
  emerald: { hex: '#10b981', soft: 'rgba(16,185,129,0.12)',  glow: 'rgba(16,185,129,0.35)' },
  rose:    { hex: '#f43f5e', soft: 'rgba(244,63,94,0.12)',   glow: 'rgba(244,63,94,0.35)'  },
  amber:   { hex: '#f59e0b', soft: 'rgba(245,158,11,0.12)',  glow: 'rgba(245,158,11,0.35)' },
  cyan:    { hex: '#06b6d4', soft: 'rgba(6,182,212,0.12)',   glow: 'rgba(6,182,212,0.35)'  },
  violet:  { hex: '#8b5cf6', soft: 'rgba(139,92,246,0.12)',  glow: 'rgba(139,92,246,0.35)' },
  sky:     { hex: '#0ea5e9', soft: 'rgba(14,165,233,0.12)',  glow: 'rgba(14,165,233,0.35)' },
  fuchsia: { hex: '#d946ef', soft: 'rgba(217,70,239,0.12)',  glow: 'rgba(217,70,239,0.35)' },
  lime:    { hex: '#84cc16', soft: 'rgba(132,204,22,0.12)',  glow: 'rgba(132,204,22,0.35)' },
  orange:  { hex: '#f97316', soft: 'rgba(249,115,22,0.12)',  glow: 'rgba(249,115,22,0.35)' },
}

export const accentKeys = Object.keys(accents)

export const hashAccent = (str) => {
  let h = 0
  for (let i = 0; i < (str || '').length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0
  return accentKeys[Math.abs(h) % accentKeys.length]
}

export const attrAccentKey = (name, attrList = []) => {
  const idx = attrList.findIndex((a) => a.name === name)
  const obj = idx >= 0 ? attrList[idx] : null
  return obj?.accent || (idx >= 0 ? accentKeys[idx % accentKeys.length] : hashAccent(name))
}

export const createEmptyConfig = () => ({
  cards: [],
  paymentMethods: [...DEFAULT_PAYMENT_METHODS],
  categories: [],
  attributedTo: [],
  incomeSources: [],
})

const objArr = (a) => Array.isArray(a) ? a.filter((x) => x && typeof x === 'object' && x.name) : []
const strArr = (a) => Array.isArray(a) ? a.filter((x) => typeof x === 'string' && x) : []
// Normalizes attributedTo: legacy strings become { name, isMine: true } objects
const normalizeAttr = (a) => {
  if (!Array.isArray(a)) return []
  return a
    .map((x) => typeof x === 'string' ? { name: x, isMine: true } : x)
    .filter((x) => x && typeof x === 'object' && x.name)
}

// Merges stored config with defaults, guaranteeing all fields are real arrays of valid items
export const safeConfig = (cfg) => {
  const src = cfg || {}
  const pm = strArr(src.paymentMethods)
  return {
    cards:          objArr(src.cards),
    paymentMethods: pm.length > 0 ? pm : [...DEFAULT_PAYMENT_METHODS],
    categories:     objArr(src.categories),
    attributedTo:   normalizeAttr(src.attributedTo),
    incomeSources:  strArr(src.incomeSources),
  }
}

// Computes the effective (global) config by merging across ALL stored months.
// For each field, takes the value from the latest month that has it set.
// Result: a single complete config used in every month — same orçamentos, cartões,
// atribuídos, etc. wherever you are. Past expenses keep their own paymentMethod/
// category/attributedTo values (those live on each despesa, not on the config).
export const computeEffectiveConfig = (data) => {
  // Accept either {months, config} or just months (back-compat with old callers)
  const months = data && data.months ? data.months : (data || {})
  const topLevel = data && data.config ? safeConfig(data.config) : null

  const sortedYms = Object.keys(months).sort()
  const effective = {
    cards: [],
    paymentMethods: [...DEFAULT_PAYMENT_METHODS],
    categories: [],
    attributedTo: [],
    incomeSources: [],
  }

  // Top-level config (if present) is treated as the earliest baseline
  if (topLevel) {
    if (topLevel.cards.length > 0)          effective.cards         = topLevel.cards
    if (topLevel.categories.length > 0)     effective.categories    = topLevel.categories
    if (topLevel.attributedTo.length > 0)   effective.attributedTo  = topLevel.attributedTo
    if (topLevel.incomeSources.length > 0)  effective.incomeSources = topLevel.incomeSources
    if (topLevel.paymentMethods.length > 0) effective.paymentMethods = topLevel.paymentMethods
  }

  // Latest month with a value for each field wins
  for (const ym of sortedYms) {
    const cfg = safeConfig(months[ym]?.config)
    if (cfg.cards.length > 0)         effective.cards         = cfg.cards
    if (cfg.categories.length > 0)    effective.categories    = cfg.categories
    if (cfg.attributedTo.length > 0)  effective.attributedTo  = cfg.attributedTo
    if (cfg.incomeSources.length > 0) effective.incomeSources = cfg.incomeSources
    if (cfg.paymentMethods.length > 0) effective.paymentMethods = cfg.paymentMethods
  }
  return effective
}

export const createEmptyMonth = () => ({
  receitas: [],
  despesas: [],
  config: createEmptyConfig(),
})
