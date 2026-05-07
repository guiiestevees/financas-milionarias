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

export const createEmptyMonth = () => ({
  receitas: [],
  despesas: [],
})
