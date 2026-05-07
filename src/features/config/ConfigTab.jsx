import { useState, useRef } from 'react'
import { Settings, Sparkles, CreditCard, Banknote, Target, Users, Wallet, ArrowUpRight, ArrowDownRight, AlertTriangle, Check, X } from 'lucide-react'
import { Card, SectionTitle, Empty, Btn, AdderToggle, DeleteIconBtn, MiniInput, TextInput } from '../../components/ui'
import { AdderShell } from '../../components/ui'
import { accents, accentKeys, hashAccent } from '../../lib/constants'
import { storage } from '../../lib/storage'

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
          <TextInput value={name} onChange={setName} onBlur={() => updateBrand({ name: name.trim() })} placeholder="Ex: Gui Silva" />
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

// ---------- BackupConfig ----------
function BackupConfig() {
  const [importMode, setImportMode] = useState(false)
  const [pasted, setPasted] = useState('')
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const fileInputRef = useRef(null)

  const exportar = async () => {
    setExporting(true)
    try {
      const data = await storage.load()
      if (!data || !Object.keys(data.months || {}).length) { setError('Nenhum dado pra exportar ainda'); return }
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `financas-milionarias-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch (e) {
      setError('Erro ao exportar: ' + e.message)
    } finally {
      setExporting(false)
    }
  }

  const tryImport = (text, source) => {
    setError('')
    try {
      const parsed = JSON.parse(text)
      if (!parsed || typeof parsed !== 'object' || !parsed.months) { setError('Esse arquivo não parece um backup do Finanças Milionárias.'); return }
      const monthsCount = Object.keys(parsed.months).length
      let despesasCount = 0, receitasCount = 0
      for (const ym of Object.keys(parsed.months)) { despesasCount += parsed.months[ym].despesas?.length || 0; receitasCount += parsed.months[ym].receitas?.length || 0 }
      setConfirmation({ parsed, source, summary: `${monthsCount} mês(es) · ${despesasCount} gasto(s) · ${receitasCount} receita(s)` })
    } catch { setError('JSON inválido. Verifique o arquivo.') }
  }

  const confirmImport = async () => {
    if (!confirmation) return
    setImporting(true)
    try {
      await storage.save(confirmation.parsed)
      location.reload()
    } catch (e) {
      setError('Erro ao importar: ' + e.message)
      setImporting(false)
    }
  }

  const cancelImport = () => { setImportMode(false); setPasted(''); setError(''); setConfirmation(null) }

  const handleFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => tryImport(String(reader.result), 'arquivo')
    reader.readAsText(file); e.target.value = ''
  }

  return (
    <Card className="p-4 sm:p-6" accent="emerald">
      <SectionTitle icon={ArrowUpRight} title="Backup e sincronização" subtitle="Mover seus dados entre PC, celular ou fazer backup" accent="emerald" />
      <div className="text-sm text-white/65 leading-relaxed mb-4">
        Com Supabase configurado, seus dados sincronizam automaticamente entre dispositivos. Backup manual é útil pra migrar dados ou guardar uma cópia de segurança.
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-4 rounded-lg" style={{ background: accents.emerald.soft, border: `1px solid ${accents.emerald.hex}30` }}>
          <div className="flex items-center gap-2 mb-2"><ArrowUpRight size={14} style={{ color: accents.emerald.hex }} /><span className="font-medium text-sm">Exportar dados</span></div>
          <div className="text-xs text-white/55 mb-3">Baixa um arquivo JSON com todos seus gastos, receitas e configurações.</div>
          <Btn icon={ArrowUpRight} onClick={exportar} size="sm" disabled={exporting}>{exporting ? 'Exportando…' : 'Baixar backup'}</Btn>
        </div>
        <div className="p-4 rounded-lg" style={{ background: accents.amber.soft, border: `1px solid ${accents.amber.hex}30` }}>
          <div className="flex items-center gap-2 mb-2"><ArrowDownRight size={14} style={{ color: accents.amber.hex }} /><span className="font-medium text-sm">Importar dados</span></div>
          <div className="text-xs text-white/55 mb-3">⚠️ Substitui completamente os dados atuais. Faça um backup antes.</div>
          {!importMode ? (
            <Btn variant="ghost" icon={ArrowDownRight} onClick={() => setImportMode(true)} size="sm">Importar arquivo</Btn>
          ) : (
            <div className="space-y-2">
              <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleFile} style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current?.click()} className="w-full px-3 py-2 rounded-lg text-sm transition flex items-center justify-center gap-1.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}>📁 Escolher arquivo .json</button>
              <div className="text-xs text-white/40 text-center">ou cole o JSON aqui:</div>
              <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder='{"months": {...}, ...}' rows={3}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', width: '100%', outline: 'none', resize: 'vertical', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', boxSizing: 'border-box', borderRadius: 8, padding: '6px 8px' }}
                className="placeholder:text-white/30 focus:border-amber-400" />
              <div className="flex gap-2">
                <button onClick={cancelImport} className="flex-1 px-3 py-1.5 rounded-lg text-xs text-white/55 hover:text-white hover:bg-white/5 transition">Cancelar</button>
                <button onClick={() => tryImport(pasted, 'texto')} disabled={!pasted.trim()} style={{ opacity: pasted.trim() ? 1 : 0.4 }} className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition">Validar e importar</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {error && <div className="mt-3 p-3 rounded-lg text-sm flex items-start gap-2" style={{ background: 'rgba(244,63,94,0.10)', border: '1px solid rgba(244,63,94,0.3)', color: 'rgba(255,255,255,0.85)' }}><AlertTriangle size={14} className="text-rose-400 mt-0.5 shrink-0" /><span>{error}</span></div>}
      {confirmation && (
        <div className="mt-4 p-4 rounded-lg" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <div className="flex items-start gap-2.5 mb-3"><AlertTriangle size={16} className="text-amber-300 mt-0.5 shrink-0" />
            <div className="text-sm text-white/85"><strong>Confirma a importação?</strong><div className="text-xs text-white/65 mt-1">Vou trazer: {confirmation.summary}</div><div className="text-xs text-rose-300 mt-1">Tudo que está salvo agora vai ser substituído.</div></div>
          </div>
          <div className="flex gap-2 justify-end"><Btn variant="ghost" onClick={cancelImport} icon={X} disabled={importing}>Cancelar</Btn><Btn onClick={confirmImport} icon={Check} disabled={importing}>{importing ? 'Importando…' : 'Sim, importar'}</Btn></div>
        </div>
      )}
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
          <div>Crie um orçamento pra cada gasto <strong className="text-white/85">variável</strong> que você quer limitar no mês — ex: <span className="text-rose-300">Mercado, Saídas, Lazer, Gasolina, Uber</span>.<br /><span className="text-white/45">Aluguel, Netflix e conta de luz <strong>não precisam</strong> aqui — esses são "Gasto fixo".</span></div>
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
    setConfig({ attributedTo: [...config.attributedTo, { name: v, isMine: true }] }); setVal(''); setAdding(false)
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
        {config.attributedTo.map((p) => {
          const a = accents[hashAccent(p.name)]
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

// ---------- ConfigTab (export) ----------
export default function ConfigTab({ month, setMonth, brand, updateBrand }) {
  const setConfig = (patch) => setMonth((m) => ({ ...m, config: { ...m.config, ...patch } }))
  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6">
        <SectionTitle icon={Settings} title="Configurações" subtitle="Personalize seu app, cartões, categorias, atribuídos e orçamentos." accent="gold" />
        <div className="text-sm text-white/55 leading-relaxed">Os ajustes desta seção (exceto a marca, que é global) valem para o mês atual. Os próximos meses herdam.</div>
      </Card>
      <BrandConfig brand={brand} updateBrand={updateBrand} />
      <BackupConfig />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardsConfig config={month.config} setConfig={setConfig} />
        <PaymentMethodsConfig config={month.config} setConfig={setConfig} />
        <CategoriesConfig config={month.config} setConfig={setConfig} />
        <AttributedConfig config={month.config} setConfig={setConfig} />
        <IncomeSourcesConfig config={month.config} setConfig={setConfig} />
      </div>
    </div>
  )
}
