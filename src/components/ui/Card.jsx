import { accents } from '../../lib/constants'

export function Card({ children, className = '', accent, glow = false, style = {} }) {
  const base = {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: 18,
    backdropFilter: 'blur(8px)',
    ...style,
  }
  if (accent && glow) {
    base.boxShadow = `0 0 0 1px ${accents[accent].soft}, 0 14px 40px -20px ${accents[accent].glow}`
  }
  return <div style={base} className={className}>{children}</div>
}

// Empty state — pode ser usado de forma simples (só texto) ou rica
// (com ícone, descrição e botão de ação)
export function Empty({ text, icon: Icon, description, action, accent = 'gold' }) {
  // Modo simples: só texto (legado)
  if (!Icon && !description && !action) {
    return <div className="text-center py-8 text-sm text-white/40">{text}</div>
  }

  const a = accents[accent] || accents.gold

  // Modo rico: ícone + título + descrição + CTA
  return (
    <div className="text-center py-8 px-4">
      {Icon && (
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3"
          style={{ background: a.soft, color: a.hex }}>
          <Icon size={20} />
        </div>
      )}
      <div className="font-medium text-white/80 text-sm mb-1">{text}</div>
      {description && (
        <div className="text-xs text-white/45 leading-relaxed max-w-xs mx-auto mb-4">{description}</div>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition"
          style={{
            background: a.soft,
            color: a.hex,
            border: `1px solid ${a.hex}30`,
          }}
        >
          {action.icon ? <action.icon size={14} /> : null}
          {action.label}
        </button>
      )}
    </div>
  )
}
