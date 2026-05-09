import { useState } from 'react'
import { PiggyBank, Plus, X, Check, Pencil, Trash2, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Target, Calendar, Wallet } from 'lucide-react'
import { Card, SectionTitle, Empty, Btn, Field, MoneyInput, TextInput, Select, DateInput } from '../../components/ui'
import { accents, accentKeys, cofreBalance } from '../../lib/constants'
import { fmtBRL, todayISO, uid } from '../../lib/utils'

// ---------- Helpers ----------
const movsSorted = (cofre) =>
  [...(cofre.movements || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

const lastMov = (cofre) => movsSorted(cofre)[0]

const formatDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso + 'T00:00').toLocaleDateString('pt-BR')
}

const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const formatMonthLabel = (ym) => {
  if (!ym) return 'Sem data'
  const [y, m] = ym.split('-').map(Number)
  if (!y || !m) return ym
  return `${MONTH_LABELS[m - 1]} ${y}`
}

// Groups movements by YYYY-MM, returns sorted array of { ym, movements, totalEntrada, totalSaida }
const groupMovementsByMonth = (movements) => {
  const groups = {}
  for (const m of movements) {
    if (!m) continue
    const ym = (m.date || '').slice(0, 7) || 'sem-data'
    if (!groups[ym]) groups[ym] = { ym, movements: [], totalEntrada: 0, totalSaida: 0 }
    groups[ym].movements.push(m)
    if (m.type === 'entrada') groups[ym].totalEntrada += Number(m.amount) || 0
    else groups[ym].totalSaida += Number(m.amount) || 0
  }
  // Sort movements within each group desc by date
  Object.values(groups).forEach((g) => g.movements.sort((a, b) => (b.date || '').localeCompare(a.date || '')))
  // Sort groups desc by ym (most recent first)
  return Object.values(groups).sort((a, b) => (b.ym || '').localeCompare(a.ym || ''))
}

const monthsUntil = (target) => {
  if (!target) return null
  const [y, m] = target.split('-').map(Number)
  if (!y || !m) return null
  const now = new Date()
  const months = (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth())
  return months
}

// ---------- CofreForm (create/edit) ----------
function CofreForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '')
  const [accent, setAccent] = useState(initial?.accent || 'cyan')
  const [initialBalance, setInitialBalance] = useState(initial?.initialBalance ?? '')
  const [initialDate, setInitialDate] = useState(initial?.initialDate || todayISO())
  const [hasGoal, setHasGoal] = useState(!!initial?.goal)
  const [goalAmount, setGoalAmount] = useState(initial?.goal?.amount ?? '')
  const [goalDate, setGoalDate] = useState(initial?.goal?.targetDate || '')

  const submit = () => {
    if (!name.trim()) return
    const cofre = {
      ...(initial || {}),
      id: initial?.id || uid(),
      name: name.trim(),
      accent,
      initialBalance: Number(initialBalance) || 0,
      initialDate: initialDate || todayISO(),
      goal: hasGoal && Number(goalAmount) > 0
        ? { amount: Number(goalAmount), targetDate: goalDate || '' }
        : null,
      movements: initial?.movements || [],
    }
    onSave(cofre)
  }

  return (
    <Card className="p-5 space-y-4" accent={accent}>
      <div className="flex items-center justify-between">
        <h3 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-lg">
          {initial ? 'Editar cofre' : 'Novo cofre'}
        </h3>
        {onCancel && <button onClick={onCancel} className="p-1.5 rounded text-white/50 hover:text-white hover:bg-white/5"><X size={16} /></button>}
      </div>

      <Field label="Nome">
        <TextInput value={name} onChange={setName} placeholder="Ex: IPVA, Casamento, Reserva de emergência" autoFocus />
      </Field>

      <Field label="Cor">
        <div className="flex gap-2 flex-wrap">
          {accentKeys.map((k) => (
            <button key={k} onClick={() => setAccent(k)} className="w-7 h-7 rounded-full transition" style={{ background: accents[k].hex, outline: accent === k ? '2px solid white' : 'none', outlineOffset: 2 }} />
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Saldo inicial" hint="o que já tem hoje">
          <MoneyInput value={initialBalance} onChange={setInitialBalance} />
        </Field>
        <Field label="Data do saldo inicial">
          <DateInput value={initialDate} onChange={setInitialDate} />
        </Field>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setHasGoal((v) => !v)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition border ${hasGoal ? 'text-white/85 border-white/20 bg-white/5' : 'text-white/45 border-white/10 bg-transparent'}`}
        >
          <Target size={12} />
          {hasGoal ? 'Meta definida' : 'Definir meta (opcional)'}
        </button>
      </div>

      {hasGoal && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Field label="Valor da meta">
            <MoneyInput value={goalAmount} onChange={setGoalAmount} />
          </Field>
          <Field label="Data alvo (opcional)">
            <DateInput value={goalDate} onChange={setGoalDate} />
          </Field>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-3 border-t border-white/5">
        {onCancel && <Btn variant="ghost" onClick={onCancel} icon={X}>Cancelar</Btn>}
        <Btn onClick={submit} icon={Check} disabled={!name.trim()}>Salvar</Btn>
      </div>
    </Card>
  )
}

// ---------- MovementForm ----------
function MovementForm({ kind, cofres, currentCofreId, onSave, onCancel }) {
  // kind: 'entrada' | 'saida' | 'transferencia' | 'caixa'
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [destId, setDestId] = useState(() => {
    const others = cofres.filter((c) => c.id !== currentCofreId)
    return others[0]?.id || ''
  })

  const submit = () => {
    const v = Number(amount)
    if (!v || v <= 0) return
    if (kind === 'transferencia' && !destId) return
    onSave({ amount: v, date: date || todayISO(), note: note.trim(), destId })
  }

  const title =
    kind === 'entrada' ? 'Nova entrada' :
    kind === 'saida' ? 'Nova saída' :
    kind === 'caixa' ? 'Devolver pro caixa' :
    'Transferir'
  const accent =
    kind === 'entrada' ? 'emerald' :
    kind === 'saida' ? 'rose' :
    kind === 'caixa' ? 'gold' :
    'amber'
  const Icon =
    kind === 'entrada' ? ArrowUpRight :
    kind === 'saida' ? ArrowDownRight :
    kind === 'caixa' ? Wallet :
    ArrowLeftRight

  const others = cofres.filter((c) => c.id !== currentCofreId)

  return (
    <Card className="p-5 space-y-4" accent={accent}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div style={{ background: accents[accent].soft, color: accents[accent].hex }} className="p-1.5 rounded-lg"><Icon size={14} /></div>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-lg">{title}</h3>
        </div>
        {onCancel && <button onClick={onCancel} className="p-1.5 rounded text-white/50 hover:text-white hover:bg-white/5"><X size={16} /></button>}
      </div>

      {kind === 'transferencia' && (
        others.length === 0 ? (
          <div className="text-sm text-amber-300/80">Você precisa de pelo menos 2 cofres pra transferir.</div>
        ) : (
          <Field label="Para qual cofre">
            <Select value={destId} onChange={setDestId} options={others.map((c) => ({ value: c.id, label: c.name }))} />
          </Field>
        )
      )}

      {kind === 'caixa' && (
        <div className="text-xs text-white/60 leading-relaxed p-3 rounded-lg" style={{ background: accents.gold.soft, border: `1px solid ${accents.gold.hex}25` }}>
          O valor sai do cofre e entra como <strong className="text-white/85">receita do mês</strong> da data escolhida — aumentando a sua sobra disponível.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Valor">
          <MoneyInput value={amount} onChange={setAmount} />
        </Field>
        <Field label="Data">
          <DateInput value={date} onChange={setDate} />
        </Field>
      </div>

      <Field label="Observação (opcional)">
        <TextInput value={note} onChange={setNote} placeholder="Ex: depósito mensal" />
      </Field>

      <div className="flex gap-2 justify-end pt-3 border-t border-white/5">
        {onCancel && <Btn variant="ghost" onClick={onCancel} icon={X}>Cancelar</Btn>}
        <Btn onClick={submit} icon={Check} disabled={!Number(amount) || (kind === 'transferencia' && (!destId || others.length === 0))}>
          {kind === 'caixa' ? 'Devolver' : 'Salvar'}
        </Btn>
      </div>
    </Card>
  )
}

// ---------- CofreCard ----------
function CofreCard({ cofre, onOpen, onQuickEntrada, onQuickSaida }) {
  const a = accents[cofre.accent] || accents.cyan
  const balance = cofreBalance(cofre)
  const negative = balance < 0
  const last = lastMov(cofre)
  const goal = cofre.goal
  const pct = goal && goal.amount > 0 ? Math.min(100, (balance / goal.amount) * 100) : null
  const monthsLeft = goal?.targetDate ? monthsUntil(goal.targetDate) : null

  return (
    <Card className="p-5 cursor-pointer hover:bg-white/[0.015] transition" accent={cofre.accent} onClick={onOpen}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div style={{ background: a.soft, color: a.hex }} className="p-2 rounded-lg shrink-0"><PiggyBank size={16} /></div>
          <div className="min-w-0">
            <div className="font-medium truncate">{cofre.name}</div>
            {last && <div className="text-xs text-white/40 truncate">último: {last.type === 'entrada' ? '+' : '−'}{fmtBRL(last.amount)} em {formatDate(last.date)}</div>}
            {!last && <div className="text-xs text-white/35">sem movimentações</div>}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onQuickEntrada() }} title="Entrada" className="p-1.5 rounded transition" style={{ background: accents.emerald.soft, color: accents.emerald.hex }}>
            <Plus size={13} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onQuickSaida() }} title="Saída" className="p-1.5 rounded transition" style={{ background: accents.rose.soft, color: accents.rose.hex }}>
            <ArrowDownRight size={13} />
          </button>
        </div>
      </div>

      <div style={{ fontFamily: 'Fraunces, serif', color: negative ? accents.rose.hex : a.hex }} className="text-3xl font-medium tabular-nums leading-none mb-1">
        {fmtBRL(balance)}
      </div>

      {goal && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-white/55 mb-1">
            <span>{pct.toFixed(0)}% da meta</span>
            <span>
              {fmtBRL(goal.amount)}
              {monthsLeft != null && monthsLeft >= 0 && <span className="text-white/35"> · {monthsLeft === 0 ? 'esse mês' : `${monthsLeft} ${monthsLeft === 1 ? 'mês' : 'meses'}`}</span>}
              {monthsLeft != null && monthsLeft < 0 && <span className="text-rose-400/80"> · atrasado</span>}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="h-full transition-all" style={{ width: `${Math.max(0, pct)}%`, background: `linear-gradient(90deg, ${a.hex}, ${a.hex}cc)`, boxShadow: `0 0 12px ${a.glow}` }} />
          </div>
        </div>
      )}
    </Card>
  )
}

// ---------- CofreDetail (full screen-ish modal) ----------
function CofreDetail({ cofre, cofres, initialAction, onClose, onSave, onRemove, onAddMovement, onTransfer, onTransferToCaixa, onUpdateMovement, onRemoveMovement }) {
  const [editing, setEditing] = useState(false)
  const [movKind, setMovKind] = useState(initialAction || null)  // 'entrada' | 'saida' | 'transferencia' | null
  const [editingMovId, setEditingMovId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const a = accents[cofre.accent] || accents.cyan
  const balance = cofreBalance(cofre)
  const movs = movsSorted(cofre)

  const cofreById = (id) => cofres.find((c) => c.id === id)

  return (
    <div onClick={onClose} style={{ background: 'rgba(7,9,18,0.7)', backdropFilter: 'blur(8px)' }} className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto">
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'linear-gradient(180deg, #0f1525, #0a0d18)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, maxWidth: 700, width: '100%' }} className="p-5 sm:p-7 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div style={{ background: a.soft, color: a.hex }} className="p-3 rounded-xl shrink-0"><PiggyBank size={22} /></div>
            <div className="min-w-0">
              <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-2xl truncate">{cofre.name}</div>
              <div style={{ fontFamily: 'Fraunces, serif', color: balance < 0 ? accents.rose.hex : a.hex }} className="text-3xl font-medium tabular-nums">{fmtBRL(balance)}</div>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => setEditing(true)} className="p-2 rounded-lg text-white/55 hover:text-amber-300 hover:bg-white/5" title="Editar"><Pencil size={15} /></button>
            <button onClick={() => setConfirmDelete(true)} className={`p-2 rounded-lg ${confirmDelete ? 'text-rose-300 bg-rose-500/15' : 'text-white/55 hover:text-rose-400 hover:bg-white/5'}`} title="Excluir"><Trash2 size={15} /></button>
            <button onClick={onClose} className="p-2 rounded-lg text-white/55 hover:text-white hover:bg-white/5"><X size={15} /></button>
          </div>
        </div>

        {confirmDelete && (
          <div className="p-3 rounded-lg flex items-center justify-between" style={{ background: accents.rose.soft, border: `1px solid ${accents.rose.hex}30` }}>
            <span className="text-sm text-rose-200">Excluir esse cofre? O histórico se perde.</span>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="px-3 py-1 rounded text-xs text-white/70 hover:bg-white/5">Cancelar</button>
              <button onClick={() => { onRemove(cofre.id); onClose() }} className="px-3 py-1 rounded text-xs bg-rose-500/30 text-rose-200 hover:bg-rose-500/50">Excluir</button>
            </div>
          </div>
        )}

        {/* Goal info */}
        {cofre.goal && (
          <div className="p-3 rounded-lg flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Target size={14} className="text-white/55 shrink-0" />
            <div className="text-xs text-white/65 flex-1">
              Meta: <strong className="text-white/85">{fmtBRL(cofre.goal.amount)}</strong>
              {cofre.goal.targetDate && <> até <strong className="text-white/85">{formatDate(cofre.goal.targetDate)}</strong></>}
            </div>
          </div>
        )}

        {/* Edit cofre form */}
        {editing && (
          <CofreForm
            initial={cofre}
            onSave={(updated) => { onSave(updated); setEditing(false) }}
            onCancel={() => setEditing(false)}
          />
        )}

        {/* Action buttons */}
        {!editing && !movKind && (
          <div className="flex gap-2 flex-wrap">
            <Btn icon={ArrowUpRight} onClick={() => { setEditingMovId(null); setMovKind('entrada') }}>Entrada</Btn>
            <Btn icon={ArrowDownRight} onClick={() => { setEditingMovId(null); setMovKind('saida') }} variant="ghost">Saída</Btn>
            <Btn icon={Wallet} onClick={() => { setEditingMovId(null); setMovKind('caixa') }} variant="ghost">Devolver pro caixa</Btn>
            {cofres.length > 1 && <Btn icon={ArrowLeftRight} onClick={() => { setEditingMovId(null); setMovKind('transferencia') }} variant="ghost">Transferir</Btn>}
          </div>
        )}

        {/* Movement form */}
        {movKind && (
          <MovementForm
            kind={movKind}
            cofres={cofres}
            currentCofreId={cofre.id}
            onSave={(payload) => {
              if (movKind === 'transferencia') {
                onTransfer(cofre.id, payload.destId, payload.amount, payload.date, payload.note)
              } else if (movKind === 'caixa') {
                onTransferToCaixa && onTransferToCaixa(cofre.id, payload.amount, payload.date, payload.note)
              } else {
                onAddMovement(cofre.id, { type: movKind, ...payload })
              }
              setMovKind(null)
            }}
            onCancel={() => setMovKind(null)}
          />
        )}

        {/* Initial balance row */}
        {(Number(cofre.initialBalance) || 0) !== 0 && (
          <div className="px-3 py-2 rounded-lg text-xs flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="flex items-center gap-2 text-white/55">
              <Calendar size={11} />
              <span>Saldo inicial em {formatDate(cofre.initialDate)}</span>
            </div>
            <span style={{ fontFamily: 'JetBrains Mono, monospace' }} className="tabular-nums text-white/70">{fmtBRL(cofre.initialBalance)}</span>
          </div>
        )}

        {/* History */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="uppercase text-white/45 text-xs" style={{ letterSpacing: '0.12em' }}>Movimentações</span>
            <span className="text-xs text-white/35">{movs.length} registro(s)</span>
          </div>
          {movs.length === 0 ? (
            <Empty text="Nenhuma movimentação ainda" />
          ) : (
            <div className="space-y-4">
              {groupMovementsByMonth(movs).map((group) => (
                <div key={group.ym}>
                  <div className="flex items-center justify-between gap-2 mb-1.5 pb-1.5 border-b border-white/5">
                    <span className="text-xs font-medium text-white/70">{formatMonthLabel(group.ym)}</span>
                    <span className="text-xs flex items-center gap-2 tabular-nums" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {group.totalEntrada > 0 && <span style={{ color: accents.emerald.hex }}>+{fmtBRL(group.totalEntrada)}</span>}
                      {group.totalSaida > 0 && <span style={{ color: accents.rose.hex }}>−{fmtBRL(group.totalSaida)}</span>}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {group.movements.map((m) => {
                      const isEntry = m.type === 'entrada'
                      const c = isEntry ? accents.emerald : accents.rose
                      const otherCofre = m.transferPeerCofreId ? cofreById(m.transferPeerCofreId) : null
                      const isTransfer = !!m.transferPeerCofreId
                      const isCaixa = !!m.linkedReceita
                      return editingMovId === m.id ? (
                        <EditMovementInline
                          key={m.id}
                          movement={m}
                          onSave={(patch) => { onUpdateMovement(cofre.id, m.id, patch); setEditingMovId(null) }}
                          onCancel={() => setEditingMovId(null)}
                        />
                      ) : (
                        <div key={m.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/5 group">
                          <div style={{ background: c.soft, color: c.hex }} className="p-1.5 rounded-md shrink-0">
                            {isCaixa ? <Wallet size={12} /> : isTransfer ? <ArrowLeftRight size={12} /> : isEntry ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">
                              {m.note || (
                                isCaixa ? 'Devolvido para o caixa' :
                                isTransfer ? (isEntry ? `Recebido de ${otherCofre?.name || 'outro cofre'}` : `Transferido para ${otherCofre?.name || 'outro cofre'}`) :
                                isEntry ? 'Entrada' : 'Saída'
                              )}
                            </div>
                            <div className="text-xs text-white/40">{formatDate(m.date)}</div>
                          </div>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: c.hex }} className="font-semibold tabular-nums shrink-0">
                            {isEntry ? '+' : '−'}{fmtBRL(m.amount)}
                          </span>
                          <div className="flex gap-0.5 shrink-0">
                            <button onClick={() => setEditingMovId(m.id)} className="p-1.5 rounded text-white/40 hover:text-amber-300 hover:bg-white/5"><Pencil size={12} /></button>
                            <button onClick={() => onRemoveMovement(cofre.id, m.id)} className="p-1.5 rounded text-white/40 hover:text-rose-400 hover:bg-white/5"><Trash2 size={12} /></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EditMovementInline({ movement, onSave, onCancel }) {
  const [amount, setAmount] = useState(movement.amount)
  const [date, setDate] = useState(movement.date || todayISO())
  const [note, setNote] = useState(movement.note || '')

  return (
    <div className="p-3 rounded-lg space-y-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="grid grid-cols-2 gap-2">
        <MoneyInput value={amount} onChange={setAmount} />
        <DateInput value={date} onChange={setDate} />
      </div>
      <TextInput value={note} onChange={setNote} placeholder="Observação" />
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="p-1.5 rounded text-white/50 hover:text-white hover:bg-white/5"><X size={14} /></button>
        <button onClick={() => onSave({ amount: Number(amount) || 0, date: date || todayISO(), note: note.trim() })} className="px-3 py-1.5 rounded bg-emerald-500/25 text-emerald-300 hover:bg-emerald-500/40 text-xs flex items-center gap-1"><Check size={13} /> Salvar</button>
      </div>
    </div>
  )
}

// ---------- CofresTab (export) ----------
export default function CofresTab({ cofres, addCofre, updateCofre, removeCofre, addMovement, transferBetweenCofres, transferCofreToCaixa, updateMovement, removeMovement }) {
  const [adding, setAdding] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [quickFor, setQuickFor] = useState(null)  // { id, kind }

  const totalGuardado = cofres.reduce((s, c) => s + cofreBalance(c), 0)
  const openCofre = cofres.find((c) => c.id === openId) || null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, letterSpacing: '-0.01em' }} className="text-2xl">Cofres</h2>
          <p className="text-sm text-white/50 mt-1">
            Total guardado: <strong className="text-white/85">{fmtBRL(totalGuardado)}</strong>
            {cofres.length > 0 && <span className="text-white/35"> em {cofres.length} cofre{cofres.length !== 1 ? 's' : ''}</span>}
          </p>
        </div>
        <Btn icon={adding ? X : Plus} onClick={() => setAdding(!adding)}>{adding ? 'Cancelar' : 'Novo cofre'}</Btn>
      </div>

      {adding && (
        <CofreForm
          onSave={(c) => { addCofre(c); setAdding(false) }}
          onCancel={() => setAdding(false)}
        />
      )}

      {cofres.length === 0 && !adding ? (
        <Card className="p-6">
          <div className="text-center py-8 space-y-3">
            <div className="inline-flex p-4 rounded-full" style={{ background: accents.cyan.soft, color: accents.cyan.hex }}>
              <PiggyBank size={32} />
            </div>
            <div className="text-white/70">Nenhum cofre ainda.</div>
            <div className="text-xs text-white/40 max-w-md mx-auto">Crie cofres pra organizar dinheiro guardado por objetivo — IPVA, casamento, reserva de emergência, viagem…</div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cofres.map((c) => (
            <CofreCard
              key={c.id}
              cofre={c}
              onOpen={() => setOpenId(c.id)}
              onQuickEntrada={() => { setOpenId(c.id); setQuickFor({ id: c.id, kind: 'entrada' }) }}
              onQuickSaida={() => { setOpenId(c.id); setQuickFor({ id: c.id, kind: 'saida' }) }}
            />
          ))}
        </div>
      )}

      {openCofre && (
        <CofreDetail
          cofre={openCofre}
          cofres={cofres}
          initialAction={quickFor && quickFor.id === openCofre.id ? quickFor.kind : null}
          onClose={() => { setOpenId(null); setQuickFor(null) }}
          onSave={updateCofre}
          onRemove={removeCofre}
          onAddMovement={addMovement}
          onTransfer={transferBetweenCofres}
          onTransferToCaixa={transferCofreToCaixa}
          onUpdateMovement={updateMovement}
          onRemoveMovement={removeMovement}
        />
      )}
    </div>
  )
}
