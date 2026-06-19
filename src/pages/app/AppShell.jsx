import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { storage } from '../../lib/storage'
import { migrateData } from '../../lib/migrate'
import { createEmptyMonth, createEmptyConfig, safeConfig, computeEffectiveConfig } from '../../lib/constants'
import { getCurrentMonth, shiftMonth, formatMonthLabel, uid, dateInMonth } from '../../lib/utils'
import { Header } from '../../components/layout/Header'
import { Footer } from '../../components/layout/Footer'
import { Tabs } from '../../components/layout/Tabs'
import { ErrorBoundary } from '../../components/ErrorBoundary'
import PainelTab from '../../features/painel/PainelTab'
import ReceitasTab from '../../features/receitas/ReceitasTab'
import GastosTab from '../../features/gastos/GastosTab'
import CofresTab from '../../features/cofres/CofresTab'
import ConfigTab from '../../features/config/ConfigTab'
import SubscriptionBanner from '../../components/SubscriptionBanner'
import VerificationBanner from '../../components/VerificationBanner'
import SubscriptionBlocked from '../../components/SubscriptionBlocked'
import QuickAddExpense from '../../components/QuickAddExpense'
// import WelcomeTour from '../../components/WelcomeTour'  // removido — agora usamos a página /tutorial acessível pelo painel
import { useSubscription } from '../../hooks/useSubscription'
import { useRevenueCat } from '../../hooks/useRevenueCat'
import { useTheme } from '../../hooks/useTheme'

// Chave do localStorage pra marcar que o tour foi dispensado
const TOUR_DISMISSED_KEY = 'fm_welcome_tour_dismissed_v1'

// Tabs válidas — usado pra validar query param ?tab=
const VALID_TABS = ['painel', 'receitas', 'gastos', 'cofres', 'config']

export default function AppShell() {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const subscription = useSubscription()
  const rc = useRevenueCat()  // assinatura In-App (Apple/Google) no app nativo

  // Aplica o tema específico do app de Finanças (separado da Agenda)
  useTheme('financas')
  const [data, setData] = useState(null)
  const [activeMonth, setActiveMonth] = useState(getCurrentMonth())

  // Inicializa a aba a partir do ?tab= da URL (se válida)
  const initialTab = VALID_TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'painel'
  const [tab, setTabRaw] = useState(initialTab)

  // setTab sincroniza com a URL pra back/forward funcionar e links externos.
  const setTab = useCallback((newTab) => {
    setTabRaw(newTab)
    if (newTab === 'painel') {
      // Remove ?tab da URL pra deixar limpa quando é a aba padrão
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams({ tab: newTab }, { replace: true })
    }
  }, [setSearchParams])

  // Sincroniza state quando o usuário navega via histórico (back/forward)
  useEffect(() => {
    const urlTab = searchParams.get('tab')
    const next = VALID_TABS.includes(urlTab) ? urlTab : 'painel'
    if (next !== tab) setTabRaw(next)
  }, [searchParams, tab])
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef(null)
  const initialized = useRef(false)
  const loadedUserId = useRef(null)
  const mounted = useRef(true)            // evita setState após desmontar
  const pendingSave = useRef(false)       // há um save no debounce ainda não persistido?
  const dataRef = useRef(null)            // versão mais recente de `data` pro flush final

  // Tour inicial removido — tutorial agora é acessível via página /tutorial.

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
    dataRef.current = data
    pendingSave.current = true
    clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => {
      await storage.save(data)
      pendingSave.current = false
      if (mounted.current) setSaving(false)
    }, 600)
    return () => clearTimeout(saveTimer.current)
  }, [data])

  // Ao desmontar (sair da tela), garante que uma edição ainda no debounce
  // seja persistida — sem isso, a última alteração feita logo antes de
  // navegar pra outra aba/app era perdida.
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      clearTimeout(saveTimer.current)
      if (pendingSave.current && dataRef.current !== null) {
        storage.save(dataRef.current)  // cleanup não permite await — dispara o save final
        pendingSave.current = false
      }
    }
  }, [])

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

  // Renomeia uma categoria E migra todos os gastos antigos que usavam o nome
  // antigo (a categoria é guardada como texto em cada despesa). Sem isso, os
  // gastos ficariam "órfãos" após renomear.
  const renameCategory = useCallback((oldName, newName) => {
    const nn = (newName || '').trim()
    if (!nn || nn === oldName) return
    setData((prev) => {
      const curCfg = computeEffectiveConfig(prev)
      // Não renomeia se já existir uma categoria com o novo nome (evita duplicar)
      if ((curCfg.categories || []).some((c) => c.name === nn)) return prev
      const newCfg = {
        ...curCfg,
        categories: (curCfg.categories || []).map((c) => c.name === oldName ? { ...c, name: nn } : c),
      }
      const updatedMonths = { ...(prev.months || {}) }
      for (const ym of Object.keys(updatedMonths)) {
        const m = updatedMonths[ym]
        updatedMonths[ym] = {
          ...m,
          config: newCfg,
          despesas: Array.isArray(m.despesas)
            ? m.despesas.map((d) => (d && d.category === oldName ? { ...d, category: nn } : d))
            : m.despesas,
        }
      }
      return { ...prev, config: newCfg, months: updatedMonths }
    })
  }, [])

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
        .filter((d) => d && d.recurring && !(d._killedFrom && newKey >= d._killedFrom))
        .filter((d) => !(Array.isArray(d._skippedMonths) && d._skippedMonths.includes(newKey)))
        .map((d) => ({
          ...d,
          id: uid(),
          recurringRootId: d.recurringRootId || d.id,  // mantém referência ao "root" entre meses
          paid: false,
        }))
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

  // Jumps directly to a target month (YYYY-MM). For forward jumps, walks each
  // intermediate month populating recurring items, all in a single setData call.
  const navigateToMonth = useCallback((targetYm) => {
    if (!targetYm || targetYm === activeMonth) return
    if (targetYm < activeMonth) {
      // Backward: data already exists or is empty; just switch active
      setActiveMonth(targetYm)
      return
    }
    setData((prev) => {
      const next = { ...prev, months: { ...(prev.months || {}) } }
      let cursor = activeMonth
      while (cursor < targetYm) {
        const nextYm = shiftMonth(cursor, 1)
        const cursorData = next.months[cursor] ?? createEmptyMonth()
        const recurringDespesas = (Array.isArray(cursorData.despesas) ? cursorData.despesas : [])
          .filter((d) => d && d.recurring && !(d._killedFrom && nextYm >= d._killedFrom))
          .filter((d) => !(Array.isArray(d._skippedMonths) && d._skippedMonths.includes(nextYm)))
          .map((d) => ({
            ...d,
            id: uid(),
            recurringRootId: d.recurringRootId || d.id,
            paid: false,
          }))
        const recurringReceitas = (Array.isArray(cursorData.receitas) ? cursorData.receitas : [])
          .filter((r) => r && r.recurring)
          .map((r) => ({ ...r, id: uid() }))
        const sourceCfg = computeEffectiveConfig(next)

        if (next.months[nextYm]) {
          const existing = next.months[nextYm]
          const hasRecurringDespesas = (Array.isArray(existing.despesas) ? existing.despesas : []).some((d) => d?.recurring)
          const hasReceitas = (Array.isArray(existing.receitas) ? existing.receitas : []).length > 0
          next.months[nextYm] = {
            ...existing,
            config: sourceCfg,
            despesas: hasRecurringDespesas
              ? (Array.isArray(existing.despesas) ? existing.despesas : [])
              : [...recurringDespesas, ...(Array.isArray(existing.despesas) ? existing.despesas : [])],
            receitas: hasReceitas
              ? (Array.isArray(existing.receitas) ? existing.receitas : [])
              : recurringReceitas,
          }
        } else {
          next.months[nextYm] = { receitas: recurringReceitas, despesas: recurringDespesas, config: sourceCfg }
        }
        cursor = nextYm
      }
      return next
    })
    setActiveMonth(targetYm)
  }, [activeMonth])

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
        const futureDate = dateInMonth(fm, day)

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
            .filter((d) => d && d.recurring && !(d._killedFrom && fm >= d._killedFrom))
            .filter((d) => !(Array.isArray(d._skippedMonths) && d._skippedMonths.includes(fm)))
            .map((d) => ({
              ...d,
              id: uid(),
              recurringRootId: d.recurringRootId || d.id,
              paid: false,
            }))
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

  // Ensure every expected future parcel (cur+1 .. newTotal) exists in its month.
  // Skips parcels that already exist (matched by description + installmentCurrent),
  // so this is safe to run on every edit — it only fills in what's missing.
  const expandInstallments = useCallback((despesa) => {
    const newTotal = Number(despesa.installmentTotal) || 1
    const cur = Number(despesa.installmentCurrent) || 1
    if (newTotal <= cur) return

    setData((prev) => {
      const next = { ...prev, months: { ...prev.months } }
      const sourceCfg = computeEffectiveConfig(next)
      const day = despesa.date?.slice(8)

      for (let inst = cur + 1; inst <= newTotal; inst++) {
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

        const futureDate = dateInMonth(fm, day)
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
            .filter((d) => d && d.recurring && !(d._killedFrom && fm >= d._killedFrom))
            .filter((d) => !(Array.isArray(d._skippedMonths) && d._skippedMonths.includes(fm)))
            .map((d) => ({
              ...d,
              id: uid(),
              recurringRootId: d.recurringRootId || d.id,
              paid: false,
            }))
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

  // ----- Despesa side-effects with Cofre sync -----
  // Toggling paid on a despesa with a linked cofre creates/removes the matching entrada in the cofre.
  const togglePaidDespesa = useCallback((despesaId) => {
    setData((prev) => {
      const monthData = prev.months?.[activeMonth]
      if (!monthData) return prev
      const despesas = Array.isArray(monthData.despesas) ? monthData.despesas : []
      const despesa = despesas.find((d) => d?.id === despesaId)
      if (!despesa) return prev

      const becomingPaid = !despesa.paid
      const cofreId = despesa.cofreId
      let cofres = Array.isArray(prev.cofres) ? prev.cofres : []
      let linkedMovementId = despesa.linkedMovementId || null

      const cofreExists = cofreId && cofres.some((c) => c.id === cofreId)

      if (cofreExists) {
        if (becomingPaid && !linkedMovementId) {
          const movId = uid()
          cofres = cofres.map((c) => c.id === cofreId
            ? { ...c, movements: [...(c.movements || []), {
                id: movId,
                type: 'entrada',
                amount: Number(despesa.amount) || 0,
                date: despesa.date || new Date().toISOString().slice(0, 10),
                note: `${despesa.description || 'Lançamento'} (auto)`,
                linkedDespesaId: despesaId,
              }] }
            : c
          )
          linkedMovementId = movId
        } else if (!becomingPaid && linkedMovementId) {
          cofres = cofres.map((c) => c.id === cofreId
            ? { ...c, movements: (c.movements || []).filter((m) => m.id !== linkedMovementId) }
            : c
          )
          linkedMovementId = null
        }
      }

      return {
        ...prev,
        cofres,
        months: {
          ...prev.months,
          [activeMonth]: {
            ...monthData,
            despesas: despesas.map((d) => d.id === despesaId
              ? { ...d, paid: becomingPaid, linkedMovementId }
              : d
            ),
          },
        },
      }
    })
  }, [activeMonth])

  // Bulk version for "marcar todos pagos" buttons. paidValue: target state for all ids.
  const setPaidBulk = useCallback((despesaIds, paidValue) => {
    if (!Array.isArray(despesaIds) || despesaIds.length === 0) return
    const idSet = new Set(despesaIds)
    setData((prev) => {
      const monthData = prev.months?.[activeMonth]
      if (!monthData) return prev
      const despesas = Array.isArray(monthData.despesas) ? monthData.despesas : []
      let cofres = Array.isArray(prev.cofres) ? prev.cofres : []

      const updatedDespesas = despesas.map((d) => {
        if (!idSet.has(d.id)) return d
        if (!!d.paid === paidValue) return d  // already in target state
        const cofreId = d.cofreId
        const cofreExists = cofreId && cofres.some((c) => c.id === cofreId)
        let linkedMovementId = d.linkedMovementId || null

        if (cofreExists) {
          if (paidValue && !linkedMovementId) {
            const movId = uid()
            cofres = cofres.map((c) => c.id === cofreId
              ? { ...c, movements: [...(c.movements || []), {
                  id: movId,
                  type: 'entrada',
                  amount: Number(d.amount) || 0,
                  date: d.date || new Date().toISOString().slice(0, 10),
                  note: `${d.description || 'Lançamento'} (auto)`,
                  linkedDespesaId: d.id,
                }] }
              : c
            )
            linkedMovementId = movId
          } else if (!paidValue && linkedMovementId) {
            cofres = cofres.map((c) => c.id === cofreId
              ? { ...c, movements: (c.movements || []).filter((m) => m.id !== linkedMovementId) }
              : c
            )
            linkedMovementId = null
          }
        }

        return { ...d, paid: paidValue, linkedMovementId }
      })

      return {
        ...prev,
        cofres,
        months: {
          ...prev.months,
          [activeMonth]: { ...monthData, despesas: updatedDespesas },
        },
      }
    })
  }, [activeMonth])

  // Remove despesa AND any linked cofre movement
  // mode pode ser:
  //   'single' (default): remove só do mês ativo
  //   'recurring-this' : gasto fixo — remove só desse mês, mas marca skip em TODAS
  //                      as cópias do mesmo id pra propagação futura ignorar esse mês
  //   'recurring-forever': gasto fixo — remove a partir desse mês em diante
  //                       (mantém histórico passado). Marca _killedFrom e remove
  //                       de todos os meses >= activeMonth.
  const removeDespesa = useCallback((despesaId, mode = 'single') => {
    setData((prev) => {
      const monthData = prev.months?.[activeMonth]
      if (!monthData) return prev
      const despesas = Array.isArray(monthData.despesas) ? monthData.despesas : []
      const despesa = despesas.find((d) => d?.id === despesaId)
      if (!despesa) return prev

      let cofres = Array.isArray(prev.cofres) ? prev.cofres : []
      if (despesa.linkedMovementId && despesa.cofreId) {
        cofres = cofres.map((c) => c.id === despesa.cofreId
          ? { ...c, movements: (c.movements || []).filter((m) => m.id !== despesa.linkedMovementId) }
          : c
        )
      }

      // Único / não-recorrente: remove só do mês atual
      if (mode === 'single' || !despesa.recurring) {
        return {
          ...prev,
          cofres,
          months: {
            ...prev.months,
            [activeMonth]: { ...monthData, despesas: despesas.filter((d) => d.id !== despesaId) },
          },
        }
      }

      // Recorrente — identifica todas as cópias entre meses pelo recurringRootId.
      // Quando uma despesa fixa é propagada, ela ganha novo id mas mantém o
      // recurringRootId apontando pro id original.
      const rootId = despesa.recurringRootId || despesa.id
      const isSame = (d) => d && (d.id === rootId || d.recurringRootId === rootId)

      const newMonths = { ...prev.months }
      const allMonthKeys = Object.keys(newMonths)

      if (mode === 'recurring-this') {
        // Remove desse mês + marca activeMonth em _skippedMonths das outras cópias
        for (const ym of allMonthKeys) {
          const md = newMonths[ym]
          if (!md?.despesas) continue
          if (ym === activeMonth) {
            newMonths[ym] = { ...md, despesas: md.despesas.filter((d) => d.id !== despesaId) }
          } else {
            newMonths[ym] = {
              ...md,
              despesas: md.despesas.map((d) => {
                if (!isSame(d)) return d
                const skipped = Array.isArray(d._skippedMonths) ? d._skippedMonths : []
                if (skipped.includes(activeMonth)) return d
                return { ...d, _skippedMonths: [...skipped, activeMonth] }
              }),
            }
          }
        }
      } else if (mode === 'recurring-forever') {
        // Remove de todos os meses >= activeMonth + seta _killedFrom em meses passados
        for (const ym of allMonthKeys) {
          const md = newMonths[ym]
          if (!md?.despesas) continue
          if (ym >= activeMonth) {
            newMonths[ym] = { ...md, despesas: md.despesas.filter((d) => !isSame(d)) }
          } else {
            // Passado: mantém o histórico mas marca _killedFrom pra propagação não trazer
            newMonths[ym] = {
              ...md,
              despesas: md.despesas.map((d) => {
                if (!isSame(d)) return d
                return { ...d, _killedFrom: activeMonth }
              }),
            }
          }
        }
      }

      return { ...prev, cofres, months: newMonths }
    })
  }, [activeMonth])

  // ----- Cofres -----
  const addCofre = useCallback((cofre) => {
    setData((prev) => ({ ...prev, cofres: [...(Array.isArray(prev.cofres) ? prev.cofres : []), cofre] }))
  }, [])

  const updateCofre = useCallback((cofre) => {
    setData((prev) => ({
      ...prev,
      cofres: (Array.isArray(prev.cofres) ? prev.cofres : []).map((c) => c.id === cofre.id ? cofre : c),
    }))
  }, [])

  const removeCofre = useCallback((id) => {
    setData((prev) => ({
      ...prev,
      cofres: (Array.isArray(prev.cofres) ? prev.cofres : []).filter((c) => c.id !== id),
    }))
  }, [])

  const addMovement = useCallback((cofreId, mov) => {
    setData((prev) => ({
      ...prev,
      cofres: (Array.isArray(prev.cofres) ? prev.cofres : []).map((c) =>
        c.id === cofreId
          ? { ...c, movements: [...(c.movements || []), { id: uid(), ...mov }] }
          : c
      ),
    }))
  }, [])

  const updateMovement = useCallback((cofreId, movId, patch) => {
    setData((prev) => ({
      ...prev,
      cofres: (Array.isArray(prev.cofres) ? prev.cofres : []).map((c) =>
        c.id === cofreId
          ? { ...c, movements: (c.movements || []).map((m) => m.id === movId ? { ...m, ...patch } : m) }
          : c
      ),
    }))
  }, [])

  const removeMovement = useCallback((cofreId, movId) => {
    setData((prev) => {
      const cofres = Array.isArray(prev.cofres) ? prev.cofres : []
      const target = cofres.find((c) => c.id === cofreId)
      const mov = target?.movements?.find((m) => m.id === movId)
      const peerCofreId = mov?.transferPeerCofreId
      const peerMovId = mov?.transferPeerMovId
      const linkedReceita = mov?.linkedReceita  // { ym, id } when this saida fed a receita

      const updatedCofres = cofres.map((c) => {
        if (c.id === cofreId) {
          return { ...c, movements: (c.movements || []).filter((m) => m.id !== movId) }
        }
        if (peerCofreId && c.id === peerCofreId) {
          return { ...c, movements: (c.movements || []).filter((m) => m.id !== peerMovId) }
        }
        return c
      })

      // If this movement created a receita in some month, remove that receita too
      let updatedMonths = prev.months
      if (linkedReceita?.ym && linkedReceita?.id && prev.months?.[linkedReceita.ym]) {
        const m = prev.months[linkedReceita.ym]
        updatedMonths = {
          ...prev.months,
          [linkedReceita.ym]: {
            ...m,
            receitas: (Array.isArray(m.receitas) ? m.receitas : []).filter((r) => r?.id !== linkedReceita.id),
          },
        }
      }

      return { ...prev, cofres: updatedCofres, months: updatedMonths }
    })
  }, [])

  // Devolver dinheiro do cofre para o caixa (sobra do mês).
  // Cria uma saída no cofre vinculada a uma receita criada no mês da data.
  const transferCofreToCaixa = useCallback((cofreId, amount, date, note) => {
    const v = Number(amount) || 0
    if (v <= 0 || !cofreId) return
    const isoDate = date || new Date().toISOString().slice(0, 10)
    const ym = isoDate.slice(0, 7)

    setData((prev) => {
      const cofres = Array.isArray(prev.cofres) ? prev.cofres : []
      const cofre = cofres.find((c) => c.id === cofreId)
      if (!cofre) return prev

      const movId = uid()
      const receitaId = uid()
      const sourceLabel = `Cofre ${cofre.name}`
      const monthsCopy = { ...(prev.months || {}) }
      const monthData = monthsCopy[ym] || { receitas: [], despesas: [], config: computeEffectiveConfig(prev) }
      monthsCopy[ym] = {
        ...monthData,
        receitas: [
          ...(Array.isArray(monthData.receitas) ? monthData.receitas : []),
          {
            id: receitaId,
            source: sourceLabel,
            amount: v,
            date: isoDate,
            notes: note || `Devolução do cofre ${cofre.name}`,
            recurring: false,
            linkedCofreMovId: movId,
          },
        ],
      }

      return {
        ...prev,
        cofres: cofres.map((c) => c.id === cofreId
          ? { ...c, movements: [...(c.movements || []), {
              id: movId,
              type: 'saida',
              amount: v,
              date: isoDate,
              note: note || 'Devolvido para o caixa',
              linkedReceita: { ym, id: receitaId },
            }] }
          : c
        ),
        months: monthsCopy,
      }
    })
  }, [])

  const transferBetweenCofres = useCallback((fromId, toId, amount, date, note) => {
    if (!fromId || !toId || fromId === toId) return
    const v = Number(amount) || 0
    if (v <= 0) return
    setData((prev) => {
      const cofres = Array.isArray(prev.cofres) ? prev.cofres : []
      const from = cofres.find((c) => c.id === fromId)
      const to = cofres.find((c) => c.id === toId)
      if (!from || !to) return prev
      const outId = uid(), inId = uid()
      const outMov = { id: outId, type: 'saida', amount: v, date: date || new Date().toISOString().slice(0, 10), note: note || `Transferência → ${to.name}`, transferPeerCofreId: toId, transferPeerMovId: inId }
      const inMov  = { id: inId,  type: 'entrada', amount: v, date: date || new Date().toISOString().slice(0, 10), note: note || `Transferência ← ${from.name}`, transferPeerCofreId: fromId, transferPeerMovId: outId }
      return {
        ...prev,
        cofres: cofres.map((c) => {
          if (c.id === fromId) return { ...c, movements: [...(c.movements || []), outMov] }
          if (c.id === toId)   return { ...c, movements: [...(c.movements || []), inMov] }
          return c
        }),
      }
    })
  }, [])

  const updateBrand = useCallback((patch) => {
    setData((prev) => ({ ...prev, brand: { ...(prev.brand || {}), ...patch } }))
  }, [])

  const updateWhatsappPhone = useCallback((phone) => {
    setData((prev) => ({ ...prev, whatsappPhone: phone || null }))
  }, [])

  // ----- Pending actions (lançamentos via WhatsApp aguardando confirmação) -----

  // Confirma um pending: salva no mês correto (despesa ou receita) e remove do buffer.
  // Para parcelados, cria automaticamente as parcelas futuras.
  // Aceita override (caso o user tenha editado antes de confirmar).
  const confirmPending = useCallback((pendingOrId, override = null) => {
    setData((prev) => {
      const list = Array.isArray(prev.pendingActions) ? prev.pendingActions : []
      const pendingId = typeof pendingOrId === 'string' ? pendingOrId : pendingOrId?.id
      const pending = (typeof pendingOrId === 'object' && pendingOrId !== null)
        ? pendingOrId
        : list.find((p) => p?.id === pendingId)
      if (!pending) return prev

      const finalData = override || pending.data || {}
      const isIncome = pending.type === 'income'
      const baseDate = finalData.date || pending.data?.date || new Date().toISOString().slice(0, 10)
      const finalYm = baseDate.slice(0, 7)

      const monthsCopy = { ...(prev.months || {}) }

      if (isIncome) {
        // Adiciona receita no mês
        const existing = monthsCopy[finalYm] || createEmptyMonth()
        const newReceita = { id: uid(), ...finalData }
        monthsCopy[finalYm] = {
          ...existing,
          receitas: [newReceita, ...(Array.isArray(existing.receitas) ? existing.receitas : [])],
        }
      } else {
        // Adiciona despesa no mês
        const existing = monthsCopy[finalYm] || createEmptyMonth()
        const newDespesa = { id: uid(), createdAt: Date.now(), ...finalData }
        monthsCopy[finalYm] = {
          ...existing,
          despesas: [newDespesa, ...(Array.isArray(existing.despesas) ? existing.despesas : [])],
        }

        // Se for parcelado e ainda faltam parcelas, cria as próximas
        const total = Number(finalData.installmentTotal) || 1
        const cur = Number(finalData.installmentCurrent) || 1
        if (total > 1 && cur < total) {
          const sourceCfg = computeEffectiveConfig(prev)
          const day = String(baseDate).slice(8)
          for (let inst = cur + 1; inst <= total; inst++) {
            const monthsAhead = inst - cur
            const fm = shiftMonth(finalYm, monthsAhead)
            const fmData = monthsCopy[fm] || createEmptyMonth()
            const existingList = Array.isArray(fmData.despesas) ? fmData.despesas : []
            // Não duplica se já existir uma parcela com mesma descrição e número
            const already = existingList.some(
              (d) => d && d.description === finalData.description && Number(d.installmentCurrent) === inst
            )
            if (already) continue
            const futureDate = dateInMonth(fm, day)
            const futureDespesa = {
              ...finalData,
              id: uid(),
              installmentCurrent: inst,
              installmentTotal: total,
              paid: false,
              date: futureDate,
              createdAt: Date.now(),
            }
            if (monthsCopy[fm]) {
              monthsCopy[fm] = { ...fmData, despesas: [futureDespesa, ...existingList] }
            } else {
              monthsCopy[fm] = {
                receitas: [],
                despesas: [futureDespesa],
                config: sourceCfg,
              }
            }
          }
        }
      }

      return {
        ...prev,
        months: monthsCopy,
        pendingActions: list.filter((p) => p?.id !== pending.id),
      }
    })
  }, [])

  const discardPending = useCallback((pendingId) => {
    setData((prev) => ({
      ...prev,
      pendingActions: (Array.isArray(prev.pendingActions) ? prev.pendingActions : [])
        .filter((p) => p?.id !== pendingId),
    }))
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  // Registro rápido de gasto (FAB) — adiciona no mês ativo com id + timestamp
  const addQuickDespesa = useCallback((despesa) => {
    setMonth((m) => ({
      ...m,
      despesas: [{ id: uid(), createdAt: Date.now(), ...despesa }, ...m.despesas],
    }))
  }, [setMonth])

  if (!data || !month) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-app)' }}>
        <div className="text-white/30 text-sm">Carregando…</div>
      </div>
    )
  }

  // ----- Bloqueio de assinatura -----
  // Só bloqueia quando o acesso REALMENTE acabou (trial expirou / cancelada já passou
  // do prazo / overdue mais que 3 dias / status expired). Cancelamento com dias
  // restantes mostra só um banner — não bloqueia.
  // Quem assinou pelo pagamento In-App (Apple/Google) tem o direito "premium"
  // ativo no RevenueCat — nesse caso não bloqueia, mesmo que o user_profiles
  // ainda não reflita (a sincronização do servidor pode levar alguns segundos).
  if (!subscription.loading && subscription.isBlocked && !rc.isEntitled) {
    const reason = subscription.isCancelled
      ? 'cancelled'
      : subscription.isTrial
      ? 'trial_expired'
      : subscription.isOverdue
      ? 'overdue'
      : 'expired'
    return <SubscriptionBlocked reason={reason} />
  }

  const brand = data.brand || { name: '', subtitle: 'Domus' }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-app)' }}>
      {/* Tour inicial removido — acesso ao tutorial via botão no Painel */}
      <VerificationBanner />
      <SubscriptionBanner />
      <div className="w-full max-w-4xl mx-auto px-4 pt-8">
        <Header
          brand={brand}
          updateBrand={updateBrand}
          monthLabel={formatMonthLabel(activeMonth)}
          activeMonth={activeMonth}
          onPrev={() => navigateMonth(-1)}
          onNext={() => navigateMonth(1)}
          onJumpTo={navigateToMonth}
          saving={saving}
        />
      </div>

      {/* main com padding-bottom maior pra conteúdo não ficar atrás da bottom nav fixa */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 mt-6" style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0))' }}>
        <ErrorBoundary key={tab + activeMonth}>
          {tab === 'painel'   && <PainelTab month={month} setMonth={setMonth} setTab={setTab} activeMonth={activeMonth} expandInstallments={expandInstallments} cofres={data.cofres || []} togglePaidDespesa={togglePaidDespesa} setPaidBulk={setPaidBulk} removeDespesaCentral={removeDespesa} pendingActions={data.pendingActions || []} confirmPending={confirmPending} discardPending={discardPending} />}
          {tab === 'receitas' && <ReceitasTab month={month} setMonth={setMonth} />}
          {tab === 'gastos'   && <GastosTab month={month} setMonth={setMonth} addDespesaPropagated={addDespesaPropagated} activeMonth={activeMonth} expandInstallments={expandInstallments} cofres={data.cofres || []} togglePaidDespesa={togglePaidDespesa} setPaidBulk={setPaidBulk} removeDespesaCentral={removeDespesa} />}
          {tab === 'cofres'   && <CofresTab cofres={data.cofres || []} addCofre={addCofre} updateCofre={updateCofre} removeCofre={removeCofre} addMovement={addMovement} transferBetweenCofres={transferBetweenCofres} transferCofreToCaixa={transferCofreToCaixa} updateMovement={updateMovement} removeMovement={removeMovement} />}
          {tab === 'config'   && <ConfigTab month={month} setMonth={setMonth} brand={brand} updateBrand={updateBrand} setConfig={setConfig} renameCategory={renameCategory} whatsappPhone={data.whatsappPhone || ''} updateWhatsappPhone={updateWhatsappPhone} />}
        </ErrorBoundary>
      </main>

      {/* FAB de gasto rápido — só nas abas onde faz sentido (não em config/cofres) */}
      {(tab === 'painel' || tab === 'gastos' || tab === 'receitas') && (
        <QuickAddExpense month={month} onAdd={addQuickDespesa} />
      )}

      {/* Bottom navigation fixa — sempre visível durante o scroll */}
      <Tabs tab={tab} setTab={setTab} />
    </div>
  )
}
