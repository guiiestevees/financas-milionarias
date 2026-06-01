import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Settings, Sparkles, CreditCard, Banknote, Target, Users, Wallet, Check, X, AlertTriangle, Trash2, MessageCircle, LogOut, UserCircle2, Sun, Moon, Palette, PlayCircle, ArrowRight } from 'lucide-react'
import { Card, SectionTitle, Empty, Btn, AdderToggle, DeleteIconBtn, MiniInput, TextInput } from '../../components/ui'
import { AdderShell } from '../../components/ui'
import { accents, accentKeys, hashAccent } from '../../lib/constants'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import SubscriptionCard from './SubscriptionCard'

// ---------- Helpers de moeda BR ----------
// Aceita "200", "200,50", "200.50", "1.234,56" (formato BR) e converte pra number.
// Retorna null se inválido/vazio.
function parseMoneyBR(input) {
  if (input == null) return null
  const s = String(input).trim()
  if (!s) return null
  // Remove separadores de milhar e converte vírgula em ponto
  // "1.234,56" → "1234,56" → "1234.56"
  // "200,50"   → "200.50"
  // "200.50"   → "200.50" (se não tiver vírgula, mantém ponto como decimal)
  const hasComma = s.includes(',')
  let normalized = s
  if (hasComma) {
    // Vírgula é decimal; pontos são milhares — remove pontos
    normalized = s.replace(/\./g, '').replace(',', '.')
  }
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

// Formata número pra display "200,50" (sem R$, sem milhares — pra inputs)
function formatMoneyInput(n) {
  if (n == null || n === '' || !Number.isFinite(Number(n))) return ''
  const num = Number(n)
  // Se for inteiro, mostra sem decimais
  if (Number.isInteger(num)) return String(num)
  return num.toFixed(2).replace('.', ',')
}

// Filtra entrada permitindo só dígitos, vírgula e ponto (1 separador decimal)
function sanitizeMoneyInput(raw) {
  if (!raw) return ''
  // Só dígitos, vírgula e ponto
  let s = String(raw).replace(/[^\d.,]/g, '')
  // Permite no máximo 1 vírgula (separador decimal BR)
  const firstComma = s.indexOf(',')
  if (firstComma !== -1) {
    s = s.slice(0, firstComma + 1) + s.slice(firstComma + 1).replace(/,/g, '')
  }
  return s
}

// ---------- BrandConfig ----------
// Apenas o nome do USUÁRIO é editável. O nome do app "Domus" é fixo.
// Futuramente: foto de perfil opcional.
function BrandConfig({ brand, updateBrand }) {
  const [name, setName] = useState(brand?.name || '')
  return (
    <Card className="p-6" accent="gold">
      <SectionTitle icon={Sparkles} title="Como te chamar" subtitle="Personalize o nome que aparece no topo do app." accent="gold" />
      <div>
        <label className="uppercase text-white/45 mb-1.5 block" style={{ fontSize: '10px', letterSpacing: '0.1em' }}>Seu nome</label>
        <TextInput value={name} onChange={setName} onBlur={() => updateBrand({ name: name.trim() })} placeholder="Ex: João, Ju, Ana…" />
        <div className="text-xs text-white/40 mt-1">Aparece em letras pequenas douradas acima do título "Domus".</div>
      </div>
    </Card>
  )
}


// ---------- CardsConfig ----------
function CardsConfig({ config, setConfig }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [dueDay, setDueDay] = useState('')

  const reset = () => { setName(''); setDueDay(''); setAdding(false) }
  const submit = () => {
    const n = name.trim(); if (!n || config.cards.find((c) => c.name === n)) { reset(); return }
    const accent = accentKeys[config.cards.length % accentKeys.length]
    setConfig({ cards: [...config.cards, { name: n, accent, dueDay: dueDay === '' ? null : Number(dueDay) }], paymentMethods: config.paymentMethods.includes(n) ? config.paymentMethods : [...config.paymentMethods, n] })
    reset()
  }

  return (
    <Card className="p-4 sm:p-6">
      <SectionTitle icon={CreditCard} title="Cartões" subtitle="Cadastre o dia de vencimento da fatura" accent="cyan" action={<AdderToggle open={adding} onToggle={setAdding} />} />
      {adding && (
        <AdderShell accent="cyan" title="Novo cartão">
          <input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do cartão (ex: Safra, Nubank)"
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') reset() }}
            style={{ background: 'var(--bg-elev3)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', width: '100%', boxSizing: 'border-box', minWidth: 0, borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none' }}
            className="placeholder:text-white/30 focus:border-cyan-400" />
          <div>
            <div className="text-xs text-white/45 mb-1">Vence dia</div>
            <input type="number" value={dueDay} onChange={(e) => setDueDay(e.target.value)} placeholder="ex: 5"
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') reset() }}
              style={{ background: 'var(--bg-elev3)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', width: '100%', boxSizing: 'border-box', minWidth: 0, borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none' }}
              className="placeholder:text-white/30 tabular-nums focus:border-cyan-400" />
          </div>
          <button onClick={submit} disabled={!name.trim()} style={{ opacity: name.trim() ? 1 : 0.4 }} className="w-full px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition flex items-center justify-center gap-1.5"><Check size={14} /><span className="text-sm">Salvar cartão</span></button>
        </AdderShell>
      )}
      <div className="space-y-2">
        {config.cards.length === 0 && !adding && <Empty text="Nenhum cartão cadastrado" />}
        {config.cards.map((c) => {
          const a = accents[c.accent] || accents.cyan
          return (
            <div key={c.name} className="p-3 rounded-lg bg-white/5">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div style={{ background: a.soft, color: a.hex }} className="p-1.5 rounded-md shrink-0"><CreditCard size={14} /></div>
                  <span className="font-medium truncate">{c.name}</span>
                </div>
                <DeleteIconBtn onClick={() => setConfig({ cards: config.cards.filter((x) => x.name !== c.name), paymentMethods: config.paymentMethods.filter((p) => p !== c.name) })} />
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-white/45">Vence dia</span>
                  <MiniInput type="number" value={c.dueDay ?? ''} onChange={(e) => setConfig({ cards: config.cards.map((x) => x.name === c.name ? { ...x, dueDay: e.target.value === '' ? null : Number(e.target.value) } : x) })} placeholder="—" width={48} />
                </div>
                <div className="flex gap-1 shrink-0">
                  {accentKeys.map((k) => (
                    <button key={k} onClick={() => setConfig({ cards: config.cards.map((x) => x.name === c.name ? { ...x, accent: k } : x) })} className="w-5 h-5 rounded-full transition shrink-0" style={{ background: accents[k].hex, outline: c.accent === k ? '2px solid white' : 'none', outlineOffset: 1 }} title={k} />
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ---------- PaymentMethodsConfig ----------
function PaymentMethodsConfig({ config, setConfig }) {
  const [adding, setAdding] = useState(false)
  const [val, setVal] = useState('')
  const cardNames = config.cards.map((c) => c.name)
  const cashOnly = config.paymentMethods.filter((p) => !cardNames.includes(p))
  const submit = () => { const v = val.trim(); if (v && !config.paymentMethods.includes(v)) setConfig({ paymentMethods: [...config.paymentMethods, v] }); setVal(''); setAdding(false) }

  return (
    <Card className="p-4 sm:p-6">
      <SectionTitle icon={Banknote} title="Métodos à vista" subtitle="Pix, Débito, Boleto. Cartões são gerenciados acima." accent="emerald" action={<AdderToggle open={adding} onToggle={setAdding} />} />
      {adding && (
        <AdderShell accent="emerald" title="Novo método">
          <div className="flex gap-2 items-center">
            <input autoFocus type="text" value={val} onChange={(e) => setVal(e.target.value)} placeholder="Ex: Boleto, Dinheiro"
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setVal(''); setAdding(false) } }}
              style={{ background: 'var(--bg-elev3)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', flex: 1, minWidth: 0, boxSizing: 'border-box', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none' }}
              className="placeholder:text-white/30 focus:border-emerald-400" />
            <button onClick={submit} disabled={!val.trim()} style={{ opacity: val.trim() ? 1 : 0.4 }} className="px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition shrink-0 flex items-center gap-1.5"><Check size={14} /><span className="text-sm">Salvar</span></button>
          </div>
        </AdderShell>
      )}
      <div className="flex flex-wrap gap-2">
        {cashOnly.length === 0 && !adding && <Empty text="Nenhum método à vista cadastrado" />}
        {cashOnly.map((p) => {
          const a = accents[hashAccent(p)]
          return (
            <div key={p} className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-lg" style={{ background: a.soft, border: `1px solid ${a.hex}30` }}>
              <span className="text-sm" style={{ color: a.hex }}>{p}</span>
              <button onClick={() => setConfig({ paymentMethods: config.paymentMethods.filter((x) => x !== p) })} className="p-0.5 rounded text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition"><X size={12} /></button>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ---------- BudgetInput ----------
// Input de moeda BR (aceita "200,50") com state local pra display livre
// e sincroniza number pro pai. Usado pra editar orçamentos existentes.
function BudgetInput({ value, onChange }) {
  // State local pro texto digitado (permite vírgula incompleta tipo "200,")
  const [text, setText] = useState(formatMoneyInput(value))
  const [focused, setFocused] = useState(false)

  // Quando desfocado, ressincroniza display com valor "canônico" do pai
  // (caso o valor tenha sido alterado externamente)
  const displayValue = focused ? text : formatMoneyInput(value)

  const handleChange = (e) => {
    const sanitized = sanitizeMoneyInput(e.target.value)
    setText(sanitized)
    const parsed = parseMoneyBR(sanitized)
    onChange(parsed)  // null se vazio/inválido
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={() => { setText(formatMoneyInput(value)); setFocused(true) }}
      onBlur={() => setFocused(false)}
      placeholder="—"
      style={{
        background: 'var(--bg-elev3)',
        border: '1px solid var(--border-medium)',
        color: 'var(--text-primary)',
        width: 80,
        boxSizing: 'border-box',
        minWidth: 0,
        borderRadius: 6,
        padding: '4px 8px',
        fontSize: 13,
        outline: 'none',
        fontFamily: 'JetBrains Mono, monospace',
      }}
      className="placeholder:text-white/30 focus:border-rose-400"
    />
  )
}

// ---------- CategoriesConfig ----------
function CategoriesConfig({ config, setConfig }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [budget, setBudget] = useState('')  // string com vírgula ou ponto — OPCIONAL
  const reset = () => { setName(''); setBudget(''); setAdding(false) }
  const parsedBudget = parseMoneyBR(budget)
  // Limite é opcional — basta o nome pra criar
  const canSubmit = !!name.trim()
  const add = () => {
    const n = name.trim()
    if (!n || config.categories.find((c) => c.name === n)) { reset(); return }
    const b = parseMoneyBR(budget)
    const finalBudget = (b != null && b > 0) ? b : 0  // 0 = sem limite
    const accent = accentKeys[config.categories.length % accentKeys.length]
    setConfig({ categories: [...config.categories, { name: n, budget: finalBudget, accent }] }); reset()
  }

  return (
    <Card className="p-4 sm:p-6 lg:col-span-2">
      <SectionTitle icon={Target} title="Categorias" subtitle="Agrupe gastos. Defina limite mensal pra acompanhar de perto (opcional)." accent="rose" action={<AdderToggle open={adding} onToggle={setAdding} label="Nova categoria" />} />
      <div className="rounded-lg p-3 mb-4 text-xs text-white/65 leading-relaxed" style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}>
        <div className="flex items-start gap-2"><Sparkles size={14} className="mt-0.5 shrink-0 text-rose-300" />
          <div>Crie uma categoria pra cada tipo de gasto — ex: <span className="text-rose-300">Mercado, Luz, Saídas, Lazer, Gasolina, Uber</span>. Coloque limite mensal nas que quer controlar de perto (elas vão pro topo do painel). Sem limite, a categoria só agrupa os gastos.</div>
        </div>
      </div>
      {adding && (
        <AdderShell accent="rose" title="Nova categoria">
          <input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome (ex: Mercado, Saídas, Gasolina)"
            onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) add(); if (e.key === 'Escape') reset() }}
            style={{ background: 'var(--bg-elev3)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', width: '100%', boxSizing: 'border-box', minWidth: 0, borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none' }}
            className="placeholder:text-white/30 focus:border-rose-400" />
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg overflow-hidden flex-1" style={{ background: 'var(--bg-elev3)', border: '1px solid var(--border-strong)' }}>
              <span className="px-3 text-sm text-white/40" style={{ fontFamily: 'JetBrains Mono, monospace' }}>R$</span>
              <input type="text" inputMode="decimal" value={budget} onChange={(e) => setBudget(sanitizeMoneyInput(e.target.value))} placeholder="Limite (opcional)"
                onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) add(); if (e.key === 'Escape') reset() }}
                style={{ background: 'transparent', color: 'var(--text-primary)', flex: 1, outline: 'none', padding: '8px 12px 8px 0', fontSize: 14, fontFamily: 'JetBrains Mono, monospace' }}
                className="placeholder:text-white/30" />
            </div>
            <button onClick={add} disabled={!canSubmit} style={{ opacity: canSubmit ? 1 : 0.4 }} className="px-3 py-2 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition shrink-0 flex items-center gap-1.5"><Check size={14} /><span className="text-sm">Salvar</span></button>
          </div>
          <div className="text-[11px] text-white/40 px-0.5">Deixe o limite vazio pra criar uma categoria simples — você pode adicionar depois.</div>
        </AdderShell>
      )}
      <div className="space-y-2">
        {config.categories.length === 0 && !adding && <Empty text="Nenhuma categoria cadastrada" />}
        {config.categories.map((c) => {
          const a = accents[c.accent] || accents.rose
          const hasBudget = (Number(c.budget) || 0) > 0
          return (
            <div key={c.name} className="p-3 rounded-lg bg-white/5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div style={{ background: a.soft, color: a.hex }} className="p-1.5 rounded-md shrink-0"><Target size={13} /></div>
                  <span className="font-medium truncate">{c.name}</span>
                  {!hasBudget && <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0" style={{ background: 'var(--bg-elev3)', color: 'var(--text-muted)' }}>sem limite</span>}
                </div>
                <DeleteIconBtn onClick={() => setConfig({ categories: config.categories.filter((x) => x.name !== c.name) })} />
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-white/45">Limite</span>
                  <div className="flex items-center rounded overflow-hidden" style={{ background: 'var(--bg-elev3)', border: '1px solid var(--border-medium)' }}>
                    <span className="px-1.5 text-xs text-white/35" style={{ fontFamily: 'JetBrains Mono, monospace' }}>R$</span>
                    <BudgetInput
                      value={c.budget}
                      onChange={(n) => setConfig({ categories: config.categories.map((x) => x.name === c.name ? { ...x, budget: n } : x) })}
                    />
                  </div>
                  <span className="text-[11px] text-white/35">(0 = sem limite)</span>
                </div>
                <div className="flex gap-1">
                  {accentKeys.map((k) => (
                    <button key={k} onClick={() => setConfig({ categories: config.categories.map((x) => x.name === c.name ? { ...x, accent: k } : x) })} className="w-4 h-4 rounded-full transition" style={{ background: accents[k].hex, outline: c.accent === k ? '2px solid white' : 'none', outlineOffset: 1 }} />
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ---------- AttributedConfig ----------
function AttributedConfig({ config, setConfig }) {
  const [adding, setAdding] = useState(false)
  const [val, setVal] = useState('')
  const submit = () => {
    const v = val.trim(); if (!v || config.attributedTo.find((a) => a.name === v)) { setVal(''); setAdding(false); return }
    const accent = accentKeys[config.attributedTo.length % accentKeys.length]
    setConfig({ attributedTo: [...config.attributedTo, { name: v, isMine: true, accent }] }); setVal(''); setAdding(false)
  }

  return (
    <Card className="p-4 sm:p-6 lg:col-span-2">
      <SectionTitle icon={Users} title="Atribuído a" subtitle="Quem é dono do gasto. 🤝 = de terceiros (vai pra A receber)" accent="fuchsia" action={<AdderToggle open={adding} onToggle={setAdding} />} />
      <div className="rounded-lg p-3 mb-4 text-xs text-white/65 leading-relaxed" style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}>
        Marque com <strong className="text-emerald-300">👤 É meu</strong> os gastos que descontam do seu saldo (Eu, Casal, sua empresa). Marque com <strong className="text-amber-300">🤝 Adiantamento</strong> os de terceiros (Pai, Sogro) — vão pra "A receber" e <strong>não descontam</strong>.
      </div>
      {adding && (
        <AdderShell accent="fuchsia" title="Novo atribuído">
          <div className="flex gap-2 items-center">
            <input autoFocus type="text" value={val} onChange={(e) => setVal(e.target.value)} placeholder="Ex: Esposa, Pai, Empresa X"
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setVal(''); setAdding(false) } }}
              style={{ background: 'var(--bg-elev3)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', flex: 1, minWidth: 0, boxSizing: 'border-box', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none' }}
              className="placeholder:text-white/30 focus:border-fuchsia-400" />
            <button onClick={submit} disabled={!val.trim()} style={{ opacity: val.trim() ? 1 : 0.4 }} className="px-3 py-2 rounded-lg bg-fuchsia-500/20 text-fuchsia-300 hover:bg-fuchsia-500/30 transition shrink-0 flex items-center gap-1.5"><Check size={14} /><span className="text-sm">Salvar</span></button>
          </div>
        </AdderShell>
      )}
      <div className="space-y-1.5">
        {config.attributedTo.length === 0 && !adding && <Empty text="Nenhum atribuído cadastrado" />}
        {config.attributedTo.map((p, idx) => {
          const a = accents[p.accent || accentKeys[idx % accentKeys.length]] || accents.gold
          const mine = p.isMine !== false
          return (
            <div key={p.name} className="flex items-center justify-between p-3 rounded-lg gap-2 flex-wrap" style={{ background: a.soft, border: `1px solid ${a.hex}25` }}>
              <div className="flex items-center gap-3 min-w-0"><span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: a.hex }} /><span className="font-medium truncate">{p.name}</span></div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setConfig({ attributedTo: config.attributedTo.map((x) => x.name === p.name ? { ...x, isMine: x.isMine === false ? true : false } : x) })} className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition shrink-0" style={{ background: mine ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: mine ? accents.emerald.hex : accents.amber.hex, border: `1px solid ${mine ? accents.emerald.hex : accents.amber.hex}30` }}>
                  {mine ? '👤 É meu' : '🤝 Adiantamento'}
                </button>
                <DeleteIconBtn onClick={() => setConfig({ attributedTo: config.attributedTo.filter((x) => x.name !== p.name) })} />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ---------- IncomeSourcesConfig ----------
function IncomeSourcesConfig({ config, setConfig }) {
  const [adding, setAdding] = useState(false)
  const [val, setVal] = useState('')
  const submit = () => { const v = val.trim(); if (v && !config.incomeSources.includes(v)) setConfig({ incomeSources: [...config.incomeSources, v] }); setVal(''); setAdding(false) }

  return (
    <Card className="p-4 sm:p-6">
      <SectionTitle icon={Wallet} title="Fontes de receita" subtitle="Empresas / origens das suas entradas" accent="emerald" action={<AdderToggle open={adding} onToggle={setAdding} label="Nova" />} />
      {adding && (
        <AdderShell accent="emerald" title="Nova fonte">
          <div className="flex gap-2 items-center">
            <input autoFocus type="text" value={val} onChange={(e) => setVal(e.target.value)} placeholder="Ex: Alquimia Digital, Rico Seguros"
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setVal(''); setAdding(false) } }}
              style={{ background: 'var(--bg-elev3)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', flex: 1, minWidth: 0, boxSizing: 'border-box', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none' }}
              className="placeholder:text-white/30 focus:border-emerald-400" />
            <button onClick={submit} disabled={!val.trim()} style={{ opacity: val.trim() ? 1 : 0.4 }} className="px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition shrink-0 flex items-center gap-1.5"><Check size={14} /><span className="text-sm">Salvar</span></button>
          </div>
        </AdderShell>
      )}
      <div className="flex flex-wrap gap-2">
        {config.incomeSources.length === 0 && !adding && <Empty text="Nenhuma fonte cadastrada" />}
        {config.incomeSources.map((p) => {
          const a = accents[hashAccent(p)]
          return (
            <div key={p} className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-lg" style={{ background: a.soft, border: `1px solid ${a.hex}30` }}>
              <span className="text-sm">{p}</span>
              <button onClick={() => setConfig({ incomeSources: config.incomeSources.filter((x) => x !== p) })} className="p-0.5 rounded text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition"><X size={12} /></button>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ---------- WhatsAppConfig ----------
// Número do bot na Cloud API (formato wa.me, só dígitos)
const BOT_PHONE = '5519997472896'  // +55 (19) 99747-2896 — Alfred
const BOT_PHONE_DISPLAY = '+55 (19) 99747-2896'

function WhatsAppConfig({ whatsappPhone, updateWhatsappPhone }) {
  const [draft, setDraft] = useState(whatsappPhone || '')
  const [savedJustNow, setSavedJustNow] = useState(false)

  const normalize = (input) => {
    const digits = (input || '').replace(/\D/g, '')
    if (!digits) return null
    if (digits.startsWith('55') && digits.length >= 12) return digits
    if (digits.length === 10 || digits.length === 11) return '55' + digits
    if (digits.length >= 10) return digits
    return null
  }

  const formatBR = (digits) => {
    if (!digits) return ''
    const d = digits.replace(/\D/g, '')
    // 5511999998888 → +55 (11) 99999-8888
    if (d.length === 13 && d.startsWith('55')) return `+55 (${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`
    if (d.length === 12 && d.startsWith('55')) return `+55 (${d.slice(2,4)}) ${d.slice(4,8)}-${d.slice(8)}`
    return '+' + d
  }

  const save = () => {
    const normalized = normalize(draft)
    updateWhatsappPhone(normalized)
    setSavedJustNow(true)
    setTimeout(() => setSavedJustNow(false), 2500)
  }

  const remove = () => {
    setDraft('')
    updateWhatsappPhone(null)
  }

  const current = whatsappPhone
  const greeting = 'Oi, quero começar'
  const waLink = `https://wa.me/${BOT_PHONE}?text=${encodeURIComponent(greeting)}`

  return (
    <Card className="p-4 sm:p-6" accent="emerald">
      <SectionTitle icon={MessageCircle} title="WhatsApp" subtitle="Registre gastos conversando com o Alfred" accent="emerald" />

      {/* Apresentação do Alfred */}
      <div className="rounded-lg p-3 mb-4 flex items-center gap-3" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <img
          src="/alfred.png"
          alt="Alfred"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
          style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(16,185,129,0.35)', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}
        />
        <div className="text-xs text-white/70 leading-relaxed">
          Conheça o <strong className="text-emerald-300">Alfred</strong> 🎩, seu mordomo financeiro no WhatsApp. Salve seu número aqui e converse com ele em <strong className="text-emerald-300">{BOT_PHONE_DISPLAY}</strong> — ele entende gastos no formato livre, ex: <em>"calça 200 nubank parcelado 4x"</em>.
        </div>
      </div>

      {current ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-elev1)', border: '1px solid var(--border-medium)' }}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div style={{ background: accents.emerald.soft, color: accents.emerald.hex }} className="p-1.5 rounded-md shrink-0"><MessageCircle size={14} /></div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{formatBR(current)}</div>
                <div className="text-xs text-white/45">vinculado a essa conta</div>
              </div>
            </div>
            <button onClick={remove} className="text-xs text-white/45 hover:text-rose-400 transition shrink-0">Desvincular</button>
          </div>

          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition w-full"
            style={{
              background: '#25D366',
              color: 'white',
              boxShadow: '0 4px 14px rgba(37,211,102,0.25)',
            }}
          >
            <MessageCircle size={16} /> Abrir conversa com Alfred
          </a>

          <p className="text-xs text-white/45 text-center leading-relaxed">
            Clica no botão acima pra abrir o WhatsApp com uma saudação pronta. Quando você enviar, o Alfred responde com um tutorial rápido — e fica ao seu dispor pra registrar gastos, receitas e tirar dúvidas das suas finanças.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            inputMode="tel"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="(11) 99999-8888"
            style={{
              background: 'var(--bg-elev3)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              width: '100%',
              outline: 'none',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 14,
              boxSizing: 'border-box',
            }}
            className="placeholder:text-white/35 focus:border-emerald-400"
          />
          <Btn icon={Check} onClick={save} disabled={!draft.trim()}>
            {savedJustNow ? 'Salvo!' : 'Salvar número'}
          </Btn>
        </div>
      )}
    </Card>
  )
}

// ---------- AppearanceSection (Tema light/dark) ----------
// ---------- HelpSection ----------
// Card sempre visível em Configurações com acesso à página de tutoriais.
// (No painel também aparece um aviso compacto dispensável.)
function HelpSection() {
  return (
    <Card className="p-4 sm:p-6">
      <SectionTitle icon={PlayCircle} title="Ajuda & tutoriais" subtitle="Vídeos pra você dominar o app." accent="gold" />
      <Link
        to="/tutorial"
        className="flex items-center gap-3 p-4 rounded-xl transition hover:opacity-95"
        style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.04))',
          border: '1px solid rgba(212,175,55,0.3)',
        }}
      >
        <div className="p-2 rounded-lg shrink-0" style={{ background: 'rgba(212,175,55,0.18)', color: 'var(--accent-gold)' }}>
          <PlayCircle size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
            Ver tutoriais
          </div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Vídeos curtos sobre cartões, Alfred, cofres e mais
          </div>
        </div>
        <ArrowRight size={16} className="shrink-0" style={{ color: 'var(--accent-gold)' }} />
      </Link>
    </Card>
  )
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme()

  const Option = ({ value, label, icon: Icon, description }) => {
    const isActive = theme === value
    return (
      <button
        onClick={() => setTheme(value)}
        className="flex-1 flex flex-col items-start gap-1.5 p-4 rounded-xl transition text-left"
        style={{
          background: isActive ? 'rgba(212,175,55,0.1)' : 'var(--bg-elev2)',
          border: `1.5px solid ${isActive ? 'rgba(212,175,55,0.5)' : 'var(--border-soft)'}`,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg"
            style={{
              background: isActive ? 'rgba(212,175,55,0.15)' : 'var(--bg-elev3)',
              color: isActive ? '#d4af37' : 'var(--text-tertiary)',
            }}
          >
            <Icon size={15} />
          </div>
          <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
            {label}
          </div>
          {isActive && <Check size={14} style={{ color: '#d4af37', marginLeft: 'auto' }} />}
        </div>
        <div className="text-xs leading-snug" style={{ color: 'var(--text-tertiary)' }}>
          {description}
        </div>
      </button>
    )
  }

  return (
    <Card className="p-4 sm:p-6">
      <SectionTitle icon={Palette} title="Aparência" subtitle="Escolha como o app deve parecer." accent="gold" />
      <div className="flex flex-col sm:flex-row gap-3">
        <Option
          value="dark"
          label="Escuro"
          icon={Moon}
          description="O visual original — recomendado pra uso noturno."
        />
        <Option
          value="light"
          label="Claro"
          icon={Sun}
          description="Fundo branco quente. Bom pra ambientes iluminados."
        />
      </div>
      <div className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        Sua preferência é salva neste dispositivo.
      </div>
    </Card>
  )
}

// ---------- AccountSection (Sair) ----------
// Botão de logout dedicado. Antes ficava no Header, mas como era próximo
// do seletor de mês, gerava clique acidental de logout.
function AccountSection() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    if (loading) return
    setLoading(true)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (e) {
      console.error('signOut error:', e)
      setLoading(false)
    }
  }

  return (
    <Card className="p-4 sm:p-6">
      <SectionTitle icon={UserCircle2} title="Conta" subtitle="Sua sessão atual." accent="gold" />
      <div className="space-y-3">
        {user?.email && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg" style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}>
            <div className="min-w-0">
              <div className="text-xs text-white/45 mb-0.5">Logado como</div>
              <div className="text-sm text-white/85 truncate font-mono">{user.email}</div>
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition disabled:opacity-60"
          style={{
            background: 'var(--bg-elev1)',
            border: '1px solid var(--border-medium)',
            color: 'var(--text-primary)',
          }}
        >
          <LogOut size={15} />
          {loading ? 'Saindo…' : 'Sair desta conta'}
        </button>
      </div>
    </Card>
  )
}

// ---------- DangerZone ----------
function DangerZone() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canConfirm = confirmText.trim().toUpperCase() === 'EXCLUIR'

  const reset = () => { setOpen(false); setConfirmText(''); setError(''); setLoading(false) }

  const handleDelete = async () => {
    if (!canConfirm || loading) return
    setError('')
    setLoading(true)
    try {
      if (!supabase) {
        setError('Modo local — não há conta pra excluir.')
        setLoading(false)
        return
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Sessão expirada. Faça login novamente.')
        setLoading(false)
        return
      }
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error || 'Falha ao excluir conta.')
        setLoading(false)
        return
      }
      // Conta excluída — desloga e manda pro login
      await signOut()
      navigate('/login', { replace: true })
    } catch (e) {
      setError('Erro de rede. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <Card className="p-4 sm:p-6" accent="rose">
      <SectionTitle icon={AlertTriangle} title="Zona de perigo" subtitle="Ações irreversíveis. Cuidado." accent="rose" />

      {!open ? (
        <div className="space-y-3">
          <div className="text-sm text-white/65 leading-relaxed">
            Excluir sua conta apaga permanentemente <strong className="text-white/85">todos os seus dados</strong>:
            receitas, despesas, orçamentos, cofres e perfil. Esta ação não pode ser desfeita.
          </div>
          <Btn icon={Trash2} variant="ghost" onClick={() => setOpen(true)}>
            Excluir minha conta
          </Btn>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-3 rounded-lg text-sm leading-relaxed" style={{ background: accents.rose.soft, border: `1px solid ${accents.rose.hex}40`, color: 'rgba(255,255,255,0.85)' }}>
            <strong className="text-rose-200">Tem certeza?</strong> Todos os seus dados serão apagados imediatamente
            e não há como recuperar. Para confirmar, digite <strong className="text-white">EXCLUIR</strong> no campo abaixo.
          </div>

          <input
            type="text"
            autoFocus
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder='Digite "EXCLUIR" para confirmar'
            style={{
              background: 'rgba(244,63,94,0.06)',
              border: `1px solid ${accents.rose.hex}40`,
              color: 'var(--text-primary)',
              width: '100%',
              outline: 'none',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 14,
            }}
            className="placeholder:text-white/30 focus:border-rose-400"
          />

          {error && (
            <div className="text-sm text-rose-300 p-2 rounded" style={{ background: 'rgba(244,63,94,0.08)' }}>
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Btn variant="ghost" onClick={reset} icon={X} disabled={loading}>Cancelar</Btn>
            <button
              onClick={handleDelete}
              disabled={!canConfirm || loading}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5"
              style={{
                background: canConfirm && !loading ? accents.rose.hex : 'rgba(244,63,94,0.2)',
                color: canConfirm && !loading ? 'white' : 'rgba(255,255,255,0.4)',
                cursor: canConfirm && !loading ? 'pointer' : 'not-allowed',
                border: 'none',
              }}
            >
              <Trash2 size={14} />
              {loading ? 'Excluindo…' : 'Excluir conta permanentemente'}
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}

// ---------- ConfigTab (export) ----------
export default function ConfigTab({ month, setMonth, brand, updateBrand, setConfig, whatsappPhone, updateWhatsappPhone }) {
  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6">
        <SectionTitle icon={Settings} title="Configurações" subtitle="Personalize seu app, cartões, categorias, atribuídos e orçamentos." accent="gold" />
        <div className="text-sm text-white/55 leading-relaxed">Estas configurações são globais — valem para todos os meses.</div>
      </Card>

      {/* Personalização — nome do usuário */}
      <BrandConfig brand={brand} updateBrand={updateBrand} />

      {/* 1º — Tutoriais (mais útil pra quem tá começando) */}
      <HelpSection />

      {/* 2º — Alfred no WhatsApp */}
      <WhatsAppConfig whatsappPhone={whatsappPhone} updateWhatsappPhone={updateWhatsappPhone} />

      {/* 3º — Aparência (tema light/dark) */}
      <AppearanceSection />

      {/* Configurações financeiras (cartões, categorias, etc) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardsConfig config={month.config} setConfig={setConfig} />
        <PaymentMethodsConfig config={month.config} setConfig={setConfig} />
        <CategoriesConfig config={month.config} setConfig={setConfig} />
        <AttributedConfig config={month.config} setConfig={setConfig} />
        <IncomeSourcesConfig config={month.config} setConfig={setConfig} />
      </div>

      {/* Conta + Assinatura juntas (lógica de gestão pessoal) */}
      <AccountSection />
      <SubscriptionCard />

      {/* Zona de perigo no fim de tudo */}
      <div className="pt-4 border-t border-white/5">
        <DangerZone />
        <div className="mt-3 text-xs text-white/35 text-center">
          <Link to="/privacidade" className="hover:text-white/60 underline underline-offset-2 transition">
            Política de Privacidade
          </Link>
        </div>
      </div>
    </div>
  )
}
