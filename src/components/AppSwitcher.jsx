import { useNavigate } from 'react-router-dom'
import { Wallet, CalendarDays, LayoutGrid } from 'lucide-react'

// Switcher compacto entre apps — usado no header de TODOS os apps do Domus.
//
// Visual:
//   ┌────┐ ┌────┐ ┌────┐
//   │ 💰 │ │ 📅 │ │ ⊞  │
//   │Fin.│ │Age.│ │Menu│
//   └────┘ └────┘ └────┘
//   atual  trocar  todos
//
// Cada chip é compacto e tem ícone em cima + label embaixo (sempre visível,
// pra ser intuitivo). Largura fixa pra não causar overflow horizontal.
//
// Props:
//   currentApp: 'financas' | 'agenda'
export default function AppSwitcher({ currentApp = 'financas' }) {
  const navigate = useNavigate()

  const APPS = {
    financas: {
      label: 'Finanças',
      route: '/app',
      icon: Wallet,
      color: '#c9a961',
      colorSoft: 'rgba(201,169,97,0.18)',
      colorBorder: 'rgba(201,169,97,0.45)',
    },
    agenda: {
      label: 'Agenda',
      route: '/agenda',
      icon: CalendarDays,
      color: '#06b6d4',
      colorSoft: 'rgba(6,182,212,0.18)',
      colorBorder: 'rgba(6,182,212,0.45)',
    },
  }

  const current = APPS[currentApp]
  const other = currentApp === 'financas' ? APPS.agenda : APPS.financas

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <AppChip
        icon={<current.icon size={16} strokeWidth={2.3} />}
        label={current.label}
        active
        color={current.color}
        bg={current.colorSoft}
        borderColor={current.colorBorder}
      />
      <AppChip
        icon={<other.icon size={16} strokeWidth={2.1} />}
        label={other.label}
        onClick={() => navigate(other.route)}
        color={other.color}
        hoverBg={other.colorSoft}
        hoverBorder={other.colorBorder}
      />
      <AppChip
        icon={<LayoutGrid size={16} strokeWidth={2.1} />}
        label="Menu"
        onClick={() => navigate('/launcher')}
        color="var(--text-secondary)"
        hoverBg="var(--bg-elev1)"
      />
    </div>
  )
}

// Chip vertical: ícone em cima + label pequeno embaixo
function AppChip({ icon, label, active, onClick, color, bg, borderColor, hoverBg, hoverBorder }) {
  const isButton = !!onClick
  const baseStyle = {
    width: 54,
    minHeight: 44,
    background: active ? bg : 'var(--bg-elev2)',
    border: `1px solid ${active ? borderColor : 'var(--border-soft)'}`,
    color: active ? color : 'var(--text-secondary)',
    transition: 'all 0.15s',
    padding: '5px 4px 4px',
  }

  const handleMouseEnter = (e) => {
    if (!isButton || active) return
    e.currentTarget.style.background = hoverBg || 'var(--bg-elev1)'
    if (hoverBorder) e.currentTarget.style.borderColor = hoverBorder
    e.currentTarget.style.color = color
  }
  const handleMouseLeave = (e) => {
    if (!isButton || active) return
    e.currentTarget.style.background = 'var(--bg-elev2)'
    e.currentTarget.style.borderColor = 'var(--border-soft)'
    e.currentTarget.style.color = 'var(--text-secondary)'
  }

  const Inner = (
    <>
      {icon}
      <span
        className="text-[10px] font-semibold mt-0.5 leading-none whitespace-nowrap"
        style={{ letterSpacing: '0.01em' }}
      >
        {label}
      </span>
    </>
  )

  if (isButton) {
    return (
      <button
        onClick={onClick}
        title={`Trocar pra ${label}`}
        className="flex flex-col items-center justify-center rounded-xl active:scale-95"
        style={{ ...baseStyle, cursor: 'pointer' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {Inner}
      </button>
    )
  }

  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl"
      style={baseStyle}
      title={label}
    >
      {Inner}
    </div>
  )
}
