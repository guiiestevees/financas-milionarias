import { useState } from 'react'
import { Wallet, Plus, Trash2, ArrowUpRight } from 'lucide-react'
import { Card, SectionTitle, Empty, Btn, MetricCard, MoneyInput, TextInput, Select } from '../../components/ui'
import { accents, hashAccent } from '../../lib/constants'
import { uid, fmtBRL, todayISO } from '../../lib/utils'

export default function ReceitasTab({ month, setMonth }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ source: month.config.incomeSources[0] || '', amount: '', date: todayISO(), notes: '' })

  const total = month.receitas.reduce((s, r) => s + Number(r.amount || 0), 0)
  const bySource = month.config.incomeSources.map((src) => ({
    src,
    total: month.receitas.filter((r) => r.source === src).reduce((s, r) => s + Number(r.amount || 0), 0),
  }))

  const add = () => {
    if (!draft.amount || !draft.source) return
    setMonth((m) => ({ ...m, receitas: [...m.receitas, { id: uid(), ...draft, amount: Number(draft.amount) }] }))
    setDraft({ source: month.config.incomeSources[0] || '', amount: '', date: todayISO(), notes: '' })
    setAdding(false)
  }
  const remove = (id) => setMonth((m) => ({ ...m, receitas: m.receitas.filter((r) => r.id !== id) }))

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
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mb-5 p-4 rounded-xl bg-white/5 border border-white/10">
            {month.config.incomeSources.length > 0
              ? <Select value={draft.source} onChange={(v) => setDraft({ ...draft, source: v })} options={month.config.incomeSources} className="sm:col-span-2" placeholder="Fonte de receita" />
              : <input value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} placeholder="Fonte de receita"
                       style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', outline: 'none' }}
                       className="px-3 py-2 rounded-lg text-sm placeholder:text-white/30 sm:col-span-2" />
            }
            <MoneyInput value={draft.amount} onChange={(v) => setDraft({ ...draft, amount: v })} />
            <TextInput type="date" value={draft.date} onChange={(v) => setDraft({ ...draft, date: v })} />
            <Btn onClick={add} disabled={!draft.amount || !draft.source}>Salvar</Btn>
          </div>
        )}

        {month.receitas.length === 0 ? <Empty text="Nenhuma receita ainda" /> : (
          <div className="space-y-1.5">
            {month.receitas.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/5 group">
                <div className="flex items-center gap-3">
                  <div style={{ background: accents.emerald.soft, color: accents.emerald.hex }} className="p-2 rounded-lg"><ArrowUpRight size={14} /></div>
                  <div>
                    <div className="font-medium">{r.source}</div>
                    <div className="text-xs text-white/40">{r.date ? new Date(r.date + 'T00:00').toLocaleDateString('pt-BR') : '—'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span style={{ color: accents.emerald.hex, fontFamily: 'JetBrains Mono, monospace' }} className="text-base font-semibold">+{fmtBRL(r.amount)}</span>
                  <button onClick={() => remove(r.id)} className="p-1.5 rounded text-white/35 hover:text-rose-400 hover:bg-rose-500/10 transition"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
