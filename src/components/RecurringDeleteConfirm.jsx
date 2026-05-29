import { useEffect } from 'react'
import { X, AlertTriangle, Calendar, CalendarX } from 'lucide-react'

// Modal de confirmação ao tentar deletar um gasto fixo (recurring).
// Pergunta se é só desse mês ou pra sempre (a partir desse mês).
//
// Props:
//   despesa: { description, amount } — pra mostrar de qual gasto se trata
//   monthLabel: 'Outubro de 2026' (opcional, pra contextualizar)
//   onChoose: ('this' | 'forever') => void
//   onClose: () => void
export default function RecurringDeleteConfirm({ despesa, monthLabel, onChoose, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const desc = despesa?.description || 'gasto fixo'

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(7,9,18,0.7)', backdropFilter: 'blur(8px)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl w-full max-w-md"
        style={{
          background: 'var(--bg-app-soft)',
          border: '1px solid var(--border-medium)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b" style={{ borderColor: 'var(--border-soft)' }}>
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 rounded-lg shrink-0" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
              <AlertTriangle size={18} />
            </div>
            <div className="min-w-0">
              <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-lg leading-tight">
                Apagar gasto fixo
              </div>
              <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
                {desc}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded transition hover:bg-white/5" style={{ color: 'var(--text-tertiary)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-2.5">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Esse é um gasto fixo que aparece todo mês. Como você quer apagar?
          </p>

          <button
            onClick={() => onChoose('this')}
            className="w-full flex items-start gap-3 p-4 rounded-xl transition text-left hover:opacity-90"
            style={{ background: 'var(--bg-elev1)', border: '1px solid var(--border-medium)' }}
          >
            <div className="p-2 rounded-lg shrink-0" style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}>
              <Calendar size={15} />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-sm">Só desse mês</div>
              <div className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--text-tertiary)' }}>
                Apaga apenas {monthLabel ? <strong>{monthLabel}</strong> : 'esse mês'}. Continua aparecendo
                normalmente nos outros meses.
              </div>
            </div>
          </button>

          <button
            onClick={() => onChoose('forever')}
            className="w-full flex items-start gap-3 p-4 rounded-xl transition text-left hover:opacity-90"
            style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.25)' }}
          >
            <div className="p-2 rounded-lg shrink-0" style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e' }}>
              <CalendarX size={15} />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-sm">Pra sempre (a partir desse mês)</div>
              <div className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--text-tertiary)' }}>
                Apaga {monthLabel && <strong>{monthLabel}</strong>} e todos os meses
                futuros. Os meses anteriores mantêm o histórico.
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="text-sm px-3 py-1.5 rounded transition hover:bg-white/5"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
