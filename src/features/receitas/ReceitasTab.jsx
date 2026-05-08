import { useState } from 'react'
import { Wallet, Plus, Trash2, ArrowUpRight, Repeat2, Pencil, X } from 'lucide-react'
import { Card, SectionTitle, Empty, Btn, MetricCard, MoneyInput, Select, DateInput } from '../../components/ui'
import { accents, hashAccent } from '../../lib/constants'
import { uid, fmtBRL, todayISO } from '../../lib/utils'

const inputStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'white',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  display: 'block',
  padding: '8px 12px',
  borderRadius: '8px',
  fontSize: '16px',
}

function ReceitaForm({ config, values, onChange, onSave, onCancel, saveLabel = 'Salvar' }) {
  return (
    <div className="flex flex-col gap-2">
      {config.incomeSources.length > 0
        ? <Select value={values.source} onChange={(v) => onChange({ ...values, source: v })} options={config.incomeSources} className="w-full" placeholder="Fonte de receita" />
        : <input value={values.source} onChange={(e) => onChange({ ...values, source: e.target.value })} placeholder="Fonte de receita"
                 style={inputStyle} className="placeholder:text-white/30" />
      }
      <MoneyInput value={values.amount} onChange={(v) => onChange({ ...values, amount: v })} />
      <DateInput value={values.date} onChange={(iso) => onChange({ ...values, date: iso })} />
      <div className="flex gap-2">
        <Btn onClick={onSave} disabled={!values.amount || !values.source} className="flex-1">{saveLabel}</Btn>
        {onCancel && <button onClick={onCancel} className="p-2 rounded-lg text-white/40 hover:text-white/70 bg-white/5 transition shrink-0"><X size={14} /></button>}
      </div>
      <button
        type="button"
        onClick={() => onChange({ ...values, recurring: !values.recurring })}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition border ${values.recurring ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' : 'bg-white/5 text-white/40 border-white/10'}`}
      >
        <Repeat2 size={11} />
        Repetir todo mês
      </button>
    </div>
  )
}

export default function ReceitasTab({ month, setMonth }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ source: month.config.incomeSources[0] || '', amount: '', date: todayISO(), notes: '', recurring: false })
  const [editing, setEditing] = useState(null)
  const [editDraft, setEditDraft] = useState(null)

  const total = month.receitas.reduce((s, r) => s + Number(r.amount || 0), 0)
  const bySource = month.config.incomeSources.map((src) => ({
    src,
    total: month.receitas.filter((r) => r.source === src).reduce((s, r) => s + Number(r.amount || 0), 0),
  }))

  const add = () => {
    if (!draft.amount || !draft.source) return
    setMonth((m) => ({ ...m, receitas: [...m.receitas, { id: uid(), ...draft, amount: Number(draft.amount) }] }))
    setDraft({ source: month.config.incomeSources[0] || '', amount: '', date: todayISO(), notes: '', recurring: false })
    setAdding(false)
  }

  const remove = (id) => setMonth((m) => ({ ...m, receitas: m.receitas.filter((r) => r.id !== id) }))

  const startEdit = (r) => {
    setEditing(r.id)
    setEditDraft({ source: r.source, amount: r.amount, date: r.date || '', notes: r.notes || '', recurring: r.recurring || false })
  }

  const saveEdit = () => {
    if (!editDraft.amount || !editDraft.source) return
    setMonth((m) => ({ ...m, receitas: m.receitas.map((r) => r.id === editing ? { ...r, ...editDraft, amount: Number(editDraft.amount) } : r) }))
    setEditing(null)
    setEditDraft(null)
  }

  const cancelEdit = () => { setEditing(null); setEditDraft(null) }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Total recebido" value={fmtBRL(total)} icon={ArrowUpRight} accent="emerald" highlight />
        {bySource.map((b) => {
          const a = accents[hashAccent(b.src)]
          return (
            <Card key={b.src} className="p-5">
              <div style={{ letterSpacing: '0.18em' }} className="text-xs uppercase text-white/45 mb-2 truncate">{b.src}</div>
              <div style={{ fontFamily: 'Fraunces, serif', color: a.hex }} className="text-2xl font-medium tabular-nums">{fmtBRL(b.total)}</div>
            </Card>
          )
        })}
      </div>

      <Card className="p-4 sm:p-6">
        <SectionTitle icon={Wallet} title="Entradas do mês" subtitle={`${month.receitas.length} registro(s)`} accent="emerald"
          action={<Btn icon={Plus} onClick={() => setAdding(!adding)}>{adding ? 'Cancelar' : 'Adicionar'}</Btn>}
        />

        {adding && (
          <div className="mb-5 p-4 rounded-xl bg-white/5 border border-white/10">
            <ReceitaForm config={month.config} values={draft} onChange={setDraft} onSave={add} />
          </div>
        )}

        {month.receitas.length === 0 ? <Empty text="Nenhuma receita ainda" /> : (
          <div className="space-y-1.5">
            {month.receitas.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((r) =>
              editing === r.id && editDraft ? (
                <div key={r.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <ReceitaForm config={month.config} values={editDraft} onChange={setEditDraft} onSave={saveEdit} onCancel={cancelEdit} saveLabel="Salvar" />
                </div>
              ) : (
                <div key={r.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/5 group">
                  <div className="flex items-center gap-3">
                    <div style={{ background: accents.emerald.soft, color: accents.emerald.hex }} className="p-2 rounded-lg"><ArrowUpRight size={14} /></div>
                    <div>
                      <div className="font-medium">{r.source}</div>
                      <div className="text-xs text-white/40">
                        {r.date ? new Date(r.date + 'T00:00').toLocaleDateString('pt-BR') : '—'}
                        {r.recurring && <span className="ml-1.5 text-emerald-400/60">↻ mensal</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: accents.emerald.hex, fontFamily: 'JetBrains Mono, monospace' }} className="text-base font-semibold">+{fmtBRL(r.amount)}</span>
                    <button onClick={() => startEdit(r)} className="p-1.5 rounded text-white/35 hover:text-amber-300 hover:bg-white/5 transition"><Pencil size={14} /></button>
                    <button onClick={() => remove(r.id)} className="p-1.5 rounded text-white/35 hover:text-rose-400 hover:bg-rose-500/10 transition"><Trash2 size={14} /></button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
