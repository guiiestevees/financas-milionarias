export function Field({ label, hint, children }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="uppercase text-white/40" style={{ fontSize: '11px', letterSpacing: '0.08em' }}>
          {label}
        </label>
        {hint && <span className="text-xs text-white/35">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
