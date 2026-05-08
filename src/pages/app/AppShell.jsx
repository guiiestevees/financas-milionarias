import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { storage } from '../../lib/storage'
import { migrateData } from '../../lib/migrate'
import { createEmptyMonth, createEmptyConfig, safeConfig, computeEffectiveConfig } from '../../lib/constants'
import { getCurrentMonth, shiftMonth, formatMonthLabel, uid } from '../../lib/utils'
import { Header } from '../../components/layout/Header'
import { Footer } from '../../components/layout/Footer'
import { Tabs } from '../../components/layout/Tabs'
import { ErrorBoundary } from '../../components/ErrorBoundary'
import PainelTab from '../../features/painel/PainelTab'
import ReceitasTab from '../../features/receitas/ReceitasTab'
import GastosTab from '../../features/gastos/GastosTab'
import ConfigTab from '../../features/config/ConfigTab'

export default function AppShell() {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [activeMonth, setActiveMonth] = useState(getCurrentMonth())
  const [tab, setTab] = useState('painel')
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef(null)
  const initialized = useRef(false)
  const loadedUserId = useRef(null)

  const loadFromStorage = useCallback(() => {
    storage.load().then((raw) => {
      setData(migrateData(raw))
      initialized.current = true
    })
  }, [])

  useEffect(() => {
    // Reload when user identity changes (login, logout, account switch)
    const userId = user?.id ?? null
    if (loadedUserId.current === userId) return
    loadedUserId.current = userId
    initialized.current = false
    setData(null)
    loadFromStorage()
  }, [user, loadFromStorage])

  // Reload from Supabase whenever the app comes back to focus (multi-device sync)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && initialized.current) {
        loadFromStorage()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [loadFromStorage])

  useEffect(() => {
    if (!initialized.current || data === null) return
    clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => {
      await storage.save(data)
      setSaving(false)
    }, 600)
    return () => clearTimeout(saveTimer.current)
  }, [data])

  const rawMonth = data ? (data.months?.[activeMonth] ?? createEmptyMonth()) : null
  // The displayed config is the GLOBAL effective config — same in every month.
  // Past expenses keep their own paymentMethod/category/attributedTo values, so historical
  // entries display correctly regardless of current config state.
  const effectiveConfig = data ? computeEffectiveConfig(data) : safeConfig(null)
  const month = rawMonth ? {
    ...rawMonth,
    config:   effectiveConfig,
    despesas: Array.isArray(rawMonth.despesas) ? rawMonth.despesas.filter(Boolean) : [],
    receitas: Array.isArray(rawMonth.receitas) ? rawMonth.receitas.filter(Boolean) : [],
  } : null

  // Applies a config patch globally — writes the new config to data.config (canonical source)
  // AND mirrors it on every existing month so back-compat readers still work.
  const setConfig = useCallback((patch) => {
    setData((prev) => {
      const curCfg = computeEffectiveConfig(prev)
      const newCfg = { ...curCfg, ...patch }
      const updatedMonths = { ...(prev.months || {}) }
      for (const ym of Object.keys(updatedMonths)) {
        updatedMonths[ym] = { ...updatedMonths[ym], config: newCfg }
      }
      if (!updatedMonths[activeMonth]) {
        updatedMonths[activeMonth] = { ...createEmptyMonth(), config: newCfg }
      }
      return { ...prev, config: newCfg, months: updatedMonths }
    })
  }, [activeMonth])

  const setMonth = useCallback((updater) => {
    setData((prev) => {
      const raw = prev.months?.[activeMonth] ?? createEmptyMonth()
      const effectiveCfg = computeEffectiveConfig(prev)
      const cur = {
        ...raw,
        config: effectiveCfg,
        despesas: Array.isArray(raw.despesas) ? raw.despesas.filter(Boolean) : [],
        receitas: Array.isArray(raw.receitas) ? raw.receitas.filter(Boolean) : [],
      }
      const updated = typeof updater === 'function' ? updater(cur) : updater
      return { ...prev, months: { ...prev.months, [activeMonth]: updated } }
    })
  }, [activeMonth])

  const navigateMonth = (dir) => {
    const newKey = shiftMonth(activeMonth, dir)
    setData((prev) => {
      const prevData = prev.months?.[activeMonth] ?? createEmptyMonth()
      const sourceCfg = computeEffectiveConfig(prev)
      const recurring = (Array.isArray(prevData.despesas) ? prevData.despesas : [])
        .filter((d) => d && d.recurring)
        .map((d) => ({ ...d, id: uid(), paid: false }))
      const recurringReceitas = (Array.isArray(prevData.receitas) ? prevData.receitas : [])
        .filter((r) => r && r.recurring)
        .map((r) => ({ ...r, id: uid() }))

      const existing = prev.months?.[newKey]
      if (existing) {
        const hasRecurringDespesas = (Array.isArray(existing.despesas) ? existing.despesas : []).some((d) => d?.recurring)
        const hasReceitas = (Array.isArray(existing.receitas) ? existing.receitas : []).length > 0
        // Always assign sourceCfg as the persisted config. Since computeEffectiveConfig already
        // walks past months, this preserves any month-specific changes the user made via setConfig
        // (those would already be reflected in sourceCfg's chain).
        return {
          ...prev,
          months: {
            ...prev.months,
            [newKey]: {
              ...existing,
              config: sourceCfg,
              despesas: hasRecurringDespesas
                ? (Array.isArray(existing.despesas) ? existing.despesas : [])
                : [...recurring, ...(Array.isArray(existing.despesas) ? existing.despesas : [])],
              receitas: hasReceitas
                ? (Array.isArray(existing.receitas) ? existing.receitas : [])
                : recurringReceitas,
            },
          },
        }
      }

      // New month — create from scratch with the source month's effective config
      return {
        ...prev,
        months: {
          ...prev.months,
          [newKey]: { receitas: recurringReceitas, despesas: recurring, config: sourceCfg },
        },
      }
    })
    setActiveMonth(newKey)
  }

  const addDespesaPropagated = useCallback((despesa) => {
    const total = Number(despesa.installmentTotal) || 1
    const cur = Number(despesa.installmentCurrent) || 1
    const remaining = total - cur

    setData((prev) => {
      const next = { ...prev, months: { ...prev.months } }
      const makeEntry = (extra) => ({ id: uid(), createdAt: Date.now(), ...despesa, ...extra })
      const sourceCfg = computeEffectiveConfig(next)

      const curData = next.months[activeMonth] ?? createEmptyMonth()
      next.months[activeMonth] = {
        ...curData,
        config: curData.config || sourceCfg,
        despesas: [makeEntry({}), ...(Array.isArray(curData.despesas) ? curData.despesas : [])],
      }

      for (let i = 1; i <= remaining; i++) {
        const fm = shiftMonth(activeMonth, i)
        const fmData = next.months[fm]
        const day = despesa.date?.slice(8)
        const futureDate = fm + (day ? '-' + day : '-01')

        if (fmData) {
          // Month already exists — just add the installment
          next.months[fm] = {
            ...fmData,
            despesas: [
              makeEntry({ installmentCurrent: cur + i, paid: false, date: futureDate }),
              ...(Array.isArray(fmData.despesas) ? fmData.despesas : []),
            ],
          }
        } else {
          // New month — copy recurring items from the previous month + add installment
          const srcData = next.months[shiftMonth(activeMonth, i - 1)] ?? createEmptyMonth()
          const recurringDespesas = (Array.isArray(srcData.despesas) ? srcData.despesas : [])
            .filter((d) => d && d.recurring)
            .map((d) => ({ ...d, id: uid(), paid: false }))
          const recurringReceitas = (Array.isArray(srcData.receitas) ? srcData.receitas : [])
            .filter((r) => r && r.recurring)
            .map((r) => ({ ...r, id: uid() }))
          next.months[fm] = {
            receitas: recurringReceitas,
            despesas: [
              makeEntry({ installmentCurrent: cur + i, paid: false, date: futureDate }),
              ...recurringDespesas,
            ],
            config: sourceCfg,
          }
        }
      }

      return next
    })
  }, [activeMonth])

  // After an edit increases installmentTotal, create any missing future parcels.
  // Matches existing parcels by description so we don't duplicate.
  const expandInstallments = useCallback((despesa, oldTotal) => {
    const newTotal = Number(despesa.installmentTotal) || 1
    const cur = Number(despesa.installmentCurrent) || 1
    if (newTotal <= (oldTotal || 1)) return

    setData((prev) => {
      const next = { ...prev, months: { ...prev.months } }
      const sourceCfg = computeEffectiveConfig(next)
      const day = despesa.date?.slice(8)

      // Add parcels (oldTotal+1) through newTotal in their corresponding future months
      for (let inst = (oldTotal || 1) + 1; inst <= newTotal; inst++) {
        const monthsAhead = inst - cur
        if (monthsAhead <= 0) continue
        const fm = shiftMonth(activeMonth, monthsAhead)
        const fmData = next.months[fm] ?? createEmptyMonth()

        // Skip if a parcel for this purchase + installment already exists in that month
        const existingList = Array.isArray(fmData.despesas) ? fmData.despesas : []
        const already = existingList.some(
          (d) => d && d.description === despesa.description && Number(d.installmentCurrent) === inst
        )
        if (already) continue

        const futureDate = fm + (day ? '-' + day : '-01')
        const newEntry = {
          ...despesa,
          id: uid(),
          installmentCurrent: inst,
          installmentTotal: newTotal,
          paid: false,
          date: futureDate,
          createdAt: Date.now(),
        }

        if (next.months[fm]) {
          next.months[fm] = {
            ...fmData,
            despesas: [newEntry, ...existingList],
          }
        } else {
          // New month — also bring along recurring items from the previous month
          const srcData = next.months[shiftMonth(activeMonth, monthsAhead - 1)] ?? createEmptyMonth()
          const recurringDespesas = (Array.isArray(srcData.despesas) ? srcData.despesas : [])
            .filter((d) => d && d.recurring)
            .map((d) => ({ ...d, id: uid(), paid: false }))
          const recurringReceitas = (Array.isArray(srcData.receitas) ? srcData.receitas : [])
            .filter((r) => r && r.recurring)
            .map((r) => ({ ...r, id: uid() }))
          next.months[fm] = {
            receitas: recurringReceitas,
            despesas: [newEntry, ...recurringDespesas],
            config: sourceCfg,
          }
        }
      }

      return next
    })
  }, [activeMonth])

  const updateBrand = useCallback((patch) => {
    setData((prev) => ({ ...prev, brand: { ...(prev.brand || {}), ...patch } }))
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  if (!data || !month) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#070912' }}>
        <div className="text-white/30 text-sm">Carregando…</div>
      </div>
    )
  }

  const brand = data.brand || { name: '', subtitle: 'Finanças Milionárias' }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#070912' }}>
      <div className="w-full max-w-4xl mx-auto px-4 pt-8">
        <Header
          brand={brand}
          updateBrand={updateBrand}
          monthLabel={formatMonthLabel(activeMonth)}
          onPrev={() => navigateMonth(-1)}
          onNext={() => navigateMonth(1)}
          saving={saving}
          onSignOut={handleSignOut}
        />
        <Tabs tab={tab} setTab={setTab} />
      </div>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 mt-6 pb-16">
        <ErrorBoundary key={tab + activeMonth}>
          {tab === 'painel'   && <PainelTab month={month} setMonth={setMonth} setTab={setTab} activeMonth={activeMonth} expandInstallments={expandInstallments} />}
          {tab === 'receitas' && <ReceitasTab month={month} setMonth={setMonth} />}
          {tab === 'gastos'   && <GastosTab month={month} setMonth={setMonth} addDespesaPropagated={addDespesaPropagated} activeMonth={activeMonth} expandInstallments={expandInstallments} />}
          {tab === 'config'   && <ConfigTab month={month} setMonth={setMonth} brand={brand} updateBrand={updateBrand} setConfig={setConfig} />}
        </ErrorBoundary>
      </main>

      <div className="w-full max-w-4xl mx-auto px-4">
        <Footer />
      </div>
    </div>
  )
}
