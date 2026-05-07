import { Check } from 'lucide-react'
import { accents } from '../../lib/constants'

export function ModePicker({ value, onChange, options }) {
  return (
    <div
      className="flex flex-col gap-1.5 p-1.5 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {options.map((opt) => {
        const sel = value === opt.value
        const a = accents[opt.accent] || accents.violet
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              background: sel ? a.soft : 'transparent',
              color: sel ? a.hex : 'rgba(255,255,255,0.65)',
              border: sel ? `1px solid ${a.hex}50` : '1px solid transparent',
              boxShadow: sel ? `0 4px 14px -6px ${a.glow}` : 'none',
            }}
            className="px-3 py-2.5 rounded-lg text-left transition-all flex items-center gap-3 w-full"
          >
            {Icon && (
              <div
                className="shrink-0 p-1.5 rounded-md"
                style={{ background: sel ? `${a.hex}20` : 'rgba(255,255,255,0.04)' }}
              >
                <Icon size={14} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm">{opt.label}</div>
              {opt.description && (
                <div className="text-xs" style={{ color: sel ? `${a.hex}cc` : 'rgba(255,255,255,0.4)' }}>
                  {opt.description}
                </div>
              )}
            </div>
            {sel && (
              <div
                className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: a.hex }}
              >
                <Check size={12} className="text-white" strokeWidth={3} />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
