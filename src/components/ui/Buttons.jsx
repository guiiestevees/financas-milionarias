import { Check, Plus, X, Trash2 } from 'lucide-react'
import { accents } from '../../lib/constants'

export function Btn({ children, onClick, variant = 'primary', size = 'md', icon: Icon, disabled, className = '', title, type = 'button' }) {
  const sizes = { sm: 'px-2.5 py-1.5 text-xs', md: 'px-3.5 py-2 text-sm' }
  const variants = {
    primary: '',
    ghost: 'text-white/70 hover:text-white hover:bg-white/5 border border-white/10',
  }
  const style = variant === 'primary' ? {
    background: 'linear-gradient(135deg, #e6c552 0%, #d4af37 50%, #a87f1f 100%)',
    color: '#1a1410',
    boxShadow: '0 8px 24px -10px rgba(212,175,55,0.55)',
  } : {}
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={style}
      className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition disabled:opacity-40 ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  )
}

export function Chip({ children, selected, onClick, accent = 'violet', icon: Icon, size = 'md' }) {
  const a = accents[accent] || accents.violet
  const sizes = { sm: 'px-2.5 py-1 text-xs', md: 'px-3 py-1.5 text-sm' }
  return (
    <button
      onClick={onClick}
      className={`rounded-full font-medium transition-all flex items-center gap-1.5 ${sizes[size]}`}
      style={{
        background: selected ? a.soft : 'rgba(255,255,255,0.04)',
        border: `1px solid ${selected ? a.hex + '60' : 'rgba(255,255,255,0.08)'}`,
        color: selected ? a.hex : 'rgba(255,255,255,0.7)',
        boxShadow: selected ? `0 0 0 2px ${a.hex}15, 0 4px 12px -4px ${a.glow}` : 'none',
      }}
    >
      {Icon && <Icon size={12} />}
      {children}
    </button>
  )
}

export function Toggle({ children, checked, onChange, accent = 'emerald', icon: Icon }) {
  const a = accents[accent] || accents.emerald
  return (
    <button
      onClick={() => onChange(!checked)}
      className="rounded-full px-3 py-1.5 text-sm font-medium transition-all flex items-center gap-2"
      style={{
        background: checked ? a.soft : 'rgba(255,255,255,0.04)',
        border: `1px solid ${checked ? a.hex + '55' : 'rgba(255,255,255,0.08)'}`,
        color: checked ? a.hex : 'rgba(255,255,255,0.65)',
      }}
    >
      <span
        className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition"
        style={{
          background: checked ? a.hex : 'rgba(255,255,255,0.05)',
          border: checked ? 'none' : '1px solid rgba(255,255,255,0.2)',
        }}
      >
        {checked && <Check size={11} className="text-white" strokeWidth={3} />}
      </span>
      {Icon && <Icon size={12} />}
      {children}
    </button>
  )
}

export function DeleteIconBtn({ onClick, size = 13 }) {
  return (
    <button
      onClick={onClick}
      title="Remover"
      className="p-1.5 rounded text-white/35 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
    >
      <Trash2 size={size} />
    </button>
  )
}

export function AdderToggle({ open, onToggle, label = 'Novo' }) {
  if (open) return <Btn variant="ghost" size="sm" icon={X} onClick={() => onToggle(false)}>Fechar</Btn>
  return <Btn variant="ghost" size="sm" icon={Plus} onClick={() => onToggle(true)}>{label}</Btn>
}
