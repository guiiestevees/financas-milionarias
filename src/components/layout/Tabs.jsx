import { LayoutDashboard, Wallet, Receipt, Settings } from 'lucide-react'

const TABS = [
  { id: 'painel',   label: 'Painel',        icon: LayoutDashboard },
  { id: 'receitas', label: 'Receitas',       icon: Wallet },
  { id: 'gastos',   label: 'Gastos',         icon: Receipt },
  { id: 'config',   label: 'Configurações',  icon: Settings },
]

export function Tabs({ tab, setTab }) {
  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
      {TABS.map((it) => {
        const Icon = it.icon
        const active = tab === it.id
        return (
          <button
            key={it.id}
            onClick={() => setTab(it.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              active
                ? 'bg-white/10 text-white border border-white/15 shadow-lg'
                : 'text-white/55 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Icon size={15} />
            {it.label}
          </button>
        )
      })}
    </nav>
  )
}
