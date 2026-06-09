import { useNavigate } from 'react-router-dom'
import { Wallet, CalendarDays, LayoutGrid } from 'lucide-react'

// Switcher compacto entre apps do Domus. Aparece em ambos os headers
// (Finanças e Agenda) pra ser visualmente consistente e óbvio.
//
// Estrutura visual:
//   ┌──────────────────────┐   ┌─────────┐
//   │ [Atual] | [outro]    │   │ ⋮ Menu  │
//   └──────────────────────┘   └─────────┘
//        ↑ pill com 2 ícones      botão pra ver todos os apps (launcher)
//
// Props:
//   currentApp: 'financas' | 'agenda'
export default function AppSwitcher({ currentApp = 'financas' }) {
  const navigate = useNavigate()

  const APPS = {
    financas: {
      label: 'Finanças',
      shortLabel: 'Finanças',
      route: '/app',
      icon: Wallet,
      color: '#c9a961',           // dourado
      colorSoft: 'rgba(201,169,97,0.18)',
      colorBorder: 'rgba(201,169,97,0.40)',
    },
    agenda: {
      label: 'Agenda',
      shortLabel: 'Agenda',
      route: '/agenda',
      icon: CalendarDays,
      color: '#06b6d4',           // ciano
      colorSoft: 'rgba(6,182,212,0.18)',
      colorBorder: 'rgba(6,182,212,0.40)',
    },
  }

  const current = APPS[currentApp]
  const other = currentApp === 'financas' ? APPS.agenda : APPS.financas

  return (
    <div className="flex items-center gap-2">
      {/* PILL: app atual à esquerda (destacado) + outro à direita (clicável) */}
      <div
        className="flex items-center gap-1 p-1 rounded-2xl"
        style={{
          background: 'var(--bg-elev2)',
          border: '1px solid var(--border-soft)',
        }}
      >
        {/* App atual (não clicável, só visual) */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
          style={{
            background: current.colorSoft,
            color: current.color,
            border: `1px solid ${current.colorBorder}`,
          }}
        >
          <current.icon size={14} strokeWidth={2.4} />
          <span className="text-xs font-bold hidden sm:inline">{current.shortLabel}</span>
        </div>

        {/* Outro app (clicável) */}
        <button
          onClick={() => navigate(other.route)}
          title={`Trocar pra ${other.label}`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition hover:opacity-90 active:scale-95"
          style={{
            background: 'transparent',
            color: 'var(--text-tertiary)',
            border: '1px solid transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = other.colorSoft
            e.currentTarget.style.color = other.color
            e.currentTarget.style.borderColor = other.colorBorder
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-tertiary)'
            e.currentTarget.style.borderColor = 'transparent'
          }}
        >
          <other.icon size={14} strokeWidth={2.2} />
          <span className="text-xs font-medium hidden sm:inline">{other.shortLabel}</span>
        </button>
      </div>

      {/* Botão Menu — pequeno, pra ver todos os apps no launcher (Mercado virá depois) */}
      <button
        onClick={() => navigate('/launcher')}
        title="Ver todos os apps"
        className="flex items-center justify-center w-9 h-9 rounded-xl transition hover:opacity-90 active:scale-95 shrink-0"
        style={{
          background: 'var(--bg-elev2)',
          border: '1px solid var(--border-soft)',
          color: 'var(--text-secondary)',
        }}
      >
        <LayoutGrid size={15} strokeWidth={2.2} />
      </button>
    </div>
  )
}
