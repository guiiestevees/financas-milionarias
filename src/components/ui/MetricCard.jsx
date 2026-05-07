import { accents } from '../../lib/constants'
import { Card } from './Card'

export function MetricCard({ label, value, icon: Icon, accent, sub, highlight }) {
  const c = accents[accent] || accents.violet
  return (
    <Card
      className="p-4 sm:p-5 relative overflow-hidden"
      style={highlight ? {
        background: `linear-gradient(135deg, ${c.soft}, rgba(255,255,255,0.02))`,
        border: `1px solid ${c.soft}`,
      } : {}}
    >
      <div className="flex items-start justify-between mb-3">
        <div style={{ letterSpacing: '0.18em' }} className="text-xs uppercase text-white/45 truncate">{label}</div>
        <div style={{ background: c.soft, color: c.hex }} className="p-1.5 rounded-lg shrink-0">
          <Icon size={13} />
        </div>
      </div>
      <div
        style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}
        className="text-2xl sm:text-3xl font-medium tabular-nums"
      >
        {value}
      </div>
      {sub && <div className="text-xs text-white/45 mt-1 truncate">{sub}</div>}
    </Card>
  )
}
