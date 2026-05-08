import { useState, useEffect } from 'react'

// YYYY-MM-DD → DD/MM/AAAA
const toDisplay = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return d && m && y ? `${d}/${m}/${y}` : ''
}

// DD/MM/AAAA → YYYY-MM-DD (returns '' if incomplete)
const toISO = (display) => {
  const match = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return match ? `${match[3]}-${match[2]}-${match[1]}` : ''
}

// Auto-mask: only digits → DD/MM/AAAA
const maskDate = (raw) => {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return d.slice(0, 2) + '/' + d.slice(2)
  return d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4)
}

const baseStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'white',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  display: 'block',
  padding: '8px 12px',
  borderRadius: '8px',
  fontSize: '16px',
}

export function DateInput({ value, onChange, style }) {
  const [display, setDisplay] = useState(() => toDisplay(value))

  // Keep local display in sync if the parent updates `value` externally
  useEffect(() => { setDisplay(toDisplay(value)) }, [value])

  const handle = (e) => {
    const masked = maskDate(e.target.value)
    setDisplay(masked)
    const iso = toISO(masked)
    if (iso || masked === '') onChange(iso)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="DD/MM/AAAA"
      value={display}
      onChange={handle}
      style={{ ...baseStyle, ...(style || {}) }}
      className="placeholder:text-white/30"
    />
  )
}
