const EMPTY_CONFIG = () => ({
  cards: [],
  paymentMethods: ['Pix', 'Débito'],
  categories: [],
  attributedTo: [],
  incomeSources: [],
})

const DEFAULT_DATA = () => ({
  months: {},
  brand: { name: '', subtitle: 'Finanças Milionárias' },
  _fixJun2026ToMay: true,
})

export const migrateData = (data) => {
  if (!data || !data.months) return DEFAULT_DATA()

  // Normalize per-month configs
  const months = {}
  for (const ym of Object.keys(data.months)) {
    const m = data.months[ym]
    if (!m?.config) { months[ym] = { ...m, config: EMPTY_CONFIG() }; continue }
    const cfg = m.config
    months[ym] = {
      ...m,
      config: {
        ...cfg,
        attributedTo: (cfg.attributedTo || []).map((a) =>
          typeof a === 'string' ? { name: a, isMine: true } : a
        ),
        cards: (cfg.cards || []).map((c) => ({ dueDay: null, closingDay: null, ...c })),
      },
    }
  }

  let currentMonth = data.currentMonth

  // One-shot migration: move data from 2026-06 → 2026-05
  if (!data._fixJun2026ToMay && months['2026-06']) {
    const may = months['2026-05']
    const mayEmpty =
      !may || ((may.despesas?.length || 0) === 0 && (may.receitas?.length || 0) === 0)
    if (mayEmpty) {
      months['2026-05'] = months['2026-06']
      delete months['2026-06']
      if (currentMonth === '2026-06') currentMonth = '2026-05'
    }
  }

  // One-shot migration: if data.config exists (from temporary global config),
  // distribute it to all months and drop the top-level config.
  if (data.config) {
    for (const ym of Object.keys(months)) {
      months[ym] = { ...months[ym], config: { ...EMPTY_CONFIG(), ...data.config } }
    }
  }

  // Strip top-level config so it never comes back
  const { config: _dropped, ...dataRest } = data

  return {
    ...dataRest,
    brand: data.brand || { name: '', subtitle: 'Finanças Milionárias' },
    months,
    currentMonth,
    _fixJun2026ToMay: true,
  }
}
