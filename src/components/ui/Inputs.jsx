const inputBase = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'white',
  outline: 'none',
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
}

export function TextInput({ value, onChange, placeholder, type = 'text', inputMode, className = '', style = {}, onBlur }) {
  const resolvedInputMode = inputMode || (type === 'number' ? 'decimal' : undefined)
  return (
    <input
      type={type}
      inputMode={resolvedInputMode}
      value={value ?? ''}
      onChange={(e) =>
        onChange(type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)
      }
      onBlur={onBlur}
      placeholder={placeholder}
      style={{ ...inputBase, ...style }}
      className={`px-3 py-2 rounded-lg text-sm placeholder:text-white/30 focus:border-amber-400 transition ${className}`}
    />
  )
}

export function MoneyInput({ value, onChange, placeholder, className = '', style = {}, autoFocus }) {
  const formatBR = (n) => {
    if (n === '' || n === null || n === undefined || isNaN(n)) return ''
    return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '')
    if (digits === '') { onChange(''); return }
    onChange(parseInt(digits, 10) / 100)
  }

  const display = value === '' || value === null || value === undefined ? '' : formatBR(value)

  return (
    <div className="relative" style={{ width: '100%' }}>
      <span
        style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: 'rgba(255,255,255,0.4)', fontSize: '14px', pointerEvents: 'none',
          fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        R$
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        autoFocus={autoFocus}
        placeholder={placeholder || '0,00'}
        style={{ ...inputBase, paddingLeft: 36, fontFamily: 'JetBrains Mono, monospace', ...style }}
        className={`px-3 py-2 rounded-lg text-sm placeholder:text-white/30 focus:border-amber-400 transition tabular-nums ${className}`}
      />
    </div>
  )
}

export function Select({ value, onChange, options, className = '', placeholder }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}
      className={`px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-amber-400 transition ${className}`}
    >
      {placeholder && <option value="" style={{ background: '#0f1525' }}>{placeholder}</option>}
      {options.map((o) => (
        <option
          key={typeof o === 'string' ? o : o.value}
          value={typeof o === 'string' ? o : o.value}
          style={{ background: '#0f1525' }}
        >
          {typeof o === 'string' ? o : o.label}
        </option>
      ))}
    </select>
  )
}

export function MiniInput({ value, onChange, placeholder, type = 'text', title, width = 60, inputMode, min, max, maxLength }) {
  const resolvedInputMode = inputMode || (type === 'number' ? 'numeric' : undefined)
  return (
    <input
      type={type}
      inputMode={resolvedInputMode}
      value={value ?? ''}
      onChange={onChange}
      placeholder={placeholder}
      title={title}
      min={min}
      max={max}
      maxLength={maxLength}
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: 'white',
        width,
        boxSizing: 'border-box',
        minWidth: 0,
      }}
      className="px-2 py-1.5 rounded text-sm tabular-nums text-center focus:outline-none focus:border-amber-400 placeholder:text-white/30"
    />
  )
}
