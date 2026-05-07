export const uid = () =>
  Math.random().toString(36).slice(2, 11) + Date.now().toString(36).slice(-4)

export const fmtBRL = (n) =>
  (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const todayISO = () => new Date().toISOString().slice(0, 10)
export const todayDay = () => new Date().getDate()

export const getCurrentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const formatMonthLabel = (ym) => {
  const [y, m] = ym.split('-')
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]
  return `${months[Number(m) - 1]} ${y}`
}

export const shiftMonth = (ym, delta) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const isMineFor = (attributedToName, config) => {
  if (!attributedToName) return true
  const item = config?.attributedTo?.find?.((a) => (a?.name || a) === attributedToName)
  if (!item) return true
  if (typeof item === 'string') return true
  return item.isMine !== false
}

export const cardDueDayFor = (cardName, config) => {
  const c = config?.cards?.find?.((x) => x.name === cardName)
  return c?.dueDay ? Number(c.dueDay) : null
}
