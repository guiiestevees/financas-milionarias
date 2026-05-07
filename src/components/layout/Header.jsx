import { useState } from 'react'
import { ChevronLeft, ChevronRight, Sparkles, Pencil, Loader2 } from 'lucide-react'

export function Header({ brand, updateBrand, monthLabel, onPrev, onNext, saving, onSignOut }) {
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState(brand?.name || '')

  const saveName = () => {
    updateBrand({ name: draftName.trim() })
    setEditingName(false)
  }

  const displayName = brand?.name?.trim() || 'Seu nome aqui'
  const subtitle = brand?.subtitle || 'Finanças Milionárias'
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
            <Sparkles size={12} />
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

        <div
          className="flex items-center gap-1 rounded-full p-1 backdrop-blur"
          style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)' }}
        >
          <button onClick={onPrev} className="p-1.5 rounded-full hover:bg-white/10 transition" aria-label="Mês anterior">
            <ChevronLeft size={16} />
          </button>
          <span className="px-3 text-sm font-medium tabular-nums whitespace-nowrap">{monthLabel}</span>
          <button onClick={onNext} className="p-1.5 rounded-full hover:bg-white/10 transition" aria-label="Próximo mês">
            <ChevronRight size={16} />
          </button>
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
