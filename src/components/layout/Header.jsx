import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Sparkles, Pencil, Loader2 } from 'lucide-react'

const MONTH_LABELS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function MonthPicker({ activeMonth, onJumpTo, onClose }) {
  const [year, setYear] = useState(() => Number(activeMonth?.slice(0, 4)) || new Date().getFullYear())
  const activeY = Number(activeMonth?.slice(0, 4))
  const activeM = Number(activeMonth?.slice(5, 7))

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const pick = (mIdx) => {
    const m = String(mIdx + 1).padStart(2, '0')
    onJumpTo(`${year}-${m}`)
    onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{ background: 'rgba(7,9,18,0.7)', backdropFilter: 'blur(8px)' }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, #0f1525, #0a0d18)',
          border: '1px solid rgba(212,175,55,0.25)',
          borderRadius: 16,
          padding: 16,
          width: '100%',
          maxWidth: 320,
          boxShadow: '0 20px 60px -10px rgba(0,0,0,0.6)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setYear((y) => y - 1)} className="p-2 rounded-lg hover:bg-white/5 transition" aria-label="Ano anterior">
            <ChevronLeft size={16} className="text-white/55" />
          </button>
          <span style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-medium tabular-nums">{year}</span>
          <button onClick={() => setYear((y) => y + 1)} className="p-2 rounded-lg hover:bg-white/5 transition" aria-label="Próximo ano">
            <ChevronRight size={16} className="text-white/55" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MONTH_LABELS_SHORT.map((label, idx) => {
            const isActive = year === activeY && (idx + 1) === activeM
            return (
              <button
                key={idx}
                onClick={() => pick(idx)}
                className="py-3 rounded-lg text-sm font-medium transition"
                style={isActive
                  ? { background: 'rgba(212,175,55,0.2)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.5)' }
                  : { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.05)' }
                }
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function Header({ brand, updateBrand, monthLabel, activeMonth, onPrev, onNext, onJumpTo, saving, onSignOut }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState(brand?.name || '')

  const saveName = () => {
    updateBrand({ name: draftName.trim() })
    setEditingName(false)
  }

  const displayName = brand?.name?.trim() || 'Seu nome aqui'
  const subtitle = brand?.subtitle || 'Domus'
  const hasName = !!brand?.name?.trim()

  return (
    <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
      <div className="min-w-0">
        {editingName ? (
          <div className="flex items-center gap-2 mb-2">
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveName()
                if (e.key === 'Escape') { setEditingName(false); setDraftName(brand?.name || '') }
              }}
              placeholder="Seu nome"
              style={{
                background: 'rgba(212,175,55,0.08)',
                border: '1px solid rgba(212,175,55,0.4)',
                color: '#d4af37',
                letterSpacing: '0.25em',
                fontSize: '12px',
              }}
              className="px-3 py-1 rounded-full uppercase tracking-widest focus:outline-none placeholder:text-white/30"
            />
          </div>
        ) : (
          <button
            onClick={() => { setEditingName(true); setDraftName(brand?.name || '') }}
            style={{ letterSpacing: '0.25em', color: '#d4af37' }}
            className={`group flex items-center gap-2 text-xs uppercase mb-2 hover:opacity-80 transition ${!hasName ? 'opacity-60' : ''}`}
          >
            <img src="/domus-logo-512.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
            <span>{displayName}</span>
            <Pencil size={10} className="opacity-0 group-hover:opacity-60 transition" />
          </button>
        )}

        <h1
          style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, letterSpacing: '-0.02em' }}
          className="text-4xl sm:text-5xl text-white"
        >
          {(() => {
            const parts = subtitle.trim().split(/\s+/)
            if (parts.length < 2) {
              return (
                <em style={{ fontStyle: 'italic', background: 'linear-gradient(90deg,#f4d676,#d4af37,#a87f1f)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
                  {subtitle}.
                </em>
              )
            }
            const last = parts.pop()
            const head = parts.join(' ')
            return (
              <>
                {head}{' '}
                <em style={{ fontStyle: 'italic', background: 'linear-gradient(90deg,#f4d676,#d4af37,#a87f1f)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
                  {last}.
                </em>
              </>
            )
          })()}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {saving && (
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <Loader2 size={12} className="animate-spin" style={{ color: '#d4af37' }} />
            <span>salvando</span>
          </div>
        )}

        <div className="relative">
          <div
            className="flex items-center gap-1 rounded-full p-1 backdrop-blur"
            style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)' }}
          >
            <button onClick={onPrev} className="p-1.5 rounded-full hover:bg-white/10 transition" aria-label="Mês anterior">
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPickerOpen((o) => !o)}
              className="px-3 text-sm font-medium tabular-nums whitespace-nowrap rounded-full hover:bg-white/10 transition py-0.5"
              title="Escolher mês"
            >
              {monthLabel}
            </button>
            <button onClick={onNext} className="p-1.5 rounded-full hover:bg-white/10 transition" aria-label="Próximo mês">
              <ChevronRight size={16} />
            </button>
          </div>
          {pickerOpen && (
            <MonthPicker
              activeMonth={activeMonth}
              onJumpTo={(ym) => { if (onJumpTo) onJumpTo(ym) }}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>

        {onSignOut && (
          <button
            onClick={onSignOut}
            className="text-xs text-white/30 hover:text-white/60 transition px-2 py-1 rounded"
            title="Sair"
          >
            sair
          </button>
        )}
      </div>
    </header>
  )
}
