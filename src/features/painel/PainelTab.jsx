import { useState, useMemo } from 'react'
import {
  Sparkles, ArrowUpRight, ArrowDownRight, CreditCard, Users, Target,
  Banknote, Bell, Check, Circle, AlertTriangle, CheckCircle2, Calendar,
  X, Plus, Pencil, Trash2, ChevronDown, PiggyBank, ArrowLeftRight, Wallet,
  MessageCircle,
} from 'lucide-react'
import { Card, Empty, SectionTitle, MetricCard, Btn, Field, MoneyInput, Select } from '../../components/ui'
import EditDespesaModal from '../gastos/EditDespesaModal'
import { accents, hashAccent, attrAccentKey, cofreBalance } from '../../lib/constants'
import { fmtBRL, todayDay, isMineFor, uid, dueDayStatus, getCurrentMonth } from '../../lib/utils'

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
    const itemsByCategory = {}
    cfg.categories.forEach((c) => { byCategory[c.name] = 0; itemsByCategory[c.name] = [] })
    minhas.forEach((d) => {
      const k = d.category || 'Sem categoria'
      byCategory[k] = (byCategory[k] || 0) + Number(d.amount || 0)
      if (itemsByCategory[k]) itemsByCategory[k].push(d)
    })
    // Apply per-month budget overrides on top of config budgets (only for this month)
    const overrides = (month && typeof month.budgetOverrides === 'object' && month.budgetOverrides) || {}
    const categoryList = cfg.categories.map((c) => {
      const hasOverride = Object.prototype.hasOwnProperty.call(overrides, c.name)
      const effectiveBudget = hasOverride ? Number(overrides[c.name]) || 0 : (c.budget || 0)
      return {
        ...c,
        budget: effectiveBudget,
        originalBudget: c.budget || 0,
        adjusted: hasOverride && effectiveBudget !== (c.budget || 0),
        spent: byCategory[c.name] || 0,
        items: itemsByCategory[c.name] || [],
      }
    })
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
              <BreakdownItem label="Reservado em categorias" value={-agg.orcamentoReservado} hint="ainda não gasto" accent="amber" />
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
  const color = c ? c.hex : (emphasis ? 'var(--text-primary)' : 'var(--text-secondary)')
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
function CardsPanel({ cards, setMonth, activeMonth, setPaidBulk }) {
  const totalAPagar = cards.reduce((s, c) => s + c.aPagar, 0)
  const isCurrentMonth = activeMonth === getCurrentMonth()
  const today = todayDay()
  const sorted = [...cards].sort((a, b) => {
    if (!a.dueDay && !b.dueDay) return b.total - a.total
    if (!a.dueDay) return 1
    if (!b.dueDay) return -1
    if (!isCurrentMonth) return a.dueDay - b.dueDay
    const da = a.dueDay >= today ? a.dueDay - today : 100 + a.dueDay
    const db = b.dueDay >= today ? b.dueDay - today : 100 + b.dueDay
    return da - db
  })

  const markAll = (items, paid) => {
    const ids = items.map((i) => i.id)
    if (setPaidBulk) setPaidBulk(ids, paid)
    else setMonth((m) => ({ ...m, despesas: m.despesas.map((d) => ids.includes(d.id) ? { ...d, paid } : d) }))
  }

  return (
    <Card className="p-4 sm:p-6" accent="violet">
      <SectionTitle icon={CreditCard} title="Faturas dos cartões" subtitle={totalAPagar > 0 ? `${fmtBRL(totalAPagar)} a pagar` : 'tudo quitado'} accent="violet" />
      {cards.length === 0 ? <Empty text="Nenhuma despesa em cartão neste mês" /> : (
        <div className="space-y-3">
          {sorted.map((c) => {
            const a = accents[c.accent] || accents.cyan
            const isToday = isCurrentMonth && c.dueDay === today && c.aPagar > 0
            const pct = c.total > 0 ? ((c.total - c.aPagar) / c.total) * 100 : 0
            const isPaid = c.aPagar === 0 && c.total > 0
            const dueMsg = !c.dueDay ? 'sem vencimento cadastrado' : isToday ? `vence HOJE (dia ${c.dueDay})` : `vence dia ${c.dueDay}`
            const dueColor = isToday ? 'text-amber-300' : 'text-white/55'
            return (
              <div key={c.name} className="p-3 rounded-lg" style={{ background: 'var(--bg-elev2)' }}>
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
                  <div className="h-1 rounded-full overflow-hidden mb-2" style={{ background: 'var(--bg-hover)' }}>
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
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => onEdit(d)} className="p-1.5 rounded text-amber-400/70 hover:text-amber-300 hover:bg-white/5 transition"><Pencil size={12} /></button>
                      <button onClick={() => onRemove(d.id)} className="p-1.5 rounded text-rose-400/70 hover:text-rose-300 hover:bg-white/5 transition"><Trash2 size={12} /></button>
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

// ---------- BudgetTransferModal ----------
function BudgetTransferModal({ fromCat, allCategories, onTransfer, onRelease, onClose }) {
  const [mode, setMode] = useState('outro')  // 'outro' | 'caixa'
  const [destName, setDestName] = useState(() => {
    const others = allCategories.filter((c) => c.name !== fromCat.name && c.budget && c.budget > 0)
    return others[0]?.name || ''
  })
  const [amount, setAmount] = useState('')

  // Arredonda pra centavos pra evitar bug de ponto flutuante
  // Ex: 100 - 99.99 dá 0.010000000000005116 em vez de 0.01, e aí
  // o usuário tenta transferir R$ 0,01 e é bloqueado.
  const sobraDisp = Math.max(0, Math.round(((Number(fromCat.budget) || 0) - (Number(fromCat.spent) || 0)) * 100) / 100)
  const v = Number(amount) || 0
  // Comparação em centavos (inteiros) pra evitar comparação de floats
  const vCents = Math.round(v * 100)
  const sobraCents = Math.round(sobraDisp * 100)
  const exceeds = vCents > sobraCents
  const others = allCategories.filter((c) => c.name !== fromCat.name && c.budget && c.budget > 0)
  const a = accents[fromCat.accent] || accents.rose

  const submit = () => {
    if (!v || v <= 0 || exceeds) return
    // Garante que se for "tudo", passa exatamente o sobraDisp (não o input do user)
    // pra eliminar resíduo de centavos. Ex: usuário tenta R$ 0,01 e sobraDisp é 0,01:
    // transfere 0,01 exato e zera o orçamento, sem deixar 0,000001 sobrando.
    const finalAmount = vCents >= sobraCents ? sobraDisp : v
    if (mode === 'outro') {
      if (!destName) return
      onTransfer(fromCat.name, destName, finalAmount)
    } else {
      onRelease(fromCat.name, finalAmount)
    }
    onClose()
  }

  return (
    <div onClick={onClose} style={{ background: 'rgba(7,9,18,0.7)', backdropFilter: 'blur(8px)' }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-app-soft)', border: '1px solid var(--border-medium)', borderRadius: 16, maxWidth: 460, width: '100%', color: 'var(--text-primary)' }} className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div style={{ background: a.soft, color: a.hex }} className="p-2 rounded-lg shrink-0"><ArrowLeftRight size={16} /></div>
            <div className="min-w-0">
              <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-lg truncate">Mover de {fromCat.name}</div>
              <div className="text-xs text-white/45">sobra disponível: {fmtBRL(sobraDisp)}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded text-white/55 hover:text-white hover:bg-white/5"><X size={16} /></button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode('outro')}
            disabled={others.length === 0}
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-30"
            style={mode === 'outro'
              ? { background: accents.rose.soft, color: accents.rose.hex, border: `1px solid ${accents.rose.hex}50` }
              : { background: 'var(--bg-elev2)', color: 'var(--text-tertiary)', border: '1px solid var(--border-medium)' }
            }
          >
            <ArrowLeftRight size={13} /> Outra categoria
          </button>
          <button
            onClick={() => setMode('caixa')}
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition"
            style={mode === 'caixa'
              ? { background: accents.gold.soft, color: accents.gold.hex, border: `1px solid ${accents.gold.hex}50` }
              : { background: 'var(--bg-elev2)', color: 'var(--text-tertiary)', border: '1px solid var(--border-medium)' }
            }
          >
            <Wallet size={13} /> Pro caixa
          </button>
        </div>

        {mode === 'outro' && (
          others.length === 0 ? (
            <div className="text-sm text-amber-300/80 p-3 rounded-lg" style={{ background: accents.amber.soft, border: `1px solid ${accents.amber.hex}25` }}>
              Você precisa de pelo menos 2 categorias com limite definido pra transferir entre elas.
            </div>
          ) : (
            <Field label="Para qual categoria">
              <Select value={destName} onChange={setDestName} options={others.map((c) => c.name)} />
            </Field>
          )
        )}

        {mode === 'caixa' && (
          <div className="text-xs text-white/65 leading-relaxed p-3 rounded-lg" style={{ background: accents.gold.soft, border: `1px solid ${accents.gold.hex}25` }}>
            Ao liberar pro caixa, o orçamento de <strong className="text-white/85">{fromCat.name}</strong> diminui só nesse mês e o valor entra no <strong className="text-white/85">disponível pra gastar</strong>. Não cria receita nem mexe nos gastos.
          </div>
        )}

        <Field label="Valor">
          <MoneyInput value={amount} onChange={setAmount} autoFocus />
        </Field>

        {exceeds && (
          <div className="text-xs text-rose-300 px-1">Valor maior que a sobra disponível ({fmtBRL(sobraDisp)})</div>
        )}

        <div className="text-xs text-white/45 leading-relaxed">
          Ajuste vale só pra esse mês. No mês seguinte, os orçamentos voltam ao original.
        </div>

        <div className="flex gap-2 justify-end pt-3 border-t border-white/5">
          <Btn variant="ghost" onClick={onClose} icon={X}>Cancelar</Btn>
          <Btn onClick={submit} icon={Check} disabled={!v || exceeds || (mode === 'outro' && (!destName || others.length === 0))}>Mover</Btn>
        </div>
      </div>
    </div>
  )
}

// ---------- CategoriesPanel ----------
// Mostra TODAS as categorias do mês, dividindo em dois grupos:
//   - "Com limite" (destaque, em cima): card cheio com progresso, sobra/estouro, transferir
//   - "Sem limite" (embaixo): card simples — só nome, quanto gastou e botão pra adicionar
// Mantém toda a lógica de transferir/quickAdd/expand das categorias com limite.
function CategoriesPanel({ categories, addQuickDespesa, onEdit, onRemove, onTransfer, onRelease, setTab }) {
  const [quickName, setQuickName] = useState(null)
  const [quickAmount, setQuickAmount] = useState('')
  const [quickDesc, setQuickDesc] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [transferFrom, setTransferFrom] = useState(null)

  const submitQuick = (catName) => {
    const v = Number(quickAmount)
    if (!v) return
    addQuickDespesa({ category: catName, amount: v, description: quickDesc })
    setQuickAmount('')
    setQuickDesc('')
    setQuickName(null)
  }

  // Separa categorias em dois grupos
  const withBudget = categories.filter((c) => (Number(c.budget) || 0) > 0)
  const withoutBudget = categories.filter((c) => !((Number(c.budget) || 0) > 0))

  // Render do card "com limite" — completo (usado só pra categorias com budget)
  const renderBudgetCard = (c) => {
    const a = accents[c.accent] || accents.rose
    const remaining = (c.budget || 0) - c.spent
    const pct = c.budget > 0 ? (c.spent / c.budget) * 100 : 0
    const over = remaining < 0
    const quickOpen = quickName === c.name
    const isExpanded = expanded === c.name
    const items = c.items || []
    return (
      <div key={c.name} className="rounded-xl p-3 sm:p-4" style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}>
                {/* ===== HEADER: nome em destaque ===== */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : c.name)}
                  className="w-full flex items-center gap-3 text-left hover:opacity-90 transition mb-3 -m-1 p-1 rounded-lg"
                  title={items.length > 0 ? `${items.length} lançamento(s)` : 'Toque pra expandir'}
                >
                  <div style={{ background: a.soft, color: a.hex }} className="p-2 rounded-lg shrink-0">
                    <Target size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base sm:text-lg truncate">{c.name}</span>
                      {items.length > 0 && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'var(--bg-hover)', color: 'var(--text-tertiary)' }}>
                          {items.length}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-white/35 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* ===== VALORES: gastou / orçamento ===== */}
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <div style={{ fontFamily: 'JetBrains Mono, monospace' }} className="tabular-nums">
                    <span className="text-lg font-semibold" style={{ color: over ? accents.rose.hex : 'var(--text-primary)' }}>{fmtBRL(c.spent)}</span>
                    <span className="text-xs text-white/40"> de {fmtBRL(c.budget)}</span>
                  </div>
                  <span className={`text-xs font-medium shrink-0 ${over ? 'text-rose-400' : 'text-emerald-300/75'}`}>
                    {over ? `${pct.toFixed(0)}%` : `${(100 - pct).toFixed(0)}% disponível`}
                  </span>
                </div>

                {/* ===== PROGRESSO ===== */}
                <div className="h-2.5 rounded-full overflow-hidden mb-2" style={{ background: 'var(--bg-elev3)' }}>
                  <div className="h-full transition-all duration-500" style={{
                    width: `${Math.min(100, pct)}%`,
                    background: over ? `linear-gradient(90deg, ${accents.rose.hex}, ${accents.amber.hex})` : `linear-gradient(90deg, ${a.hex}, ${a.hex}cc)`,
                    boxShadow: `0 0 12px ${a.glow}`,
                  }} />
                </div>

                {/* ===== SOBRA / ESTOUROU ===== */}
                <div className={`text-xs mb-3 ${over ? 'text-rose-400 font-medium' : 'text-white/55'}`}>
                  {over ? `🔴 Estourou em ${fmtBRL(Math.abs(remaining))}` : `Sobra ${fmtBRL(remaining)}`}
                </div>

                {c.adjusted && (
                  <div className="text-xs text-amber-300/75 mb-3 flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: 'rgba(245,158,11,0.06)' }}>
                    <ArrowLeftRight size={11} />
                    <span>Ajustado esse mês (era {fmtBRL(c.originalBudget)})</span>
                  </div>
                )}

                {/* ===== AÇÕES: 2 botões grandes ===== */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setQuickName(quickOpen ? null : c.name); setQuickAmount(''); setQuickDesc('') }}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition"
                    style={{
                      background: quickOpen ? a.soft : `${a.soft}80`,
                      color: a.hex,
                      border: `1px solid ${a.hex}30`,
                    }}
                  >
                    {quickOpen ? <><X size={15} /> Fechar</> : <><Plus size={15} /> Adicionar gasto</>}
                  </button>
                  <button
                    onClick={() => setTransferFrom(c)}
                    title="Transferir saldo pra outra categoria ou pro caixa"
                    className="flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition"
                    style={{
                      background: 'var(--bg-elev1)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-medium)',
                    }}
                  >
                    <ArrowLeftRight size={15} /> Transferir
                  </button>
                </div>
                {quickOpen && (
                  <div className="mt-2.5 p-2.5 rounded-lg space-y-2" style={{ background: a.soft, border: `1px solid ${a.hex}30` }}>
                    <input
                      type="text"
                      value={quickDesc}
                      onChange={(e) => setQuickDesc(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') submitQuick(c.name); if (e.key === 'Escape') { setQuickName(null); setQuickAmount(''); setQuickDesc('') } }}
                      placeholder="Descrição (ex: Mercado Pão de Açúcar)"
                      autoFocus
                      style={{ background: 'var(--bg-elev3)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', width: '100%', outline: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 14 }}
                      className="placeholder:text-white/35"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/65 shrink-0">R$</span>
                      <div style={{ flex: 1, minWidth: 0 }} onKeyDown={(e) => { if (e.key === 'Enter') submitQuick(c.name); if (e.key === 'Escape') { setQuickName(null); setQuickAmount(''); setQuickDesc('') } }}>
                        <input type="text" inputMode="numeric" value={quickAmount === '' ? '' : Number(quickAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                               onChange={(e) => { const d = e.target.value.replace(/\D/g, ''); setQuickAmount(d === '' ? '' : parseInt(d, 10) / 100) }}
                               placeholder="0,00"
                               style={{ background: 'var(--bg-elev3)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', width: '100%', outline: 'none', fontFamily: 'JetBrains Mono, monospace', borderRadius: 8, padding: '6px 10px', fontSize: 14 }} />
                      </div>
                      <button onClick={() => submitQuick(c.name)} disabled={!quickAmount}
                              className="p-1.5 rounded bg-emerald-500/25 text-emerald-300 hover:bg-emerald-500/40 disabled:opacity-30 transition shrink-0">
                        <Check size={13} />
                      </button>
                    </div>
                  </div>
                )}
        {isExpanded && (
          items.length === 0 ? (
            <div className="mt-2 text-xs text-white/35 italic px-2">Nenhum lançamento ainda</div>
          ) : (
            <div className="mt-2 space-y-0.5">
              {[...items].sort((x, y) => (y.date || '').localeCompare(x.date || '')).map((d) => (
                <div key={d.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/5 group text-xs">
                  <div className="flex-1 min-w-0">
                    <div className={`truncate ${d.paid ? 'text-white/55' : 'text-white/85'}`}>{d.description || '—'}</div>
                    <div className="text-white/35 text-[11px] truncate">
                      {d.date ? new Date(d.date + 'T00:00').toLocaleDateString('pt-BR') : '—'}
                      {d.paymentMethod ? ` · ${d.paymentMethod}` : ''}
                      {d.installmentTotal > 1 ? ` · ${d.installmentCurrent}/${d.installmentTotal}` : ''}
                    </div>
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace' }} className="tabular-nums shrink-0">{fmtBRL(d.amount)}</span>
                  {onEdit && <button onClick={() => onEdit(d)} className="p-1 rounded text-white/40 hover:text-amber-300 hover:bg-white/5 transition shrink-0"><Pencil size={12} /></button>}
                  {onRemove && <button onClick={() => onRemove(d.id)} className="p-1 rounded text-white/40 hover:text-rose-400 hover:bg-white/5 transition shrink-0"><Trash2 size={12} /></button>}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    )
  }
  // ===== fim do renderBudgetCard =====

  // Render do card "sem limite" — layout enxuto.
  // Mostra: nome, quanto gastou, count, botão de adicionar gasto + expandir items.
  const renderSimpleCard = (c) => {
    const a = accents[c.accent] || accents.violet
    const quickOpen = quickName === c.name
    const isExpanded = expanded === c.name
    const items = c.items || []
    return (
      <div key={c.name} className="rounded-xl p-3" style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setExpanded(isExpanded ? null : c.name)}
            className="flex items-center gap-2.5 flex-1 min-w-0 text-left hover:opacity-90 transition"
            title={items.length > 0 ? `${items.length} lançamento(s) — toque pra expandir` : 'Toque pra expandir'}
          >
            <div style={{ background: a.soft, color: a.hex }} className="p-1.5 rounded-md shrink-0">
              <Target size={13} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate text-sm sm:text-base">{c.name}</span>
                {items.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'var(--bg-hover)', color: 'var(--text-tertiary)' }}>
                    {items.length}
                  </span>
                )}
              </div>
            </div>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', color: c.spent > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }} className="tabular-nums font-semibold shrink-0">
              {fmtBRL(c.spent)}
            </span>
            <ChevronDown size={14} className={`text-white/35 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={() => { setQuickName(quickOpen ? null : c.name); setQuickAmount(''); setQuickDesc('') }}
            title={quickOpen ? 'Fechar' : 'Adicionar gasto'}
            className="p-1.5 rounded-lg shrink-0 transition"
            style={{ background: quickOpen ? a.soft : 'var(--bg-elev1)', color: quickOpen ? a.hex : 'var(--text-tertiary)', border: `1px solid ${quickOpen ? a.hex + '40' : 'var(--border-medium)'}` }}
          >
            {quickOpen ? <X size={14} /> : <Plus size={14} />}
          </button>
        </div>

        {quickOpen && (
          <div className="mt-2.5 p-2.5 rounded-lg space-y-2" style={{ background: a.soft, border: `1px solid ${a.hex}30` }}>
            <input
              type="text"
              value={quickDesc}
              onChange={(e) => setQuickDesc(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitQuick(c.name); if (e.key === 'Escape') { setQuickName(null); setQuickAmount(''); setQuickDesc('') } }}
              placeholder="Descrição (ex: Café da manhã)"
              autoFocus
              style={{ background: 'var(--bg-elev3)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', width: '100%', outline: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 14 }}
              className="placeholder:text-white/35"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/65 shrink-0">R$</span>
              <div style={{ flex: 1, minWidth: 0 }} onKeyDown={(e) => { if (e.key === 'Enter') submitQuick(c.name); if (e.key === 'Escape') { setQuickName(null); setQuickAmount(''); setQuickDesc('') } }}>
                <input type="text" inputMode="numeric" value={quickAmount === '' ? '' : Number(quickAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                       onChange={(e) => { const d = e.target.value.replace(/\D/g, ''); setQuickAmount(d === '' ? '' : parseInt(d, 10) / 100) }}
                       placeholder="0,00"
                       style={{ background: 'var(--bg-elev3)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', width: '100%', outline: 'none', fontFamily: 'JetBrains Mono, monospace', borderRadius: 8, padding: '6px 10px', fontSize: 14 }} />
              </div>
              <button onClick={() => submitQuick(c.name)} disabled={!quickAmount}
                      className="p-1.5 rounded bg-emerald-500/25 text-emerald-300 hover:bg-emerald-500/40 disabled:opacity-30 transition shrink-0">
                <Check size={13} />
              </button>
            </div>
          </div>
        )}

        {isExpanded && (
          items.length === 0 ? (
            <div className="mt-2 text-xs text-white/35 italic px-2">Nenhum lançamento ainda</div>
          ) : (
            <div className="mt-2 space-y-0.5">
              {[...items].sort((x, y) => (y.date || '').localeCompare(x.date || '')).map((d) => (
                <div key={d.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/5 group text-xs">
                  <div className="flex-1 min-w-0">
                    <div className={`truncate ${d.paid ? 'text-white/55' : 'text-white/85'}`}>{d.description || '—'}</div>
                    <div className="text-white/35 text-[11px] truncate">
                      {d.date ? new Date(d.date + 'T00:00').toLocaleDateString('pt-BR') : '—'}
                      {d.paymentMethod ? ` · ${d.paymentMethod}` : ''}
                      {d.installmentTotal > 1 ? ` · ${d.installmentCurrent}/${d.installmentTotal}` : ''}
                    </div>
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace' }} className="tabular-nums shrink-0">{fmtBRL(d.amount)}</span>
                  {onEdit && <button onClick={() => onEdit(d)} className="p-1 rounded text-white/40 hover:text-amber-300 hover:bg-white/5 transition shrink-0"><Pencil size={12} /></button>}
                  {onRemove && <button onClick={() => onRemove(d.id)} className="p-1 rounded text-white/40 hover:text-rose-400 hover:bg-white/5 transition shrink-0"><Trash2 size={12} /></button>}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    )
  }

  return (
    <Card className="p-4 sm:p-6" accent="rose">
      <SectionTitle icon={Target} title="Categorias do mês" subtitle="Com limite no topo (acompanhar de perto). Sem limite embaixo (só agrupam)." accent="rose" />
      {categories.length === 0 ? (
        <Empty
          icon={Target}
          accent="rose"
          text="Nenhuma categoria ainda"
          description="Crie categorias como Mercado, Lazer, Saídas. As que tiverem limite mensal aparecem em destaque pra você acompanhar; as sem limite só agrupam os gastos."
          action={{
            label: 'Criar primeira categoria',
            icon: Plus,
            onClick: () => setTab?.('config'),
          }}
        />
      ) : (
        <div className="space-y-5">
          {withBudget.length > 0 && (
            <div className="space-y-3">
              {withBudget.length > 0 && withoutBudget.length > 0 && (
                <div className="text-[10px] uppercase tracking-widest text-white/40 px-1">
                  Com limite mensal
                </div>
              )}
              {withBudget.map(renderBudgetCard)}
            </div>
          )}

          {withoutBudget.length > 0 && (
            <div className="space-y-2">
              {withBudget.length > 0 && (
                <div className="text-[10px] uppercase tracking-widest text-white/40 px-1 pt-2 border-t border-white/5">
                  Sem limite — só agrupam
                </div>
              )}
              {withoutBudget.map(renderSimpleCard)}
            </div>
          )}
        </div>
      )}
      {transferFrom && (
        <BudgetTransferModal
          fromCat={transferFrom}
          allCategories={categories.filter((c) => (Number(c.budget) || 0) > 0)}
          onTransfer={onTransfer}
          onRelease={onRelease}
          onClose={() => setTransferFrom(null)}
        />
      )}
    </Card>
  )
}

// ---------- BillsReminderPanel ----------
function BillsReminderPanel({ month, setMonth, activeMonth, onEdit, onRemove, togglePaidDespesa }) {
  const bills = useMemo(() => month.despesas.filter((d) => d.dueDay && isMineFor(d.attributedTo, month.config) && !month.config?.cards?.some((c) => c.name === d.paymentMethod)).sort((a, b) => (a.paid === b.paid ? Number(a.dueDay) - Number(b.dueDay) : a.paid ? 1 : -1)), [month.despesas, month.config])
  const pending = bills.filter((d) => !d.paid).length
  const togglePaid = togglePaidDespesa || ((id) => setMonth((m) => ({ ...m, despesas: m.despesas.map((d) => d.id === id ? { ...d, paid: !d.paid } : d) })))

  return (
    <Card className="p-4 sm:p-6" accent="amber" glow>
      <SectionTitle icon={Bell} title="Contas a lembrar" subtitle={pending > 0 ? `${pending} pendente(s)` : 'tudo pago 🎯'} accent="amber" />
      {bills.length === 0 ? <Empty text="Nenhuma conta com vencimento neste mês" /> : (
        <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
          {bills.map((d) => {
            const status = dueDayStatus(activeMonth, d.dueDay)
            const overdue = !d.paid && status.overdue
            const isToday = !d.paid && status.isToday
            return (
              <div key={d.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/5 group" style={{ opacity: d.paid ? 0.5 : 1 }}>
                <button onClick={() => togglePaid(d.id)} className="shrink-0">
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
                <div className="shrink-0 flex gap-0.5">
                  {onEdit && <button onClick={() => onEdit(d)} className="p-1.5 rounded text-white/40 hover:text-amber-300 hover:bg-white/5 transition" title="Editar"><Pencil size={13} /></button>}
                  {onRemove && <button onClick={() => onRemove(d.id)} className="p-1.5 rounded text-white/40 hover:text-rose-400 hover:bg-white/5 transition" title="Remover"><Trash2 size={13} /></button>}
                </div>
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

// ---------- CofresPanel ----------
function CofresPanel({ cofres, setTab }) {
  const total = cofres.reduce((s, c) => s + cofreBalance(c), 0)
  const sorted = [...cofres].sort((a, b) => cofreBalance(b) - cofreBalance(a))
  return (
    <Card className="p-4 sm:p-6 cursor-pointer hover:bg-white/[0.015] transition" accent="cyan" onClick={() => setTab?.('cofres')}>
      <SectionTitle icon={PiggyBank} title="Cofres" subtitle={`${fmtBRL(total)} guardado em ${cofres.length} cofre${cofres.length !== 1 ? 's' : ''}`} accent="cyan" />
      <div className="space-y-2">
        {sorted.map((c) => {
          const a = accents[c.accent] || accents.cyan
          const balance = cofreBalance(c)
          const negative = balance < 0
          const goal = c.goal
          const pct = goal && goal.amount > 0 ? Math.min(100, (balance / goal.amount) * 100) : null
          return (
            <div key={c.id} className="p-3 rounded-lg" style={{ background: 'var(--bg-elev2)' }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div style={{ background: a.soft, color: a.hex }} className="p-1.5 rounded-md shrink-0"><PiggyBank size={13} /></div>
                  <span className="font-medium truncate">{c.name}</span>
                </div>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: negative ? accents.rose.hex : a.hex }} className="font-semibold tabular-nums shrink-0">{fmtBRL(balance)}</span>
              </div>
              {pct !== null && (
                <div className="mt-2">
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                    <div className="h-full" style={{ width: `${Math.max(0, pct)}%`, background: a.hex }} />
                  </div>
                  <div className="flex justify-between text-xs text-white/40 mt-1">
                    <span>{pct.toFixed(0)}% da meta</span>
                    <span>{fmtBRL(goal.amount)}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ---------- PainelTab (export) ----------
// ---------- PendingPanel (lançamentos via WhatsApp aguardando confirmação) ----------
function PendingPanel({ pendings, onConfirm, onEdit, onDiscard }) {
  if (!pendings || pendings.length === 0) return null

  const formatDate = (iso) => {
    if (!iso) return ''
    return new Date(iso + 'T00:00').toLocaleDateString('pt-BR')
  }

  return (
    <Card className="p-4 sm:p-5" accent="emerald" glow>
      <SectionTitle
        icon={MessageCircle}
        title="Aguardando confirmação"
        subtitle={`${pendings.length} ${pendings.length === 1 ? 'lançamento veio' : 'lançamentos vieram'} pelo WhatsApp`}
        accent="emerald"
      />
      <div className="space-y-2">
        {pendings.map((p) => {
          const d = p.data || {}
          const isIncome = p.type === 'income'
          const accent = isIncome ? accents.emerald : accents.rose
          const valor = fmtBRL(d.amount)
          const title = isIncome ? (d.source || 'Receita') : (d.description || 'Sem descrição')

          const meta = []
          if (isIncome) {
            if (d.recurring) meta.push('recorrente')
            if (d.notes) meta.push(d.notes)
          } else {
            if (d.paymentMethod) meta.push(d.paymentMethod)
            if (d.installmentTotal > 1) meta.push(`parcela ${d.installmentCurrent}/${d.installmentTotal}`)
            if (d.recurring) meta.push('fixo mensal')
            if (d.category) meta.push(d.category)
            if (d.attributedTo) meta.push(d.attributedTo)
          }

          return (
            <div key={p.id} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${accent.hex}30` }}>
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className="text-[10px] uppercase px-1.5 py-0.5 rounded font-semibold shrink-0"
                      style={{ background: accent.soft, color: accent.hex, letterSpacing: '0.08em' }}
                    >
                      {isIncome ? 'Entrada' : 'Saída'}
                    </span>
                    <span className="font-medium truncate">{title}</span>
                    <span style={{ color: accent.hex, fontFamily: 'JetBrains Mono, monospace' }} className="text-sm font-semibold tabular-nums">
                      {isIncome ? '+' : '−'}{valor}
                    </span>
                  </div>
                  {meta.length > 0 && (
                    <div className="text-xs text-white/45 truncate">{meta.join(' · ')}</div>
                  )}
                  {d.date && (
                    <div className="text-xs text-white/35 mt-0.5">📅 {formatDate(d.date)}</div>
                  )}
                  {p.raw && (
                    <div className="text-xs text-white/30 italic mt-1.5 truncate">"{p.raw}"</div>
                  )}
                </div>
              </div>
              <div className={`grid gap-1.5 ${isIncome ? 'grid-cols-2' : 'grid-cols-3'}`}>
                <button
                  onClick={() => onConfirm(p)}
                  className="flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition"
                  style={{ background: accents.emerald.soft, color: accents.emerald.hex, border: `1px solid ${accents.emerald.hex}30` }}
                >
                  <Check size={13} /> Confirmar
                </button>
                {!isIncome && (
                  <button
                    onClick={() => onEdit(p)}
                    className="flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition"
                    style={{ background: 'rgba(245,158,11,0.1)', color: accents.amber.hex, border: `1px solid ${accents.amber.hex}30` }}
                  >
                    <Pencil size={13} /> Editar
                  </button>
                )}
                <button
                  onClick={() => onDiscard(p.id)}
                  className="flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition text-white/50 hover:text-rose-400"
                  style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-medium)' }}
                >
                  <X size={13} /> Descartar
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default function PainelTab({ month, setMonth, setTab, activeMonth, expandInstallments, cofres = [], togglePaidDespesa, setPaidBulk, removeDespesaCentral, pendingActions = [], confirmPending, discardPending }) {
  const agg = useMonthAggregates(month)
  const [editing, setEditing] = useState(null)
  const [editingPending, setEditingPending] = useState(null)  // { id, data } — editing a WhatsApp pending

  const updateDespesa = (id, patch) => setMonth((m) => ({ ...m, despesas: m.despesas.map((d) => d.id === id ? { ...d, ...patch } : d) }))
  const removeDespesa = removeDespesaCentral || ((id) => setMonth((m) => ({ ...m, despesas: m.despesas.filter((d) => d.id !== id) })))
  const togglePaid = togglePaidDespesa || ((id) => setMonth((m) => ({ ...m, despesas: m.despesas.map((d) => d.id === id ? { ...d, paid: !d.paid } : d) })))

  // Arredonda pra centavos pra evitar bug de ponto flutuante
  // (ex: 100 - 99.99 = 0.010000000000005116 em vez de 0.01)
  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

  // Transfer one budget's leftover to another budget (this month only).
  // Reduces source budget by amount, increases destination by amount.
  const transferBudget = (fromCat, toCat, amount) => {
    setMonth((m) => {
      const cfg = m.config || {}
      const cats = Array.isArray(cfg.categories) ? cfg.categories : []
      const overrides = (m.budgetOverrides && typeof m.budgetOverrides === 'object') ? { ...m.budgetOverrides } : {}
      const get = (name) => Object.prototype.hasOwnProperty.call(overrides, name)
        ? Number(overrides[name]) || 0
        : Number(cats.find((c) => c.name === name)?.budget) || 0
      overrides[fromCat] = round2(Math.max(0, get(fromCat) - amount))
      overrides[toCat] = round2(get(toCat) + amount)
      return { ...m, budgetOverrides: overrides }
    })
  }

  // Release budget back to cashflow (just reduces the source budget for this month).
  const releaseBudget = (fromCat, amount) => {
    setMonth((m) => {
      const cfg = m.config || {}
      const cats = Array.isArray(cfg.categories) ? cfg.categories : []
      const overrides = (m.budgetOverrides && typeof m.budgetOverrides === 'object') ? { ...m.budgetOverrides } : {}
      const get = (name) => Object.prototype.hasOwnProperty.call(overrides, name)
        ? Number(overrides[name]) || 0
        : Number(cats.find((c) => c.name === name)?.budget) || 0
      overrides[fromCat] = round2(Math.max(0, get(fromCat) - amount))
      return { ...m, budgetOverrides: overrides }
    })
  }

  const addQuickDespesa = ({ category, amount, description }) => {
    setMonth((m) => {
      const myAttrs = m.config.attributedTo.filter((a) => a.isMine !== false)
      const attributedTo = myAttrs[0]?.name || m.config.attributedTo[0]?.name || ''
      return {
        ...m,
        despesas: [{
          id: uid(),
          description: (description && description.trim()) || category,
          amount,
          date: new Date().toISOString().slice(0, 10),
          category,
          paymentMethod: m.config.paymentMethods[0] || '',
          attributedTo,
          paid: true,
          dueDay: null,
          installmentCurrent: 1,
          installmentTotal: 1,
          recurring: false,
        }, ...m.despesas],
      }
    })
  }

  const updateCategory = (name, patch) => {
    setMonth((m) => ({ ...m, config: { ...m.config, categories: m.config.categories.map((c) => c.name === name ? { ...c, ...patch } : c) } }))
  }

  const showCards = agg.byCard.length > 0
  // Mostra o painel se houver QUALQUER categoria cadastrada (com ou sem limite)
  const showCategories = agg.categoryList.length > 0
  const showAReceber = agg.aReceberList.length > 0

  return (
    <>
    <div className="space-y-6">
      {pendingActions.length > 0 && (
        <PendingPanel
          pendings={pendingActions}
          onConfirm={confirmPending}
          onEdit={(p) => setEditingPending({ id: p.id, data: p.data })}
          onDiscard={discardPending}
        />
      )}
      <HeroBalance agg={agg} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setTab?.('receitas')}>
          <MetricCard label="Receitas" value={fmtBRL(agg.totalReceitas)} icon={ArrowUpRight} accent="emerald" sub={`${month.receitas.length} entrada(s)`} />
        </div>
        <div className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setTab?.('gastos')}>
          <MetricCard label="Despesas" value={fmtBRL(agg.totalDespesas)} icon={ArrowDownRight} accent="rose" sub={agg.terceirosCount > 0 ? `só as suas (${agg.terceirosCount} de terceiros à parte)` : `${month.despesas.length} gasto(s)`} />
        </div>
        <MetricCard label="Já pago" value={fmtBRL(agg.totalPago)} icon={CheckCircle2} accent="cyan" sub={agg.totalDespesas > 0 ? `${Math.round(agg.totalPago / agg.totalDespesas * 100)}% das despesas` : '—'} />
        <MetricCard label="A pagar" value={fmtBRL(agg.totalAPagar)} icon={Bell} accent="amber" sub={agg.totalAPagar > 0 ? 'ainda pendente' : 'tudo em dia 🎯'} />
      </div>
      {(showCards || showCategories || showAReceber || month.despesas.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BillsReminderPanel month={month} setMonth={setMonth} activeMonth={activeMonth} onEdit={setEditing} onRemove={removeDespesa} togglePaidDespesa={togglePaid} />
          {showCategories && <CategoriesPanel categories={agg.categoryList} addQuickDespesa={addQuickDespesa} onEdit={setEditing} onRemove={removeDespesa} onTransfer={transferBudget} onRelease={releaseBudget} setTab={setTab} />}
          {showCards && <CardsPanel cards={agg.byCard} setMonth={setMonth} activeMonth={activeMonth} setPaidBulk={setPaidBulk} />}
          {showAReceber && <AReceberPanel list={agg.aReceberList} total={agg.totalAReceber} setMonth={setMonth} onEdit={setEditing} onRemove={removeDespesa} />}
        </div>
      )}
      {cofres.length > 0 && <CofresPanel cofres={cofres} setTab={setTab} />}
    </div>
    {editing && <EditDespesaModal despesa={editing} config={month.config} cofres={cofres} onSave={(patch) => {
      updateDespesa(editing.id, patch)
      const merged = { ...editing, ...patch }
      if (expandInstallments && (Number(merged.installmentTotal) || 1) > 1) {
        expandInstallments(merged)
      }
      setEditing(null)
    }} onClose={() => setEditing(null)} />}

    {editingPending && <EditDespesaModal
      despesa={editingPending.data}
      config={month.config}
      cofres={cofres}
      onSave={(patch) => {
        // Aplica a edição e confirma o pending de uma vez
        const fullPending = pendingActions.find((p) => p.id === editingPending.id)
        if (fullPending) {
          confirmPending(fullPending, { ...editingPending.data, ...patch })
        }
        setEditingPending(null)
      }}
      onClose={() => setEditingPending(null)}
    />}
    </>
  )
}
