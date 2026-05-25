import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Settings, Sparkles, CreditCard, Banknote, Target, Users, Wallet, Check, X, AlertTriangle, Trash2 } from 'lucide-react'
import { Card, SectionTitle, Empty, Btn, AdderToggle, DeleteIconBtn, MiniInput, TextInput } from '../../components/ui'
import { AdderShell } from '../../components/ui'
import { accents, accentKeys, hashAccent } from '../../lib/constants'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

// ---------- BrandConfig ----------
function BrandConfig({ brand, updateBrand }) {
  const [name, setName] = useState(brand?.name || '')
  const [subtitle, setSubtitle] = useState(brand?.subtitle || 'Finanças Milionárias')
  return (
    <Card className="p-6" accent="gold">
      <SectionTitle icon={Sparkles} title="Identidade do app" subtitle="Personalize o título que aparece no topo." accent="gold" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="uppercase text-white/45 mb-1.5 block" style={{ fontSize: '10px', letterSpacing: '0.1em' }}>Seu nome (em cima)</label>
          <TextInput value={name} onChange={setName} onBlur={() => updateBrand({ name: name.trim() })} placeholder="Ex: João, Ju, Ana…" />
          <div className="text-xs text-white/40 mt-1">Aparece em letras pequenas douradas no topo.</div>
        </div>
        <div>
          <label className="uppercase text-white/45 mb-1.5 block" style={{ fontSize: '10px', letterSpacing: '0.1em' }}>Nome do app (subtítulo grande)</label>
          <TextInput value={subtitle} onChange={setSubtitle} onBlur={() => updateBrand({ subtitle: subtitle.trim() || 'Finanças Milionárias' })} placeholder="Finanças Milionárias" />
          <div className="text-xs text-white/40 mt-1">Padrão: "Finanças Milionárias". Última palavra recebe o destaque dourado.</div>
        </div>
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
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', width: '100%', boxSizing: 'border-box', minWidth: 0, borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none' }}
            className="placeholder:text-white/30 focus:border-cyan-400" />
          <div>
            <div className="text-xs text-white/45 mb-1">Vence dia</div>
            <input type="number" value={dueDay} onChange={(e) => setDueDay(e.target.value)} placeholder="ex: 5"
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') reset() }}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', width: '100%', boxSizing: 'border-box', minWidth: 0, borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none' }}
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
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', flex: 1, minWidth: 0, boxSizing: 'border-box', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none' }}
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

// ---------- CategoriesConfig ----------
function CategoriesConfig({ config, setConfig }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [budget, setBudget] = useState('')
  const reset = () => { setName(''); setBudget(''); setAdding(false) }
  const canSubmit = name.trim() && Number(budget) > 0
  const add = () => {
    const n = name.trim(); const b = Number(budget)
    if (!n || !b || b <= 0 || config.categories.find((c) => c.name === n)) { reset(); return }
    const accent = accentKeys[config.categories.length % accentKeys.length]
    setConfig({ categories: [...config.categories, { name: n, budget: b, accent }] }); reset()
  }

  return (
    <Card className="p-4 sm:p-6 lg:col-span-2">
      <SectionTitle icon={Target} title="Orçamentos" subtitle="Limite mensal pra controlar gastos variáveis" accent="rose" action={<AdderToggle open={adding} onToggle={setAdding} label="Novo orçamento" />} />
      <div className="rounded-lg p-3 mb-4 text-xs text-white/65 leading-relaxed" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-start gap-2"><Sparkles size={14} className="mt-0.5 shrink-0 text-rose-300" />
          <div>Crie um orçamento pra cada gasto que você quer acompanhar no mês — ex: <span className="text-rose-300">Mercado, Luz, Saídas, Lazer, Gasolina, Uber</span>. Qualquer categoria serve, fixa ou variável.</div>
        </div>
      </div>
      {adding && (
        <AdderShell accent="rose" title="Novo orçamento">
          <input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome (ex: Mercado, Saídas, Gasolina)"
            onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) add(); if (e.key === 'Escape') reset() }}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', width: '100%', boxSizing: 'border-box', minWidth: 0, borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none' }}
            className="placeholder:text-white/30 focus:border-rose-400" />
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg overflow-hidden flex-1" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <span className="px-3 text-sm text-white/40" style={{ fontFamily: 'JetBrains Mono, monospace' }}>R$</span>
              <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0,00"
                onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) add(); if (e.key === 'Escape') reset() }}
                style={{ background: 'transparent', color: 'white', flex: 1, outline: 'none', padding: '8px 12px 8px 0', fontSize: 14, fontFamily: 'JetBrains Mono, monospace' }}
                className="placeholder:text-white/30" />
            </div>
            <button onClick={add} disabled={!canSubmit} style={{ opacity: canSubmit ? 1 : 0.4 }} className="px-3 py-2 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition shrink-0 flex items-center gap-1.5"><Check size={14} /><span className="text-sm">Salvar</span></button>
          </div>
        </AdderShell>
      )}
      <div className="space-y-2">
        {config.categories.length === 0 && !adding && <Empty text="Nenhum orçamento cadastrado" />}
        {config.categories.map((c) => {
          const a = accents[c.accent] || accents.rose
          return (
            <div key={c.name} className="p-3 rounded-lg bg-white/5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0"><div style={{ background: a.soft, color: a.hex }} className="p-1.5 rounded-md shrink-0"><Target size={13} /></div><span className="font-medium truncate">{c.name}</span></div>
                <DeleteIconBtn onClick={() => setConfig({ categories: config.categories.filter((x) => x.name !== c.name) })} />
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-white/45">Limite</span>
                  <div className="flex items-center rounded overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    <span className="px-1.5 text-xs text-white/35" style={{ fontFamily: 'JetBrains Mono, monospace' }}>R$</span>
                    <MiniInput type="number" value={c.budget ?? ''} onChange={(e) => setConfig({ categories: config.categories.map((x) => x.name === c.name ? { ...x, budget: e.target.value === '' ? null : Number(e.target.value) } : x) })} placeholder="—" width={80} />
                  </div>
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
      <div className="rounded-lg p-3 mb-4 text-xs text-white/65 leading-relaxed" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
        Marque com <strong className="text-emerald-300">👤 É meu</strong> os gastos que descontam do seu saldo (Eu, Casal, sua empresa). Marque com <strong className="text-amber-300">🤝 Adiantamento</strong> os de terceiros (Pai, Sogro) — vão pra "A receber" e <strong>não descontam</strong>.
      </div>
      {adding && (
        <AdderShell accent="fuchsia" title="Novo atribuído">
          <div className="flex gap-2 items-center">
            <input autoFocus type="text" value={val} onChange={(e) => setVal(e.target.value)} placeholder="Ex: Esposa, Pai, Empresa X"
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setVal(''); setAdding(false) } }}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', flex: 1, minWidth: 0, boxSizing: 'border-box', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none' }}
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
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', flex: 1, minWidth: 0, boxSizing: 'border-box', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none' }}
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
              color: 'white',
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
export default function ConfigTab({ month, setMonth, brand, updateBrand, setConfig }) {
  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6">
        <SectionTitle icon={Settings} title="Configurações" subtitle="Personalize seu app, cartões, categorias, atribuídos e orçamentos." accent="gold" />
        <div className="text-sm text-white/55 leading-relaxed">Estas configurações são globais — valem para todos os meses.</div>
      </Card>
      <BrandConfig brand={brand} updateBrand={updateBrand} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardsConfig config={month.config} setConfig={setConfig} />
        <PaymentMethodsConfig config={month.config} setConfig={setConfig} />
        <CategoriesConfig config={month.config} setConfig={setConfig} />
        <AttributedConfig config={month.config} setConfig={setConfig} />
        <IncomeSourcesConfig config={month.config} setConfig={setConfig} />
      </div>

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
