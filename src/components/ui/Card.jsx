import { accents } from '../../lib/constants'

export function Card({ children, className = '', accent, glow = false, style = {} }) {
  const base = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 18,
    backdropFilter: 'blur(8px)',
    ...style,
  }
  if (accent && glow) {
    base.boxShadow = `0 0 0 1px ${accents[accent].soft}, 0 14px 40px -20px ${accents[accent].glow}`
  }
  return <div style={base} className={className}>{children}</div>
}

export function Empty({ text }) {
  return <div className="text-center py-8 text-sm text-white/40">{text}</div>
}
