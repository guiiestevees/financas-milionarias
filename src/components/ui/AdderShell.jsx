import { accents } from '../../lib/constants'

export function AdderShell({ children, accent = 'violet', title }) {
  const a = accents[accent] || accents.violet
  return (
    <div
      className="rounded-lg p-3 mb-3 space-y-2"
      style={{ background: a.soft, border: `1px solid color-mix(in srgb, ${a.hex} 19%, transparent)` }}
    >
      {title && (
        <div className="text-xs uppercase mb-2" style={{ color: a.hex, letterSpacing: '0.08em' }}>
          {title}
        </div>
      )}
      {children}
    </div>
  )
}
