import { LayoutDashboard, Wallet, Receipt, Landmark, Settings } from 'lucide-react'

const TABS = [
  { id: 'painel',   label: 'Painel',  icon: LayoutDashboard },
  { id: 'receitas', label: 'Entradas', icon: Wallet },
  { id: 'gastos',   label: 'Gastos',  icon: Receipt },
  { id: 'cofres',   label: 'Cofres',  icon: Landmark },
  { id: 'config',   label: 'Ajustes', icon: Settings },
]

// Bottom navigation bar fixa — estilo app nativo iOS/Android.
// Substitui a barra de tabs do topo. Sempre visível na parte inferior
// enquanto o usuário rola a tela.
//
// Detalhes:
//  - Posição: fixed bottom-0, full width
//  - Safe area: padding-bottom respeita iPhone notch/home indicator
//  - 5 itens igualmente espaçados (flex-1)
//  - Item ativo: ícone + label dourados + barra superior dourada fina
//  - Sombra superior sutil pra separar do conteúdo
//  - Labels mais curtos pra caber bem em telas pequenas
export function Tabs({ tab, setTab }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: 'var(--bg-app-soft)',
        borderTop: '1px solid var(--border-soft)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        backdropFilter: 'blur(12px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}
    >
      <div className="max-w-4xl mx-auto flex items-stretch">
        {TABS.map((it) => {
          const Icon = it.icon
          const active = tab === it.id
          return (
            <button
              key={it.id}
              onClick={() => setTab(it.id)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3.5 sm:py-4 transition relative"
              style={{
                color: active ? 'var(--accent-gold)' : 'var(--text-muted)',
                minHeight: 64,  // toque confortável (recomendação Apple/Google: 44-48px mín)
              }}
            >
              {/* Indicador superior do tab ativo */}
              {active && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-10 rounded-full transition-all"
                  style={{ background: 'var(--accent-gold)' }}
                />
              )}
              <Icon size={26} strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[11px] sm:text-[12px] font-medium" style={{ letterSpacing: '0.01em' }}>
                {it.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
