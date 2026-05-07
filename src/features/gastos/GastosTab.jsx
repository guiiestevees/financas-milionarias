import { useState, useMemo } from 'react'
import { Plus, X, CheckCircle2, Receipt, Calendar, Sparkles } from 'lucide-react'
import { Card, SectionTitle, Empty, Btn } from '../../components/ui'
import DespesaForm from './DespesaForm'
import DespesaRow from './DespesaRow'
import FilterBar from './FilterBar'
import EditDespesaModal from './EditDespesaModal'
import { uid, fmtBRL, isMineFor } from '../../lib/utils'

export default function GastosTab({ month, setMonth, addDespesaPropagated }) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filters, setFilters] = useState({ paymentMethods: [], categories: [], attributedTo: [], types: [] })
  const cfg = month.config

  const minhas = useMemo(() => month.despesas.filter((d) => isMineFor(d.attributedTo, cfg)), [month.despesas, cfg])
  const terceirosCount = month.despesas.length - minhas.length

  const usedValues = useMemo(() => {
    const pm = new Set(), cat = new Set(), att = new Set()
    month.despesas.forEach((d) => { if (d.paymentMethod) pm.add(d.paymentMethod); if (d.category) cat.add(d.category); if (d.attributedTo) att.add(d.attributedTo) })
    return { paymentMethods: [...pm], categories: [...cat], attributedTo: [...att] }
  }, [month.despesas])

  const filtered = useMemo(() => month.despesas.filter((d) => {
    if (filters.paymentMethods.length > 0 && !filters.paymentMethods.includes(d.paymentMethod)) return false
    if (filters.categories.length > 0 && !filters.categories.includes(d.category)) return false
    if (filters.attributedTo.length > 0 && !filters.attributedTo.includes(d.attributedTo)) return false
    if (filters.types.includes('parcelado') && !(Number(d.installmentTotal) > 1)) return false
    if (filters.types.includes('fixo') && !d.recurring) return false
    return true
  }), [month.despesas, filters])

  const totalFiltros = filters.paymentMethods.length + filters.categories.length + filters.attributedTo.length + filters.types.length
  const filterActive = totalFiltros > 0
  const toggleFilter = (dim, val) => setFilters((f) => { const arr = f[dim] || []; return { ...f, [dim]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] } })
  const clearFilters = () => setFilters({ paymentMethods: [], categories: [], attributedTo: [], types: [] })

  const fixos = useMemo(() => filtered.filter((d) => d.recurring).sort((a, b) => { if (a.paid !== b.paid) return a.paid ? 1 : -1; return (a.dueDay ?? 99) - (b.dueDay ?? 99) }), [filtered])
  const eventuais = useMemo(() => filtered.filter((d) => !d.recurring).sort((a, b) => { if (a.paid !== b.paid) return a.paid ? 1 : -1; if (!a.date && !b.date) return 0; if (!a.date) return 1; if (!b.date) return -1; return b.date.localeCompare(a.date) }), [filtered])

  const sumFixos = fixos.reduce((s, d) => s + Number(d.amount || 0), 0)
  const sumFixosPagos = fixos.filter((d) => d.paid).reduce((s, d) => s + Number(d.amount || 0), 0)
  const sumEventuais = eventuais.reduce((s, d) => s + Number(d.amount || 0), 0)
  const sumEventuaisPagos = eventuais.filter((d) => d.paid).reduce((s, d) => s + Number(d.amount || 0), 0)
  const noConfig = cfg.categories.length === 0 && cfg.attributedTo.length === 0 && cfg.cards.length === 0

  const addDespesa = (d) => {
    if (addDespesaPropagated) { addDespesaPropagated(d) } else { setMonth((m) => ({ ...m, despesas: [{ id: uid(), ...d }, ...m.despesas] })) }
    setAdding(false)
  }
  const updateDespesa = (id, patch) => setMonth((m) => ({ ...m, despesas: m.despesas.map((d) => d.id === id ? { ...d, ...patch } : d) }))
  const removeDespesa = (id) => setMonth((m) => ({ ...m, despesas: m.despesas.filter((d) => d.id !== id) }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, letterSpacing: '-0.01em' }} className="text-2xl">Gastos do mês</h2>
          <p className="text-sm text-white/50 mt-1">
            {month.despesas.length === 0
              ? 'Nenhum gasto ainda. Clique em "Novo gasto" pra começar.'
              : filterActive
                ? `Mostrando ${fixos.length + eventuais.length} de ${month.despesas.length} (filtrado) · ${fmtBRL(sumFixos + sumEventuais)}`
                : `${fixos.length} fixo(s) · ${eventuais.length} eventual(is)${terceirosCount > 0 ? ` · ${terceirosCount} de terceiros (no Painel)` : ''} · ${fmtBRL(sumFixos + sumEventuais)} é seu`}
          </p>
        </div>
        <Btn icon={adding ? X : Plus} onClick={() => setAdding(!adding)}>{adding ? 'Fechar' : 'Novo gasto'}</Btn>
      </div>

      {adding && <DespesaForm config={cfg} onSubmit={addDespesa} onCancel={() => setAdding(false)} />}

      {minhas.length > 0 && <FilterBar used={usedValues} filters={filters} toggleFilter={toggleFilter} clearFilters={clearFilters} totalFiltros={totalFiltros} config={cfg} />}

      {noConfig && month.despesas.length === 0 && !adding && (
        <Card className="p-5" accent="violet">
          <div className="flex items-start gap-3">
            <Sparkles size={18} className="text-amber-300 mt-0.5" />
            <div className="text-sm text-white/75">
              Antes de lançar, talvez queira passar nas <strong>Configurações</strong>: cadastrar seus cartões, quem atribui os gastos e seus orçamentos mensais. Mas pode lançar do jeito que tá também — esses campos são opcionais.
            </div>
          </div>
        </Card>
      )}

      {/* Gastos fixos */}
      <Card className="p-5 sm:p-6" accent="violet" glow>
        <SectionTitle icon={Calendar} title="Gastos fixos"
          subtitle={fixos.length === 0 ? (filterActive ? 'Nenhum fixo bate com os filtros' : 'Marque um gasto como "Gasto fixo" e ele aparece aqui — e se repete todo mês') : `${fixos.filter((d) => !d.paid).length} pendente(s) de ${fixos.length} · ${fmtBRL(sumFixosPagos)} pago / ${fmtBRL(sumFixos - sumFixosPagos)} a pagar`}
          accent="violet"
          action={!filterActive && fixos.some((d) => !d.paid) && (
            <Btn variant="ghost" size="sm" icon={CheckCircle2} onClick={() => setMonth((m) => ({ ...m, despesas: m.despesas.map((d) => d.recurring && !d.paid && isMineFor(d.attributedTo, m.config) ? { ...d, paid: true } : d) }))}>
              Marcar todos pagos
            </Btn>
          )}
        />
        {fixos.length === 0 ? <Empty text={filterActive ? '—' : 'Nenhum gasto fixo neste mês'} /> : (
          <div className="space-y-1.5">
            {fixos.map((d) => (
              <DespesaRow key={d.id} d={d} config={cfg} onTogglePaid={() => updateDespesa(d.id, { paid: !d.paid })} onEdit={() => setEditing(d)} onRemove={() => removeDespesa(d.id)} />
            ))}
            <div className="border-t border-white/5 mt-3 pt-3 flex items-center justify-between text-sm">
              <span className="text-white/50">Total de fixos</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace' }} className="font-semibold tabular-nums">{fmtBRL(sumFixos)}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Gastos eventuais */}
      <Card className="p-5 sm:p-6" accent="cyan">
        <SectionTitle icon={Receipt} title="Gastos eventuais"
          subtitle={eventuais.length === 0 ? (filterActive ? 'Nenhum eventual bate com os filtros' : 'Compras, parcelas, presentes — tudo que aparece só esse mês') : `${eventuais.filter((d) => !d.paid).length} pendente(s) de ${eventuais.length} · ${fmtBRL(sumEventuaisPagos)} pago / ${fmtBRL(sumEventuais - sumEventuaisPagos)} a pagar`}
          accent="cyan"
        />
        {eventuais.length === 0 ? <Empty text={filterActive ? '—' : 'Nenhum gasto eventual neste mês'} /> : (
          <div className="space-y-1.5">
            {eventuais.map((d) => (
              <DespesaRow key={d.id} d={d} config={cfg} onTogglePaid={() => updateDespesa(d.id, { paid: !d.paid })} onEdit={() => setEditing(d)} onRemove={() => removeDespesa(d.id)} />
            ))}
            <div className="border-t border-white/5 mt-3 pt-3 flex items-center justify-between text-sm">
              <span className="text-white/50">Total de eventuais</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace' }} className="font-semibold tabular-nums">{fmtBRL(sumEventuais)}</span>
            </div>
          </div>
        )}
      </Card>

      {editing && <EditDespesaModal despesa={editing} config={cfg} onSave={(patch) => { updateDespesa(editing.id, patch); setEditing(null) }} onClose={() => setEditing(null)} />}
    </div>
  )
}
