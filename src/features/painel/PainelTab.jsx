import { useState, useMemo } from 'react'
import {
  Sparkles, ArrowUpRight, ArrowDownRight, CreditCard, Users, Target,
  Banknote, Bell, Check, Circle, AlertTriangle, CheckCircle2, Calendar,
  X, Plus, Pencil, Trash2,
} from 'lucide-react'
import { Card, Empty, SectionTitle, MetricCard } from '../../components/ui'
import EditDespesaModal from '../gastos/EditDespesaModal'
import { accents, hashAccent, attrAccentKey } from '../../lib/constants'
import { fmtBRL, todayDay, isMineFor, uid } from '../../lib/utils'

// ---------- aggregations ----------
function useMonthAggregates(month) {
  return useMemo(() => {
    const cfg = month.config
    const cardNames = cfg.cards.map((c) => c.name)
    const minhas = month.despesas.filter((d) => isMineFor(d.attributedTo, cfg))
    const terceiros = month.despesas.filter((d) => !isMineFor(d.attributedTo, cfg))
    const totalReceitas = month.receitas.reduce((s, r) => s + Number(r.amount || 0), 0)
    const totalDespesas = minhas.reduce((s, d) => s + Number(d.amount || 0), 0)
    const totalPago = minhas.filter((d) => d.paid).reduce((s, d) => s + Number(d.amount || 0), 0)
    const totalAPagar = totalDespesas - totalPago
    const sobra = totalReceitas - totalDespesas

    const totalAReceber = terceiros.filter((d) => !d.reimbursed).reduce((s, d) => s + Number(d.amount || 0), 0)
    const aReceberByPessoa = {}
    terceiros.forEach((d) => {
      const k = d.attributedTo || '—'
      aReceberByPessoa[k] = aReceberByPessoa[k] || { name: k, pending: 0, items: [] }
      if (!d.reimbursed) aReceberByPessoa[k].pending += Number(d.amount || 0)
      aReceberByPessoa[k].items.push(d)
    })
    const aReceberList = Object.values(aReceberByPessoa).map((p) => ({ ...p, accent: attrAccentKey(p.name, cfg.attributedTo) })).sort((a, b) => b.pending - a.pending)

    const byPayment = {}
    cfg.paymentMethods.forEach((pm) => { byPayment[pm] = 0 })
    minhas.forEach((d) => { const k = d.paymentMethod || '—'; byPayment[k] = (byPayment[k] || 0) + Number(d.amount || 0) })

    const byCard = cfg.cards.map((c) => {
      const items = minhas.filter((d) => d.paymentMethod === c.name)
      const total = items.reduce((s, d) => s + Number(d.amount || 0), 0)
      const aPagar = items.filter((d) => !d.paid).reduce((s, d) => s + Number(d.amount || 0), 0)
      return { name: c.name, accent: c.accent, dueDay: c.dueDay ? Number(c.dueDay) : null, total, aPagar, count: items.length, items }
    }).filter((c) => c.count > 0 || c.total > 0)
    const totalCards = byCard.reduce((s, c) => s + c.total, 0)

    const cashMethods = cfg.paymentMethods.filter((pm) => !cardNames.includes(pm))
    const aVista = cashMethods.map((m) => ({ name: m, total: byPayment[m] || 0 })).filter((m) => m.total > 0)
    const totalAVista = aVista.reduce((s, m) => s + m.total, 0)

    const myAttributed = cfg.attributedTo.filter((a) => a?.isMine !== false)
    const byAttributed = {}
    myAttributed.forEach((a) => { byAttributed[a.name] = 0 })
    minhas.forEach((d) => { const k = d.attributedTo || '—'; byAttributed[k] = (byAttributed[k] || 0) + Number(d.amount || 0) })
    const attributedList = Object.entries(byAttributed).map(([name, total]) => ({ name, total, accent: attrAccentKey(name, cfg.attributedTo) })).sort((a, b) => b.total - a.total)

    const byCategory = {}
    cfg.categories.forEach((c) => { byCategory[c.name] = 0 })
    minhas.forEach((d) => { const k = d.category || 'Sem categoria'; byCategory[k] = (byCategory[k] || 0) + Number(d.amount || 0) })
    const categoryList = cfg.categories.map((c) => ({ ...c, spent: byCategory[c.name] || 0 }))
    const orcamentoReservado = categoryList.filter((c) => c.budget && c.budget > 0).reduce((s, c) => s + Math.max(0, c.budget - c.spent), 0)
    const disponivel = sobra - orcamentoReservado

    return {
      totalReceitas, totalDespesas, sobra, totalCards, totalAVista,
      totalPago, totalAPagar, totalAReceber, orcamentoReservado, disponivel,
      byCard, aVista, attributedList, categoryList, aReceberList,
      terceirosCount: terceiros.length,
    }
  }, [month])
}

// ---------- HeroBalance ----------
function HeroBalance({ agg }) {
  const semDados = agg.totalReceitas === 0 && agg.totalDespesas === 0
  const temReserva = agg.orcamentoReservado > 0
  const valorPrimario = temReserva ? agg.disponivel : agg.sobra
  const positivo = valorPrimario >= 0
  const heroColor = positivo ? accents.emerald : accents.rose
  const labelPrimario = temReserva
    ? (positivo ? 'Disponível pra gastar' : 'Vai estourar o mês')
    : (positivo ? 'Sobra do mês' : 'Estouro do mês')

  return (
    <Card className="p-6 sm:p-8 relative overflow-hidden" style={{
      background: `linear-gradient(135deg, ${heroColor.soft}, rgba(255,255,255,0.02) 60%)`,
      border: `1px solid ${heroColor.hex}30`,
      boxShadow: `0 20px 60px -25px ${heroColor.glow}`,
    }}>
      <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full pointer-events-none"
           style={{ background: `radial-gradient(circle, ${heroColor.hex}22, transparent 70%)` }} />
      <div className="relative">
        <div className="flex items-center gap-2 text-xs uppercase text-white/55 mb-3" style={{ letterSpacing: '0.22em' }}>
          <Sparkles size={12} style={{ color: heroColor.hex }} />
          <span>{labelPrimario}</span>
        </div>
        <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, letterSpacing: '-0.03em', color: heroColor.hex }}
             className="text-5xl sm:text-6xl tabular-nums leading-none">
          {fmtBRL(Math.abs(valorPrimario))}
        </div>
        {semDados ? (
          <div className="text-sm text-white/55 mt-3">Adicione receitas e gastos pra ver o quanto sobra</div>
        ) : temReserva ? (
          <div className="mt-4 space-y-2">
            <div className="text-sm text-white/65">
              {positivo ? <>Pode gastar livre com coisas <em>fora</em> dos orçamentos.</> : <>Vai faltar mesmo gastando só o que tá orçado. Considere ajustar.</>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/[0.08]">
              <BreakdownItem label="Sobra real" value={agg.sobra} hint="receita − gastos lançados" emphasis />
              <BreakdownItem label="Reservado em orçamentos" value={-agg.orcamentoReservado} hint="ainda não gasto" accent="amber" />
              <BreakdownItem label="Disponível" value={agg.disponivel} hint="o que sobra de verdade" accent={positivo ? 'emerald' : 'rose'} emphasis />
            </div>
          </div>
        ) : (
          <div className="text-sm text-white/55 mt-3">
            {positivo
              ? `${fmtBRL(agg.totalReceitas)} de receita − ${fmtBRL(agg.totalDespesas)} de despesa`
              : `Despesa de ${fmtBRL(agg.totalDespesas)} passou da receita de ${fmtBRL(agg.totalReceitas)}`}
          </div>
        )}
      </div>
    </Card>
  )
}

function BreakdownItem({ label, value, hint, accent, emphasis }) {
  const isNegative = value < 0
  const c = accent ? accents[accent] : null
  const color = c ? c.hex : (emphasis ? 'white' : 'rgba(255,255,255,0.7)')
  return (
    <div>
      <div className="uppercase text-white/45 mb-1" style={{ fontSize: '10px', letterSpacing: '0.12em' }}>{label}</div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', color, fontWeight: emphasis ? 600 : 500 }} className="tabular-nums text-base sm:text-lg">
        {isNegative ? '−' : ''}{fmtBRL(Math.abs(value))}
      </div>
      {hint && <div className="text-xs text-white/40 mt-0.5">{hint}</div>}
    </div>
  )
}

// ---------- CardsPanel ----------
function CardsPanel({ cards, setMonth }) {
  const totalAPagar = cards.reduce((s, c) => s + c.aPagar, 0)
  const today = todayDay()
  const sorted = [...cards].sort((a, b) => {
    if (!a.dueDay && !b.dueDay) return b.total - a.total
    if (!a.dueDay) return 1
    if (!b.dueDay) return -1
    const da = a.dueDay >= today ? a.dueDay - today : 100 + a.dueDay
    const db = b.dueDay >= today ? b.dueDay - today : 100 + b.dueDay
    return da - db
  })

  const markAll = (items, paid) => {
    const ids = new Set(items.map((i) => i.id))
    setMonth((m) => ({ ...m, despesas: m.despesas.map((d) => ids.has(d.id) ? { ...d, paid } : d) }))
  }

  return (
    <Card className="p-4 sm:p-6" accent="violet">
      <SectionTitle icon={CreditCard} title="Faturas dos cartões" subtitle={totalAPagar > 0 ? `${fmtBRL(totalAPagar)} a pagar` : 'tudo quitado'} accent="violet" />
      {cards.length === 0 ? <Empty text="Nenhuma despesa em cartão neste mês" /> : (
        <div className="space-y-3">
          {sorted.map((c) => {
            const a = accents[c.accent] || accents.cyan
            const isToday = c.dueDay === today && c.aPagar > 0
            const pct = c.total > 0 ? ((c.total - c.aPagar) / c.total) * 100 : 0
            const isPaid = c.aPagar === 0 && c.total > 0
            const dueMsg = !c.dueDay ? 'sem vencimento cadastrado' : isToday ? `vence HOJE (dia ${c.dueDay})` : `vence dia ${c.dueDay}`
            const dueColor = isToday ? 'text-amber-300' : 'text-white/55'
            return (
              <div key={c.name} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.025)' }}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div style={{ background: a.soft, color: a.hex }} className="p-1.5 rounded-md shrink-0"><CreditCard size={14} /></div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{c.name}</div>
                      <div className={`text-xs flex items-center gap-1 ${dueColor}`}><Calendar size={10} />{dueMsg}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', color: isPaid ? accents.emerald.hex : a.hex }} className="font-semibold tabular-nums">{fmtBRL(c.total)}</div>
                    <div className="uppercase text-white/40" style={{ letterSpacing: '0.1em', fontSize: '10px' }}>fatura</div>
                  </div>
                </div>
                {c.total > 0 && (
                  <div className="h-1 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full" style={{ width: `${pct}%`, background: isPaid ? accents.emerald.hex : a.hex }} />
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/45">{isPaid ? 'fatura paga ✓' : c.aPagar < c.total ? `${fmtBRL(c.aPagar)} ainda em aberto` : `${c.count} compra${c.count !== 1 ? 's' : ''} no mês`}</span>
                  {isPaid
                    ? <button onClick={() => markAll(c.items, false)} className="text-white/45 hover:text-white/70 transition">desfazer</button>
                    : <button onClick={() => markAll(c.items, true)} className="px-2.5 py-1 rounded-md text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 transition flex items-center gap-1"><Check size={11} /> Fatura paga</button>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

// ---------- AReceberPanel ----------
function AReceberPanel({ list, total, setMonth, onEdit, onRemove }) {
  const toggle = (id) => setMonth((m) => ({ ...m, despesas: m.despesas.map((d) => d.id === id ? { ...d, reimbursed: !d.reimbursed } : d) }))
  const markAll = (name) => setMonth((m) => ({ ...m, despesas: m.despesas.map((d) => d.attributedTo === name && !d.reimbursed ? { ...d, reimbursed: true } : d) }))

  return (
    <Card className="p-4 sm:p-6" accent="amber" glow>
      <SectionTitle icon={Users} title="A receber de terceiros" subtitle={total > 0 ? `${fmtBRL(total)} pendente · marque quando te pagarem` : 'tudo recebido 🎯'} accent="amber" />
      <div className="space-y-3">
        {list.map((p) => {
          const a = accents[p.accent] || accents.gold
          const allPaid = p.pending === 0
          const sorted = [...p.items].sort((a, b) => (a.reimbursed === b.reimbursed ? 0 : a.reimbursed ? 1 : -1))
          return (
            <div key={p.name} className="p-3 rounded-lg" style={{ background: a.soft, border: `1px solid ${a.hex}25` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: a.hex }} />
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-white/40">({p.items.length} {p.items.length === 1 ? 'item' : 'itens'})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', color: allPaid ? accents.emerald.hex : a.hex }} className="font-semibold tabular-nums">{fmtBRL(p.pending > 0 ? p.pending : p.items.reduce((s, d) => s + Number(d.amount || 0), 0))}</span>
                  {!allPaid && <button onClick={() => markAll(p.name)} className="text-xs px-2 py-1 rounded text-emerald-300 hover:bg-emerald-500/15 transition">✓ tudo</button>}
                </div>
              </div>
              <div className="space-y-0.5">
                {sorted.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 text-xs py-1 px-1 rounded hover:bg-white/5 group" style={{ opacity: d.reimbursed ? 0.45 : 1 }}>
                    <button onClick={() => toggle(d.id)} className="shrink-0 hover:scale-110 transition">
                      {d.reimbursed ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Circle size={12} className="text-white/30 hover:text-emerald-400" />}
                    </button>
                    <span className={`flex-1 truncate ${d.reimbursed ? 'line-through text-white/40' : 'text-white/75'}`}>{d.description}</span>
                    {d.installmentTotal > 1 && <span className="text-white/35 shrink-0">{d.installmentCurrent}/{d.installmentTotal}</span>}
                    <span style={{ fontFamily: 'JetBrains Mono, monospace' }} className={`tabular-nums shrink-0 ${d.reimbursed ? 'text-white/35' : 'text-white/70'}`}>{fmtBRL(d.amount)}</span>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
                      <button onClick={() => onEdit(d)} className="p-1 rounded text-white/40 hover:text-amber-300 hover:bg-white/5 transition"><Pencil size={11} /></button>
                      <button onClick={() => onRemove(d.id)} className="p-1 rounded text-white/40 hover:text-rose-400 hover:bg-white/5 transition"><Trash2 size={11} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ---------- AttributedPanel ----------
function AttributedPanel({ list, total }) {
  const visible = list.filter((x) => x.total > 0)
  return (
    <Card className="p-4 sm:p-6">
      <SectionTitle icon={Users} title="Atribuído a" subtitle={`${visible.length} responsáveis com gastos`} accent="fuchsia" />
      {visible.length === 0 ? <Empty text="Nenhuma despesa lançada" /> : (
        <div className="space-y-2.5">
          {visible.map((x) => {
            const a = accents[x.accent] || accents.gold
            const pct = total > 0 ? (x.total / total) * 100 : 0
            return (
              <div key={x.name} className="flex items-center gap-3">
                <div className="w-1.5 self-stretch rounded-full" style={{ background: a.hex, minHeight: 28 }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate">{x.name}</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace' }} className="tabular-nums shrink-0 ml-2">{fmtBRL(x.total)}</span>
                  </div>
                  <div className="text-xs text-white/35">{pct.toFixed(0)}%</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

// ---------- BudgetCategoriesPanel ----------
function BudgetCategoriesPanel({ categories, addQuickDespesa }) {
  const [quickName, setQuickName] = useState(null)
  const [quickAmount, setQuickAmount] = useState('')

  const submitQuick = (catName) => {
    const v = Number(quickAmount)
    if (!v) return
    addQuickDespesa({ category: catName, amount: v })
    setQuickAmount('')
    setQuickName(null)
  }

  return (
    <Card className="p-4 sm:p-6" accent="rose">
      <SectionTitle icon={Target} title="Orçamentos do mês" subtitle="Quanto sobra de cada limite. Clique em + pra lançar gasto rápido." accent="rose" />
      {categories.length === 0 ? <Empty text="Cadastre orçamentos em Configurações pra controlar limites mensais" /> : (
        <div className="space-y-4">
          {categories.map((c) => {
            const a = accents[c.accent] || accents.rose
            const remaining = (c.budget || 0) - c.spent
            const pct = c.budget > 0 ? (c.spent / c.budget) * 100 : 0
            const over = remaining < 0
            const quickOpen = quickName === c.name
            return (
              <div key={c.name}>
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <div style={{ background: a.soft, color: a.hex }} className="p-1 rounded-md shrink-0"><Target size={12} /></div>
                    <span className="font-medium truncate">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-xs tabular-nums">
                      <span style={{ color: over ? accents.rose.hex : 'white' }}>{fmtBRL(c.spent)}</span>
                      <span className="text-white/40"> / {fmtBRL(c.budget)}</span>
                    </span>
                    <button onClick={() => { setQuickName(quickOpen ? null : c.name); setQuickAmount('') }}
                            className="p-1.5 rounded transition shrink-0"
                            style={{ background: quickOpen ? a.soft : 'rgba(255,255,255,0.05)', color: quickOpen ? a.hex : 'rgba(255,255,255,0.55)' }}>
                      {quickOpen ? <X size={12} /> : <Plus size={12} />}
                    </button>
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full transition-all" style={{
                    width: `${Math.min(100, pct)}%`,
                    background: over ? `linear-gradient(90deg, ${accents.rose.hex}, ${accents.amber.hex})` : `linear-gradient(90deg, ${a.hex}, ${a.hex}cc)`,
                    boxShadow: `0 0 12px ${a.glow}`,
                  }} />
                </div>
                <div className="flex justify-between text-xs text-white/45 mt-1">
                  <span>{pct.toFixed(0)}% gasto</span>
                  <span className={over ? 'text-rose-400' : ''}>{over ? 'Estourou ' : 'Sobra '}{fmtBRL(Math.abs(remaining))}</span>
                </div>
                {quickOpen && (
                  <div className="mt-2.5 p-2.5 rounded-lg flex items-center gap-2" style={{ background: a.soft, border: `1px solid ${a.hex}30` }}>
                    <span className="text-xs text-white/65 shrink-0">Quanto gastou?</span>
                    <div style={{ flex: 1, minWidth: 0 }} onKeyDown={(e) => { if (e.key === 'Enter') submitQuick(c.name); if (e.key === 'Escape') { setQuickName(null); setQuickAmount('') } }}>
                      <input type="text" inputMode="numeric" value={quickAmount === '' ? '' : Number(quickAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                             onChange={(e) => { const d = e.target.value.replace(/\D/g, ''); setQuickAmount(d === '' ? '' : parseInt(d, 10) / 100) }}
                             autoFocus placeholder="0,00"
                             style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', width: '100%', outline: 'none', fontFamily: 'JetBrains Mono, monospace', borderRadius: 8, padding: '6px 10px', fontSize: 14 }} />
                    </div>
                    <button onClick={() => submitQuick(c.name)} disabled={!quickAmount}
                            className="p-1.5 rounded bg-emerald-500/25 text-emerald-300 hover:bg-emerald-500/40 disabled:opacity-30 transition shrink-0">
                      <Check size={13} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

// ---------- BillsReminderPanel ----------
function BillsReminderPanel({ month, setMonth }) {
  const today = todayDay()
  const bills = useMemo(() => month.despesas.filter((d) => d.dueDay && isMineFor(d.attributedTo, month.config) && !month.config?.cards?.some((c) => c.name === d.paymentMethod)).sort((a, b) => (a.paid === b.paid ? Number(a.dueDay) - Number(b.dueDay) : a.paid ? 1 : -1)), [month.despesas, month.config])
  const pending = bills.filter((d) => !d.paid).length
  const togglePaid = (id) => setMonth((m) => ({ ...m, despesas: m.despesas.map((d) => d.id === id ? { ...d, paid: !d.paid } : d) }))

  return (
    <Card className="p-4 sm:p-6" accent="amber" glow>
      <SectionTitle icon={Bell} title="Contas a lembrar" subtitle={pending > 0 ? `${pending} pendente(s)` : 'tudo pago 🎯'} accent="amber" />
      {bills.length === 0 ? <Empty text="Nenhuma conta com vencimento neste mês" /> : (
        <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
          {bills.map((d) => {
            const overdue = !d.paid && Number(d.dueDay) < today
            const isToday = !d.paid && Number(d.dueDay) === today
            return (
              <div key={d.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/5" style={{ opacity: d.paid ? 0.5 : 1 }}>
                <button onClick={() => togglePaid(d.id)}>
                  {d.paid ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Circle size={16} className="text-white/30 hover:text-emerald-400 transition" />}
                </button>
                <div className="w-8 text-center shrink-0">
                  <div style={{ fontFamily: 'Fraunces, serif' }} className={`text-lg font-semibold leading-none ${d.paid ? 'text-emerald-400' : overdue ? 'text-rose-400' : isToday ? 'text-amber-300' : 'text-white/80'}`}>{d.dueDay}</div>
                  <div style={{ letterSpacing: '0.1em' }} className="text-xs uppercase text-white/35">{d.paid ? 'pago' : overdue ? 'atras.' : isToday ? 'hoje' : 'dia'}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm truncate ${d.paid ? 'line-through text-white/40' : ''}`}>{d.description}</div>
                  <div className="text-xs text-white/40 truncate">{d.paymentMethod || '—'}{d.attributedTo ? ` · ${d.attributedTo}` : ''}</div>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace' }} className={`text-sm font-semibold tabular-nums shrink-0 ${d.paid ? 'text-white/40' : ''}`}>{fmtBRL(d.amount)}</div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

// ---------- CashPanel ----------
function CashPanel({ aVista, total }) {
  return (
    <Card className="p-4 sm:p-6">
      <SectionTitle icon={Banknote} title="À vista" subtitle={`${fmtBRL(total)} via Pix / débito / outros`} accent="emerald" />
      {aVista.length === 0 ? <Empty text="Nenhum método à vista cadastrado" /> : (
        <div className="grid grid-cols-2 gap-3">
          {aVista.map((m) => {
            const a = accents[hashAccent(m.name)]
            return (
              <div key={m.name} className="p-4 rounded-xl" style={{ background: a.soft, border: `1px solid ${a.hex}30` }}>
                <div style={{ letterSpacing: '0.12em' }} className="text-xs text-white/55 uppercase mb-1.5">{m.name}</div>
                <div style={{ fontFamily: 'Fraunces, serif', color: a.hex }} className="text-2xl font-medium tabular-nums">{fmtBRL(m.total)}</div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

// ---------- PainelTab (export) ----------
export default function PainelTab({ month, setMonth }) {
  const agg = useMonthAggregates(month)
  const [editing, setEditing] = useState(null)

  const updateDespesa = (id, patch) => setMonth((m) => ({ ...m, despesas: m.despesas.map((d) => d.id === id ? { ...d, ...patch } : d) }))
  const removeDespesa = (id) => setMonth((m) => ({ ...m, despesas: m.despesas.filter((d) => d.id !== id) }))

  const addQuickDespesa = ({ category, amount }) => {
    setMonth((m) => {
      const myAttrs = m.config.attributedTo.filter((a) => a.isMine !== false)
      const attributedTo = myAttrs[0]?.name || m.config.attributedTo[0]?.name || ''
      return {
        ...m,
        despesas: [{
          id: uid(), description: category, amount, date: new Date().toISOString().slice(0, 10),
          category, paymentMethod: m.config.paymentMethods[0] || '', attributedTo,
          paid: true, dueDay: null, installmentCurrent: 1, installmentTotal: 1, recurring: false,
        }, ...m.despesas],
      }
    })
  }

  const updateCategory = (name, patch) => {
    setMonth((m) => ({ ...m, config: { ...m.config, categories: m.config.categories.map((c) => c.name === name ? { ...c, ...patch } : c) } }))
  }

  const showCards = agg.byCard.length > 0
  const showAttributed = agg.attributedList.some((a) => a.total > 0)
  const showBudgets = agg.categoryList.some((c) => c.budget)
  const showCash = agg.aVista.length > 0 && agg.totalAVista > 0
  const showAReceber = agg.aReceberList.length > 0

  return (
    <div className="space-y-6">
      <HeroBalance agg={agg} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard label="Receitas" value={fmtBRL(agg.totalReceitas)} icon={ArrowUpRight} accent="emerald" sub={`${month.receitas.length} entrada(s)`} />
        <MetricCard label="Despesas" value={fmtBRL(agg.totalDespesas)} icon={ArrowDownRight} accent="rose" sub={agg.terceirosCount > 0 ? `só as suas (${agg.terceirosCount} de terceiros à parte)` : `${month.despesas.length} gasto(s)`} />
        <MetricCard label="Já pago" value={fmtBRL(agg.totalPago)} icon={CheckCircle2} accent="cyan" sub={agg.totalDespesas > 0 ? `${Math.round(agg.totalPago / agg.totalDespesas * 100)}% das despesas` : '—'} />
        <MetricCard label="A pagar" value={fmtBRL(agg.totalAPagar)} icon={Bell} accent="amber" sub={agg.totalAPagar > 0 ? 'ainda pendente' : 'tudo em dia 🎯'} />
      </div>
      {(showCards || showAttributed || showBudgets || showCash || showAReceber || month.despesas.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BillsReminderPanel month={month} setMonth={setMonth} />
          {showCards && <CardsPanel cards={agg.byCard} setMonth={setMonth} />}
          {showAReceber && <AReceberPanel list={agg.aReceberList} total={agg.totalAReceber} setMonth={setMonth} onEdit={setEditing} onRemove={removeDespesa} />}
          {showBudgets && <BudgetCategoriesPanel categories={agg.categoryList.filter((c) => c.budget)} addQuickDespesa={addQuickDespesa} />}
          {showCash && <CashPanel aVista={agg.aVista} total={agg.totalAVista} />}
          {showAttributed && <AttributedPanel list={agg.attributedList} total={agg.totalDespesas} />}
        </div>
      )}
    </div>
    {editing && <EditDespesaModal despesa={editing} config={month.config} onSave={(patch) => { updateDespesa(editing.id, patch); setEditing(null) }} onClose={() => setEditing(null)} />}
  )
}
