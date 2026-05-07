import { useState } from 'react'
import { Search, X, Check, Banknote, Target, Users, Receipt, ChevronDown } from 'lucide-react'
import { Card } from '../../components/ui'
import { accents, hashAccent, attrAccentKey } from '../../lib/constants'

export default function FilterBar({ used, filters, toggleFilter, clearFilters, totalFiltros, config }) {
  const [open, setOpen] = useState(false)

  const pmAccent = (name) => {
    const card = config.cards.find((c) => c.name === name)
    if (card?.accent) return card.accent
    if (name === 'Pix') return 'emerald'
    if (name === 'Débito') return 'sky'
    return hashAccent(name)
  }
  const catAccent = (name) => config.categories.find((c) => c.name === name)?.accent || 'gold'
  const attrAccent = (name) => attrAccentKey(name, config.attributedTo)
  const isThird = (name) => config.attributedTo.find((a) => a.name === name)?.isMine === false

  const Section = ({ label, dim, items, accentFn, icon: Icon, labelFn }) => {
    if (!items || items.length === 0) return null
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 shrink-0 mr-1">
          <Icon size={11} className="text-white/35" />
          <span className="uppercase text-white/40" style={{ fontSize: '10px', letterSpacing: '0.1em' }}>{label}</span>
        </div>
        {items.map((name) => {
          const a = accents[accentFn(name)] || accents.gold
          const sel = filters[dim].includes(name)
          const label = labelFn ? labelFn(name) : name
          return (
            <button key={name} onClick={() => toggleFilter(dim, name)}
                    className="px-2.5 py-1 rounded-full text-xs transition flex items-center gap-1"
                    style={{ background: sel ? a.hex : a.soft, color: sel ? '#0a0a0c' : a.hex, border: sel ? `1px solid ${a.hex}` : `1px solid ${a.hex}30`, fontWeight: sel ? 600 : 400 }}>
              {sel && <Check size={11} />}{label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2 cursor-pointer select-none" onClick={() => setOpen((o) => !o)}>
        <div className="flex items-center gap-2 text-xs text-white/55">
          <Search size={12} />
          <span className="uppercase" style={{ letterSpacing: '0.12em' }}>Filtrar</span>
          {totalFiltros > 0 && (
            <span className="px-1.5 rounded-full text-xs" style={{ background: accents.gold.soft, color: accents.gold.hex, fontSize: '10px' }}>
              {totalFiltros} ativo{totalFiltros > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {totalFiltros > 0 && (
            <button onClick={(e) => { e.stopPropagation(); clearFilters() }} className="text-xs text-white/55 hover:text-white transition flex items-center gap-1">
              <X size={11} /> limpar
            </button>
          )}
          <ChevronDown size={13} className={`text-white/30 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>
      {open && (
        <div className="space-y-2 mt-3 pt-3 border-t border-white/5">
          <Section label="Pagamento" dim="paymentMethods" items={used.paymentMethods} accentFn={pmAccent} icon={Banknote} />
          <Section label="Categoria" dim="categories" items={used.categories} accentFn={catAccent} icon={Target} />
          <Section label="Atribuído" dim="attributedTo" items={used.attributedTo} accentFn={attrAccent} labelFn={(n) => isThird(n) ? `🤝 ${n}` : n} icon={Users} />
          <Section label="Tipo" dim="types" items={['parcelado', 'fixo', 'recente']} accentFn={(n) => n === 'parcelado' ? 'cyan' : n === 'fixo' ? 'violet' : 'amber'} labelFn={(n) => n === 'parcelado' ? '📦 Parcelado' : n === 'fixo' ? '🔁 Gasto fixo' : '🕐 Recentes'} icon={Receipt} />
        </div>
      )}
    </Card>
  )
}
