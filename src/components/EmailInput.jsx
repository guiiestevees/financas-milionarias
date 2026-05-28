import { useState, useRef, useEffect } from 'react'

// Lista dos domínios mais usados no Brasil — ordem importa (mais comuns primeiro)
const POPULAR_DOMAINS = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com.br',
  'yahoo.com',
  'icloud.com',
  'live.com',
  'bol.com.br',
  'uol.com.br',
  'terra.com.br',
  'protonmail.com',
]

const inputStyle = {
  background: 'var(--bg-elev1)',
  border: '1px solid var(--border-medium)',
  color: 'var(--text-primary)',
  outline: 'none',
  width: '100%',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 14,
  boxSizing: 'border-box',
}

// Input de email com auto-sugestão de domínio.
// Quando o usuário digita "joao@gm", sugere "joao@gmail.com".
// Pode aceitar a sugestão clicando ou apertando Tab/Enter/→
export default function EmailInput({
  value,
  onChange,
  placeholder = 'seu@email.com',
  required = false,
  autoComplete = 'email',
  onBlur,
  id,
}) {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)

  // Calcula a sugestão de domínio
  const atIndex = value.lastIndexOf('@')
  let suggestion = null
  if (atIndex !== -1 && atIndex < value.length - 1 && focused) {
    const localPart = value.slice(0, atIndex)
    const typedDomain = value.slice(atIndex + 1).toLowerCase()
    if (localPart && typedDomain) {
      // Acha o primeiro domínio que começa com o que o user digitou
      const match = POPULAR_DOMAINS.find((d) =>
        d.startsWith(typedDomain) && d !== typedDomain
      )
      if (match) {
        suggestion = {
          full: `${localPart}@${match}`,
          domain: match,
          // O "rest" é o que falta digitar (pra mostrar em cinza)
          rest: match.slice(typedDomain.length),
        }
      }
    }
  }

  const acceptSuggestion = () => {
    if (suggestion) {
      onChange(suggestion.full)
    }
  }

  const handleKeyDown = (e) => {
    if (!suggestion) return
    // Tab, Enter ou seta-direita aceitam a sugestão
    if (e.key === 'Tab' || e.key === 'ArrowRight') {
      // Só aceita seta-direita se cursor estiver no final
      if (e.key === 'ArrowRight') {
        const input = inputRef.current
        if (input && input.selectionStart !== value.length) return
      }
      e.preventDefault()
      acceptSuggestion()
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Sugestão atrás do input (fantasma) */}
      {suggestion && (
        <div
          aria-hidden="true"
          style={{
            ...inputStyle,
            position: 'absolute',
            inset: 0,
            color: 'transparent',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            fontFamily: 'inherit',
          }}
        >
          <span style={{ visibility: 'hidden' }}>{value}</span>
          <span style={{ color: 'var(--text-faint)' }}>{suggestion.rest}</span>
        </div>
      )}

      <input
        ref={inputRef}
        id={id}
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); onBlur?.() }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        style={{ ...inputStyle, position: 'relative', background: 'transparent' }}
        className="placeholder:text-white/20 focus:border-white/25"
      />

      {/* Background do input (porque o ghost suggestion sobrepõe) */}
      <div
        aria-hidden="true"
        style={{
          ...inputStyle,
          position: 'absolute',
          inset: 0,
          zIndex: -1,
        }}
      />

      {/* Dica visual de como aceitar */}
      {suggestion && (
        <div
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 10,
            color: 'var(--text-muted)',
            background: 'var(--bg-elev3)',
            padding: '2px 6px',
            borderRadius: 4,
            pointerEvents: 'none',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          Tab ↹
        </div>
      )}
    </div>
  )
}
