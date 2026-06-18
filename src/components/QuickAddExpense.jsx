import { useState, useMemo, useEffect } from 'react'
import { Plus, X, Check, CreditCard, Banknote, Loader2 } from 'lucide-react'
import { Chip, Toggle } from './ui'
import { MoneyInput, TextInput } from './ui'
import { accents, hashAccent } from '../lib/constants'
import { todayISO, cardDueDayFor } from '../lib/utils'

// ============================================================
// QuickAddExpense — registro de gasto em 2 toques.
//
// FAB (botão flutuante "+") sempre visível acima da bottom nav.
// Abre um bottom-sheet enxuto: valor + descrição + categoria +
// forma de pagamento. Categorias e métodos vêm ORDENADOS por uso
// recente — o que a pessoa mais usa aparece primeiro.
//
// Pra gasto parcelado/recorrente, o usuário usa o form completo
// na aba Gastos. Aqui é o caminho rápido do dia a dia:
// "acabei de pagar o almoço" → 2 toques → registrado.
// ============================================================

export default function QuickAddExpense({ month, onAdd }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paid, setPaid] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const config = month?.config
  const despesas = Array.isArray(month?.despesas) ? month.despesas : []

  // Ordena categorias e métodos por frequência de uso no mês atual.
  // O que a pessoa mais usa aparece primeiro — menos scroll, menos toque.
  const sortedCategories = useMemo(() => {
    if (!config?.categories) return []
    const counts = {}
    for (const d of despesas) {
      if (d?.category) counts[d.category] = (counts[d.category] || 0) + 1
    }
    return [...config.categories].sort((a, b) => (counts[b.name] || 0) - (counts[a.name] || 0))
  }, [config?.categories, despesas])

  const sortedMethods = useMemo(() => {
    if (!config?.paymentMethods) return []
    const counts = {}
    for (const d of despesas) {
      if (d?.paymentMethod) counts[d.paymentMethod] = (counts[d.paymentMethod] || 0) + 1
    }
    return [...config.paymentMethods].sort((a, b) => (counts[b] || 0) - (counts[a] || 0))
  }, [config?.paymentMethods, despesas])

  const chosenCard = config?.cards?.find((c) => c.name === paymentMethod)
  const isCard = !!chosenCard

  // Cartão nunca nasce "pago" (entra na fatura)
  useEffect(() => {
    if (isCard) setPaid(false)
  }, [isCard])

  // Bloqueia scroll do body com o sheet aberto
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])


  const reset = () => {
    setAmount('')
    setDescription('')
    setCategory('')
    setPaymentMethod('')
    setPaid(true)
  }

  const canSubmit = !!description.trim() && Number(amount) > 0 && !saving

  const submit = async () => {
    if (!canSubmit) return
    setSaving(true)
    try {
      const firstMine = (config?.attributedTo?.find((a) => a.isMine !== false) ?? config?.attributedTo?.[0])?.name || ''
      const cardDue = cardDueDayFor(paymentMethod, config)
      onAdd({
        description: description.trim(),
        amount: Number(amount),
        date: todayISO(),
        category,
        paymentMethod,
        attributedTo: firstMine,
        paid: isCard ? false : paid,
        dueDay: cardDue ?? null,
        installmentCurrent: 1,
        installmentTotal: 1,
        recurring: false,
        cofreId: '',
      })
      reset()
      setOpen(false)
      // Flash de confirmação no FAB
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1600)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* ===== FAB — flutua acima da bottom nav, canto direito ===== */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Registrar gasto rápido"
        className="fixed z-40 flex items-center justify-center rounded-full transition active:scale-90"
        style={{
          right: 18,
          bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))',
          width: 56,
          height: 56,
          background: savedFlash
            ? 'linear-gradient(180deg, #10b981, #0a8f63)'
            : 'linear-gradient(180deg, #d4af37, #a88a4a)',
          color: savedFlash ? '#fff' : '#070912',
          boxShadow: savedFlash
            ? '0 6px 20px rgba(16,185,129,0.45)'
            : '0 6px 20px rgba(212,175,55,0.40)',
          border: 'none',
        }}
      >
        {savedFlash ? <Check size={26} strokeWidth={2.5} /> : <Plus size={26} strokeWidth={2.5} />}
      </button>

      {/* ===== Bottom sheet ===== */}
      {open && (
        <div
          onClick={() => !saving && setOpen(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(7,9,18,0.7)', backdropFilter: 'blur(6px)' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
            style={{ background: 'var(--bg-app-soft)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
                  style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37' }}
                >
                  <Plus size={17} />
                </div>
                <div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-lg leading-tight">
                    Gasto rápido
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                    Entra em hoje · {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                disabled={saving}
                className="p-1.5 rounded-lg transition hover:opacity-70"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 pb-5 space-y-4">
              {/* Valor — campo principal, grande */}
              <div>
                <label className="text-[10px] uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                  Quanto?
                </label>
                <MoneyInput value={amount} onChange={setAmount} autoFocus />
              </div>

              {/* Descrição */}
              <div>
                <label className="text-[10px] uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                  Com o quê?
                </label>
                <TextInput
                  value={description}
                  onChange={setDescription}
                  placeholder="Ex: Almoço, Uber, Mercado…"
                />
              </div>

              {/* Categoria — mais usadas primeiro */}
              {sortedCategories.length > 0 && (
                <div>
                  <label className="text-[10px] uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                    Categoria <span className="normal-case tracking-normal opacity-70">(opcional)</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {sortedCategories.map((c) => (
                      <Chip
                        key={c.name}
                        selected={category === c.name}
                        onClick={() => setCategory(category === c.name ? '' : c.name)}
                        accent={c.accent}
                      >
                        {c.name}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              {/* Forma de pagamento — mais usadas primeiro */}
              {sortedMethods.length > 0 && (
                <div>
                  <label className="text-[10px] uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                    Pagou com? <span className="normal-case tracking-normal opacity-70">(opcional)</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {sortedMethods.map((pm) => {
                      const card = config.cards?.find((c) => c.name === pm)
                      const accent = card?.accent || (pm === 'Pix' ? 'emerald' : pm === 'Débito' ? 'sky' : hashAccent(pm))
                      return (
                        <Chip
                          key={pm}
                          selected={paymentMethod === pm}
                          onClick={() => setPaymentMethod(paymentMethod === pm ? '' : pm)}
                          accent={accent}
                          icon={card ? CreditCard : Banknote}
                        >
                          {pm}
                        </Chip>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Cartão selecionado → vai pra fatura. À vista → toggle "já pago" */}
              {isCard ? (
                <div
                  className="rounded-lg p-3 text-xs flex items-start gap-2"
                  style={{
                    background: accents[chosenCard.accent]?.soft || 'rgba(212,175,55,0.10)',
                    border: `1px solid color-mix(in srgb, ${accents[chosenCard.accent]?.hex || '#d4af37'} 19%, transparent)`,
                    color: 'var(--text-secondary)',
                  }}
                >
                  <CreditCard size={13} className="mt-0.5 shrink-0" style={{ color: accents[chosenCard.accent]?.hex }} />
                  <span>
                    Entra na fatura do <strong style={{ color: 'var(--text-primary)' }}>{chosenCard.name}</strong>
                    {chosenCard.dueDay ? <> · vence dia <strong style={{ color: 'var(--text-primary)' }}>{chosenCard.dueDay}</strong></> : null}
                  </span>
                </div>
              ) : (
                <Toggle checked={paid} onChange={setPaid} accent="emerald">Já pago</Toggle>
              )}

              {/* Salvar */}
              <button
                onClick={submit}
                disabled={!canSubmit}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition disabled:opacity-40"
                style={{
                  background: canSubmit ? 'linear-gradient(180deg, #d4af37, #a88a4a)' : 'var(--bg-elev1)',
                  color: canSubmit ? '#070912' : 'var(--text-muted)',
                  boxShadow: canSubmit ? '0 6px 16px rgba(212,175,55,0.30)' : 'none',
                }}
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={2.5} />}
                Registrar gasto
              </button>

              <div className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
                Parcelado ou gasto fixo? Use o formulário completo na aba <strong>Gastos</strong>.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
