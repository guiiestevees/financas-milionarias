import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ChevronDown, Calendar, Pencil, Loader2, ShieldCheck } from 'lucide-react'
import { useIsAdmin } from '../../hooks/useIsAdmin'
import AppSwitcher from '../AppSwitcher'

const MONTH_LABELS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function MonthPicker({ activeMonth, onJumpTo, onClose }) {
  const today = new Date()
  const todayYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const [year, setYear] = useState(() => Number(activeMonth?.slice(0, 4)) || today.getFullYear())
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

  const goToday = () => {
    onJumpTo(todayYM)
    onClose()
  }

  const goPrevMonth = () => {
    const d = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    onJumpTo(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
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
          background: 'var(--bg-elev1)',
          border: '1px solid rgba(212,175,55,0.25)',
          borderRadius: 16,
          padding: 16,
          width: '100%',
          maxWidth: 340,
          boxShadow: '0 20px 60px -10px rgba(0,0,0,0.6)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Atalhos rápidos */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={goToday}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition"
            style={{
              background: 'rgba(212,175,55,0.12)',
              border: '1px solid rgba(212,175,55,0.3)',
              color: '#d4af37',
            }}
          >
            Hoje
          </button>
          <button
            onClick={goPrevMonth}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition hover:bg-white/5"
            style={{
              background: 'var(--bg-elev2)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-secondary)',
            }}
          >
            Mês passado
          </button>
        </div>

        {/* Seletor de ano */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="p-2 rounded-lg hover:bg-white/5 transition"
            aria-label="Ano anterior"
            style={{ minWidth: 40, minHeight: 40 }}
          >
            <ChevronLeft size={18} className="mx-auto" style={{ color: 'var(--text-secondary)' }} />
          </button>
          <span style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-medium tabular-nums">{year}</span>
          <button
            onClick={() => setYear((y) => y + 1)}
            className="p-2 rounded-lg hover:bg-white/5 transition"
            aria-label="Próximo ano"
            style={{ minWidth: 40, minHeight: 40 }}
          >
            <ChevronRight size={18} className="mx-auto" style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Grid de meses */}
        <div className="grid grid-cols-3 gap-2">
          {MONTH_LABELS_SHORT.map((label, idx) => {
            const isActive = year === activeY && (idx + 1) === activeM
            const isToday = year === today.getFullYear() && idx === today.getMonth()
            return (
              <button
                key={idx}
                onClick={() => pick(idx)}
                className="py-3 rounded-lg text-sm font-medium transition relative"
                style={isActive
                  ? { background: 'rgba(212,175,55,0.2)', color: 'var(--accent-gold)', border: '1px solid rgba(212,175,55,0.5)' }
                  : { background: 'var(--bg-elev2)', color: 'var(--text-secondary)', border: '1px solid var(--border-soft)' }
                }
              >
                {label}
                {isToday && !isActive && (
                  <span
                    className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                    style={{ background: '#d4af37' }}
                  />
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-4 text-center text-[11px] text-white/35">
          ESC para fechar
        </div>
      </div>
    </div>
  )
}

export function Header({ brand, updateBrand, monthLabel, activeMonth, onPrev, onNext, onJumpTo, saving }) {
  const navigate = useNavigate()
  const { isAdmin } = useIsAdmin()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState(brand?.name || '')

  const saveName = () => {
    updateBrand({ name: draftName.trim() })
    setEditingName(false)
  }

  const displayName = brand?.name?.trim() || 'Seu nome aqui'
  // Nome do app é fixo: "Domus App". Apenas o nome do usuário é editável.
  const hasName = !!brand?.name?.trim()

  return (
    <header className="mb-10">
      {/* Linha 1: AppSwitcher alinhado à direita */}
      <div className="flex justify-end mb-7">
        <AppSwitcher currentApp="financas" />
      </div>

      {/* HERO central — visual harmônico tipo capa */}
      <div className="flex flex-col items-center text-center">
        {/* Brand (nome do usuário) — discreto, com logo */}
        {editingName ? (
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
              fontSize: '11px',
            }}
            className="px-3 py-1.5 rounded-full uppercase tracking-widest focus:outline-none placeholder:text-white/30 mb-4"
          />
        ) : (
          <button
            onClick={() => { setEditingName(true); setDraftName(brand?.name || '') }}
            style={{ letterSpacing: '0.32em', color: 'rgba(212,175,55,0.8)' }}
            className={`group flex items-center gap-2.5 text-[11px] uppercase font-semibold mb-4 hover:opacity-90 transition ${!hasName ? 'opacity-50' : ''}`}
          >
            <img src="/domus-logo-512.png" alt="" style={{ width: 16, height: 16, objectFit: 'contain', opacity: 0.85 }} />
            <span className="truncate max-w-[60vw]">{displayName}</span>
            <Pencil size={9} className="opacity-0 group-hover:opacity-60 transition shrink-0" />
          </button>
        )}

        {/* Título dominante */}
        <h1
          style={{
            fontFamily: 'Fraunces, serif',
            fontWeight: 500,
            letterSpacing: '-0.025em',
            lineHeight: 1,
          }}
          className="text-5xl sm:text-6xl mb-1"
        >
          Domus{' '}
          <em style={{
            fontStyle: 'italic',
            background: 'linear-gradient(135deg,#f4e4a8,#d4af37 45%,#8b6f2f)',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
          }}>
            App.
          </em>
        </h1>

        {/* Divisor fino dourado */}
        <div
          className="my-5"
          style={{
            width: 72,
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.6), transparent)',
          }}
        />

        {/* Mês picker — elemento de controle principal, centralizado e grande */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
        {saving && (
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <Loader2 size={12} className="animate-spin" style={{ color: '#d4af37' }} />
            <span>salvando</span>
          </div>
        )}

        {/* Botão Admin — só pra emails listados em VITE_ADMIN_EMAILS */}
        {isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            title="Painel administrativo"
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl transition hover:opacity-90"
            style={{
              background: 'rgba(212,175,55,0.08)',
              border: '1px solid rgba(212,175,55,0.28)',
              color: '#d4af37',
            }}
          >
            <ShieldCheck size={14} />
            <span className="text-xs font-medium hidden sm:inline">Admin</span>
          </button>
        )}

        {/* Seletor de mês */}
        <div className="relative">
          <div
            className="flex items-center gap-0.5 rounded-2xl p-1 backdrop-blur"
            style={{
              background: 'rgba(212,175,55,0.08)',
              border: '1px solid rgba(212,175,55,0.28)',
              boxShadow: '0 4px 12px rgba(212,175,55,0.06)',
            }}
          >
            <button
              onClick={onPrev}
              className="rounded-xl hover:bg-white/10 active:bg-white/15 transition flex items-center justify-center"
              aria-label="Mês anterior"
              style={{ minWidth: 40, minHeight: 40 }}
            >
              <ChevronLeft size={18} />
            </button>

            <button
              onClick={() => setPickerOpen((o) => !o)}
              className="flex items-center gap-2 px-3 sm:px-4 text-sm sm:text-base font-medium tabular-nums whitespace-nowrap rounded-xl hover:bg-white/10 active:bg-white/15 transition"
              title="Escolher mês"
              style={{ minHeight: 40 }}
            >
              <Calendar size={15} className="opacity-70 shrink-0" />
              <span>{monthLabel}</span>
              <ChevronDown
                size={14}
                className="opacity-60 shrink-0 transition-transform"
                style={{ transform: pickerOpen ? 'rotate(180deg)' : 'none' }}
              />
            </button>

            <button
              onClick={onNext}
              className="rounded-xl hover:bg-white/10 active:bg-white/15 transition flex items-center justify-center"
              aria-label="Próximo mês"
              style={{ minWidth: 40, minHeight: 40 }}
            >
              <ChevronRight size={18} />
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
        </div>
      </div>
    </header>
  )
}
