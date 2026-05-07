import { useState } from 'react'
import { Sparkles, Check, X, CreditCard, Banknote, Receipt, Calendar } from 'lucide-react'
import { Chip, Toggle, Btn, Field, ModePicker } from '../../components/ui'
import { MoneyInput, TextInput } from '../../components/ui'
import { accents, accentKeys, attrAccentKey } from '../../lib/constants'
import { todayISO, cardDueDayFor } from '../../lib/utils'

export default function DespesaForm({ config, initial, onSubmit, onCancel, isEditing = false }) {
  const firstAttr = (config.attributedTo.find((a) => a.isMine !== false) ?? config.attributedTo[0])?.name || ''
  const [d, setD] = useState(initial || {
    description: '', amount: '', date: todayISO(),
    category: '', paymentMethod: '', attributedTo: firstAttr,
    paid: false, dueDay: '', installmentCurrent: 1, installmentTotal: 1, recurring: false,
  })

  const initialMode = initial
    ? (initial.recurring ? 'recorrente' : Number(initial.installmentTotal) > 1 ? 'parcelado' : 'avista')
    : 'avista'
  const [mode, setMode] = useState(initialMode)

  const onChangeMode = (m) => {
    setMode(m)
    setD((prev) => ({
      ...prev,
      recurring: m === 'recorrente',
      installmentTotal: m === 'parcelado' ? Math.max(2, Number(prev.installmentTotal) || 2) : 1,
      installmentCurrent: m === 'parcelado' ? Math.max(1, Number(prev.installmentCurrent) || 1) : 1,
    }))
  }

  const setPayment = (v) => {
    setD((prev) => {
      const cardDue = cardDueDayFor(v, config)
      const wasCard = cardDueDayFor(prev.paymentMethod, config) != null
      const isCard = cardDue != null
      const next = { ...prev, paymentMethod: v }
      if (cardDue && (!prev.dueDay || cardDueDayFor(prev.paymentMethod, config) === Number(prev.dueDay))) next.dueDay = String(cardDue)
      if (isCard && !wasCard) next.paid = false
      if (!isCard && wasCard) next.paid = false
      return next
    })
  }

  const submit = () => {
    if (!d.description || !d.amount) return
    onSubmit({
      ...d,
      amount: Number(d.amount),
      dueDay: d.dueDay === '' ? null : Number(d.dueDay),
      recurring: mode === 'recorrente',
      installmentCurrent: mode === 'parcelado' ? Number(d.installmentCurrent) || 1 : 1,
      installmentTotal: mode === 'parcelado' ? Number(d.installmentTotal) || 1 : 1,
    })
  }

  const isParcelado = mode === 'parcelado'
  const isRecorrente = mode === 'recorrente'
  const totalParc = Number(d.installmentTotal) || 1
  const curParc = Number(d.installmentCurrent) || 1
  const valorParc = Number(d.amount) || 0
  const totalCompra = valorParc * totalParc
  const attrObj = config.attributedTo.find((a) => a.name === d.attributedTo)
  const isMine = attrObj ? attrObj.isMine !== false : true
  const chosenCard = config.cards.find((c) => c.name === d.paymentMethod)
  const cardDue = chosenCard?.dueDay ? Number(chosenCard.dueDay) : null
  const cardNames = config.cards.map((c) => c.name)
  const showJaPago = d.paymentMethod && !chosenCard && !isParcelado

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 mb-4 p-4 sm:p-5 space-y-4">
      {!isEditing && (
        <div className="flex items-center gap-2.5">
          <div style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37' }} className="p-1.5 rounded-lg shrink-0"><Sparkles size={14} /></div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">Novo gasto</div>
            <div className="text-xs text-white/45">Aluguel, mercado, presente, parcela…</div>
          </div>
        </div>
      )}

      <ModePicker value={mode} onChange={onChangeMode} options={[
        { value: 'avista',     label: 'À vista',    description: 'Pago tudo de uma vez (Pix, débito, cartão)', accent: 'emerald', icon: Banknote  },
        { value: 'parcelado',  label: 'Parcelado',  description: 'Dividido em parcelas mensais (cartão)',      accent: 'cyan',    icon: Receipt   },
        { value: 'recorrente', label: 'Gasto fixo', description: 'Repete todo mês (aluguel, assinaturas)',     accent: 'violet',  icon: Calendar  },
      ]} />

      {config.categories.length > 0 && (
        <Field label="Orçamento" hint="opcional">
          <div className="flex flex-wrap gap-1.5">
            {config.categories.map((c) => (
              <Chip key={c.name} selected={d.category === c.name} onClick={() => setD({ ...d, category: d.category === c.name ? '' : c.name })} accent={c.accent}>{c.name}</Chip>
            ))}
          </div>
        </Field>
      )}

      <Field label="Descrição">
        <TextInput value={d.description} onChange={(v) => setD({ ...d, description: v })} placeholder="Ex: Netflix, Restaurante X, Presente mãe" />
      </Field>

      {config.paymentMethods.length > 0 ? (
        <Field label="Forma de pagamento" hint={chosenCard && cardDue ? `vence dia ${cardDue}` : null}>
          <div className="flex flex-wrap gap-1.5">
            {config.paymentMethods.map((pm) => {
              const card = config.cards.find((c) => c.name === pm)
              const accent = card?.accent || (pm === 'Pix' ? 'emerald' : pm === 'Débito' ? 'sky' : hashAccent(pm))
              return (
                <Chip key={pm} selected={d.paymentMethod === pm} onClick={() => setPayment(d.paymentMethod === pm ? '' : pm)} accent={accent} icon={cardNames.includes(pm) ? CreditCard : Banknote}>{pm}</Chip>
              )
            })}
          </div>
        </Field>
      ) : (
        <Field label="Forma de pagamento" hint="cadastre nas Configurações">
          <div className="text-xs text-white/40 italic py-1">— nenhum método —</div>
        </Field>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={isParcelado ? 'Valor da parcela' : 'Valor'}>
          <MoneyInput value={d.amount} onChange={(v) => setD({ ...d, amount: v })} />
        </Field>
        <Field label="Data" hint="toque pra abrir o calendário">
          <TextInput type="date" value={d.date} onChange={(v) => setD({ ...d, date: v })} style={{ fontSize: 14, textAlign: 'center', padding: '10px 8px' }} />
        </Field>
      </div>

      {isParcelado && (
        <div className="p-3 sm:p-4 rounded-lg space-y-3" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.25)' }}>
          <div className="text-xs text-white/70 flex items-center gap-1.5"><Sparkles size={12} className="text-cyan-300" /> Em qual parcela você está?</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Parcela atual">
              <TextInput type="number" value={d.installmentCurrent} onChange={(v) => setD({ ...d, installmentCurrent: v })} placeholder="1" />
            </Field>
            <Field label="De quantas">
              <TextInput type="number" value={d.installmentTotal} onChange={(v) => setD({ ...d, installmentTotal: v })} placeholder="2" />
            </Field>
          </div>
          {totalCompra > 0 && (
            <div className="text-xs text-white/65">Total da compra: <strong className="text-white/90">{(totalParc * valorParc).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong><span className="text-white/35"> ({totalParc}× {valorParc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</span></div>
          )}
          {!isEditing && curParc < totalParc && (
            <div className="text-xs text-white/70 pt-2 border-t border-white/5">✨ Vou criar as <strong>{totalParc - curParc} parcela(s)</strong> seguintes de {valorParc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} nos próximos meses.</div>
          )}
        </div>
      )}

      {chosenCard && cardDue && (
        <div className="rounded-lg p-3" style={{ background: `${accents[chosenCard.accent]?.soft || 'rgba(212,175,55,0.10)'}`, border: `1px solid ${accents[chosenCard.accent]?.hex || accents.gold.hex}25` }}>
          <div className="text-xs flex items-start gap-2 text-white/75">
            <CreditCard size={13} className="mt-0.5 shrink-0" style={{ color: accents[chosenCard.accent]?.hex }} />
            Cartão <strong className="text-white/90">{chosenCard.name}</strong> · fatura vence dia <strong className="text-white/90">{cardDue}</strong>
          </div>
        </div>
      )}

      {config.attributedTo.length > 0 && (
        <Field label="Atribuído a" hint={!isMine && d.attributedTo ? 'vai pra A receber' : null}>
          <div className="flex flex-wrap gap-1.5">
            {[...config.attributedTo]
              .sort((a, b) => (a.isMine === false ? 1 : 0) - (b.isMine === false ? 1 : 0))
              .map((a) => {
                const accent = attrAccentKey(a.name, config.attributedTo)
                const sel = d.attributedTo === a.name
                const third = a.isMine === false
                return (
                  <Chip key={a.name} selected={sel} onClick={() => setD({ ...d, attributedTo: sel ? '' : a.name })} accent={third ? 'amber' : accent}>{third ? '🤝 ' : ''}{a.name}</Chip>
                )
              })}
          </div>
        </Field>
      )}

      <div className="space-y-3">
        {showJaPago && (
          <Toggle checked={!!d.paid} onChange={(v) => setD({ ...d, paid: v })} accent="emerald">Já pago</Toggle>
        )}
        {!chosenCard && (
          <Field label="Dia do mês que vence" hint="opcional · só o dia (1–31)">
            <TextInput type="number" inputMode="numeric" value={d.dueDay} onChange={(v) => setD({ ...d, dueDay: v })} placeholder="Ex: 5" style={{ maxWidth: 140 }} />
          </Field>
        )}
      </div>

      <div className="flex gap-2 justify-end pt-3 border-t border-white/5">
        {onCancel && <Btn variant="ghost" onClick={onCancel} icon={X}>Cancelar</Btn>}
        <Btn onClick={submit} icon={Check} disabled={!d.description || !d.amount}>Salvar</Btn>
      </div>
    </div>
  )
}
