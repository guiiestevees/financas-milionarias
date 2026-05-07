import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { storage } from '../../lib/storage'
import { migrateData } from '../../lib/migrate'
import { createEmptyMonth } from '../../lib/constants'
import { getCurrentMonth, shiftMonth, formatMonthLabel, uid } from '../../lib/utils'
import { Header } from '../../components/layout/Header'
import { Footer } from '../../components/layout/Footer'
import { Tabs } from '../../components/layout/Tabs'
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

  const month = data ? (data.months?.[activeMonth] ?? createEmptyMonth()) : null

  const setMonth = useCallback((updater) => {
    setData((prev) => {
      const cur = prev.months?.[activeMonth] ?? createEmptyMonth()
      const updated = typeof updater === 'function' ? updater(cur) : updater
      return { ...prev, months: { ...prev.months, [activeMonth]: updated } }
    })
  }, [activeMonth])

  const navigateMonth = (dir) => {
    const newKey = shiftMonth(activeMonth, dir)
    setData((prev) => {
      if (prev.months?.[newKey]) return prev
      const prevData = prev.months?.[activeMonth] ?? createEmptyMonth()
      const recurring = (prevData.despesas || [])
        .filter((d) => d.recurring)
        .map((d) => ({ ...d, id: uid(), paid: false }))
      const recurringReceitas = (prevData.receitas || [])
        .filter((r) => r.recurring)
        .map((r) => ({ ...r, id: uid() }))
      return {
        ...prev,
        months: {
          ...prev.months,
          [newKey]: { receitas: recurringReceitas, despesas: recurring, config: { ...prevData.config } },
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

      const curData = next.months[activeMonth] ?? createEmptyMonth()
      next.months[activeMonth] = {
        ...curData,
        despesas: [makeEntry({}), ...(curData.despesas || [])],
      }

      for (let i = 1; i <= remaining; i++) {
        const fm = shiftMonth(activeMonth, i)
        const fmData = next.months[fm] ?? createEmptyMonth()
        const day = despesa.date?.slice(8)
        const futureDate = fm + (day ? '-' + day : '-01')
        next.months[fm] = {
          ...fmData,
          despesas: [
            makeEntry({ installmentCurrent: cur + i, paid: false, date: futureDate }),
            ...(fmData.despesas || []),
          ],
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
        {tab === 'painel'   && <PainelTab month={month} setMonth={setMonth} setTab={setTab} />}
        {tab === 'receitas' && <ReceitasTab month={month} setMonth={setMonth} />}
        {tab === 'gastos'   && <GastosTab month={month} setMonth={setMonth} addDespesaPropagated={addDespesaPropagated} />}
        {tab === 'config'   && <ConfigTab month={month} setMonth={setMonth} brand={brand} updateBrand={updateBrand} />}
      </main>

      <div className="w-full max-w-4xl mx-auto px-4">
        <Footer />
      </div>
    </div>
  )
}
