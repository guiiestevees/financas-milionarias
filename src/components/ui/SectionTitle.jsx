import { accents } from '../../lib/constants'

export function SectionTitle({ icon: Icon, title, subtitle, action, accent }) {
  const c = accent ? accents[accent] : null
  return (
    <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {Icon && (
          <div
            style={c ? { background: c.soft, color: c.hex } : {}}
            className={`p-2 rounded-xl shrink-0 ${c ? '' : 'bg-white/5'}`}
          >
            <Icon size={16} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2
            style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }}
            className="text-lg sm:text-xl leading-tight"
          >
            {title}
          </h2>
          {subtitle && <p className="text-xs text-white/50 mt-1 leading-snug">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0 mt-0.5">{action}</div>}
    </div>
  )
}
