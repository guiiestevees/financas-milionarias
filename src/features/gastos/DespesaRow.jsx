import { AlertTriangle, CheckCircle2, Circle, CreditCard, Banknote, Calendar, Bell, Pencil, Trash2 } from 'lucide-react'
import { accents, hashAccent, attrAccentKey } from '../../lib/constants'
import { fmtBRL, dueDayStatus } from '../../lib/utils'

export default function DespesaRow({ d, config, activeMonth, onTogglePaid, onEdit, onRemove }) {
  const cardObj = config.cards.find((c) => c.name === d.paymentMethod)
  const catObj = config.categories.find((c) => c.name === d.category)
  const pmAccent = cardObj?.accent || (d.paymentMethod === 'Pix' ? 'emerald' : d.paymentMethod === 'Débito' ? 'sky' : d.paymentMethod ? hashAccent(d.paymentMethod) : 'sky')
  const pmA = accents[pmAccent]
  const catA = catObj ? accents[catObj.accent] : null
  const attA = d.attributedTo ? accents[attrAccentKey(d.attributedTo, config.attributedTo)] : null
  const status = dueDayStatus(activeMonth, d.dueDay)
  const overdue = !d.paid && status.overdue && !cardObj
  const dueToday = !d.paid && status.isToday

  let bg = d.paid ? 'var(--bg-elev2)' : 'var(--bg-elev1)'
  let border = '1px solid transparent'
  if (overdue) { bg = 'rgba(244,63,94,0.06)'; border = `1px solid ${accents.rose.hex}40` }
  else if (dueToday) { bg = 'rgba(245,158,11,0.06)'; border = `1px solid ${accents.amber.hex}40` }

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg group transition" style={{ background: bg, border, opacity: d.paid ? 0.7 : 1 }}>
      <button onClick={onTogglePaid} title={d.paid ? 'Marcar como pendente' : 'Dar baixa'} className="shrink-0 transition hover:scale-110">
        {d.paid ? <CheckCircle2 size={22} className="text-emerald-400" /> : overdue ? <AlertTriangle size={22} className="text-rose-400 hover:text-emerald-400 transition" /> : <Circle size={22} className="text-white/30 hover:text-emerald-400 transition" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className={`font-medium truncate ${d.paid ? 'line-through text-white/50' : ''}`}>{d.description || '—'}</div>
        <div className="text-xs flex items-center gap-2 flex-wrap mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {overdue && <span className="px-1.5 py-0.5 rounded font-medium flex items-center gap-1" style={{ background: accents.rose.soft, color: accents.rose.hex }}><AlertTriangle size={10} /> atrasada</span>}
          {dueToday && <span className="px-1.5 py-0.5 rounded font-medium flex items-center gap-1" style={{ background: accents.amber.soft, color: accents.amber.hex }}><Bell size={10} /> vence hoje</span>}
          {d.dueDay && !overdue && !dueToday && <span className="flex items-center gap-1"><Calendar size={10} /> dia {d.dueDay}</span>}
          {d.installmentTotal > 1 && <span className="px-1.5 py-0.5 rounded bg-white/5 text-white/55 tabular-nums">parcela {d.installmentCurrent}/{d.installmentTotal}</span>}
          {catObj && catA && <span className="px-1.5 py-0.5 rounded" style={{ background: catA.soft, color: catA.hex }}>{d.category}</span>}
          {d.attributedTo && attA && <span className="px-1.5 py-0.5 rounded" style={{ background: attA.soft, color: attA.hex }}>{d.attributedTo}</span>}
        </div>
      </div>
      {d.paymentMethod && (
        <div className="shrink-0 hidden sm:block">
          <span className="text-xs px-2 py-1 rounded inline-flex items-center gap-1" style={{ background: pmA.soft, color: pmA.hex, border: `1px solid ${pmA.hex}25` }}>
            {cardObj ? <CreditCard size={11} /> : <Banknote size={11} />}{d.paymentMethod}
          </span>
        </div>
      )}
      <div className="shrink-0 text-right">
        <div style={{ fontFamily: 'JetBrains Mono, monospace' }} className={`tabular-nums font-semibold whitespace-nowrap ${d.paid ? 'text-white/55' : ''}`}>{fmtBRL(d.amount)}</div>
        <div className="text-xs sm:hidden mt-0.5">{d.paymentMethod && <span style={{ color: pmA.hex }}>{d.paymentMethod}</span>}</div>
      </div>
      <div className="shrink-0 flex gap-0.5">
        <button onClick={onEdit} className="p-1.5 rounded text-white/40 hover:text-amber-300 hover:bg-white/5 transition" title="Editar"><Pencil size={13} /></button>
        <button onClick={onRemove} className="p-1.5 rounded text-white/40 hover:text-rose-400 hover:bg-white/5 transition" title="Remover"><Trash2 size={13} /></button>
      </div>
    </div>
  )
}
