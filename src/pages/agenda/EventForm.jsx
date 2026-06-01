import { useState, useEffect } from 'react'
import { X, Calendar, Clock, MapPin, FileText, Repeat, Check, Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { AGENDA_COLORS, RECURRENCE_OPTIONS, todayISO } from '../../lib/agendaUtils'

// Modal pra criar OU editar um compromisso.
//
// Props:
//   event?    — se passado, é edição (preenche campos)
//   initialDate? — pré-preenche a data (ex: clicou num dia da semana)
//   onSave    — async (payload) => void
//   onDelete  — async (mode: 'single' | 'forever') => void
//                  (só chamado quando editing && event.recurring !== 'none' OU evento único)
//   onClose   — () => void
//
// Pra evento recorrente em edição, mostra modal de escolha quando salva:
//   "Editar só essa ocorrência" ou "Editar todas as ocorrências"
//   (por simplicidade nesse MVP: sempre edita TODAS — depois evoluímos)
export default function EventForm({ event, initialDate, occurrenceDate, onSave, onDelete, onClose }) {
  const isEditing = !!event
  const isRecurringEdit = isEditing && event.recurring !== 'none'

  const [title, setTitle] = useState(event?.title || '')
  const [date, setDate] = useState(event?.date || occurrenceDate || initialDate || todayISO())
  const [hasTime, setHasTime] = useState(!!event?.time)
  const [time, setTime] = useState(event?.time?.slice(0, 5) || '09:00')
  const [endTime, setEndTime] = useState(event?.end_time?.slice(0, 5) || '')
  const [location, setLocation] = useState(event?.location || '')
  const [notes, setNotes] = useState(event?.notes || '')
  const [color, setColor] = useState(event?.color || 'gold')
  const [recurring, setRecurring] = useState(event?.recurring || 'none')
  const [endsAt, setEndsAt] = useState(event?.ends_at || '')

  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState('')

  // ESC fecha
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  const canSubmit = title.trim().length > 0 && !!date && !saving

  const submit = async () => {
    if (!canSubmit) return
    setError('')
    setSaving(true)
    try {
      await onSave({
        title: title.trim(),
        date,
        time: hasTime ? time : null,
        end_time: hasTime && endTime ? endTime : null,
        location: location.trim() || null,
        notes: notes.trim() || null,
        color,
        recurring,
        ends_at: recurring !== 'none' && endsAt ? endsAt : null,
      })
      // Fechamento fica a cargo do onSave (pra mostrar sucesso animado se quiser)
    } catch (e) {
      setError(e.message || 'Erro ao salvar')
      setSaving(false)
    }
  }

  return (
    <div
      onClick={() => !saving && !confirmingDelete && onClose?.()}
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto"
      style={{ background: 'rgba(7,9,18,0.75)', backdropFilter: 'blur(8px)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl w-full max-w-lg my-4"
        style={{ background: 'var(--bg-app-soft)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-5 border-b" style={{ borderColor: 'var(--border-soft)' }}>
          <div>
            <div className="text-xs uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>
              {isEditing ? 'Editar compromisso' : 'Novo compromisso'}
            </div>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-xl sm:text-2xl">
              {isEditing ? event.title : 'O que vai acontecer?'}
            </h2>
          </div>
          <button onClick={onClose} disabled={saving} className="p-1.5 rounded transition hover:bg-white/5" style={{ color: 'var(--text-tertiary)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Confirmação de delete (overlay interno) */}
        {confirmingDelete && (
          <DeleteConfirm
            event={event}
            isRecurring={isRecurringEdit}
            onCancel={() => setConfirmingDelete(false)}
            onConfirm={async (mode) => {
              setSaving(true)
              try { await onDelete(mode) }
              catch (e) { setError(e.message); setSaving(false); setConfirmingDelete(false) }
            }}
            loading={saving}
          />
        )}

        {!confirmingDelete && (
          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">

            {/* Erro */}
            {error && (
              <div className="rounded-lg p-3 text-sm flex items-start gap-2"
                style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', color: '#fda4af' }}>
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {error}
              </div>
            )}

            {/* Título */}
            <div>
              <label className="text-xs mb-1 block uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                Título
              </label>
              <input
                autoFocus
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Reunião com cliente, Médico, Jantar..."
                style={inputStyle}
                className="placeholder:text-white/25 focus:border-amber-400"
              />
            </div>

            {/* Data */}
            <div>
              <label className="text-xs mb-1 block uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                <Calendar size={11} className="inline mr-1" />
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }}
                className="focus:border-amber-400"
              />
            </div>

            {/* Horário */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  <Clock size={11} className="inline mr-1" />
                  Horário
                </label>
                <button
                  type="button"
                  onClick={() => setHasTime((v) => !v)}
                  className="text-xs px-2.5 py-1 rounded-full transition"
                  style={{
                    background: hasTime ? 'rgba(212,175,55,0.15)' : 'var(--bg-elev2)',
                    color: hasTime ? 'var(--accent-gold)' : 'var(--text-muted)',
                    border: `1px solid ${hasTime ? 'rgba(212,175,55,0.35)' : 'var(--border-soft)'}`,
                  }}
                >
                  {hasTime ? 'Com horário ✓' : 'Dia inteiro'}
                </button>
              </div>

              {hasTime && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Início</div>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }}
                      className="focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Fim (opcional)</div>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      placeholder="--:--"
                      style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }}
                      className="focus:border-amber-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Local */}
            <div>
              <label className="text-xs mb-1 block uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                <MapPin size={11} className="inline mr-1" />
                Local <span className="normal-case opacity-70">(opcional)</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Av. Paulista 1000, sala 502"
                style={inputStyle}
                className="placeholder:text-white/25 focus:border-amber-400"
              />
            </div>

            {/* Notas */}
            <div>
              <label className="text-xs mb-1 block uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                <FileText size={11} className="inline mr-1" />
                Notas <span className="normal-case opacity-70">(opcional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalhes, lembretes, contatos..."
                rows={2}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
                className="placeholder:text-white/25 focus:border-amber-400"
              />
            </div>

            {/* Cor */}
            <div>
              <label className="text-xs mb-2 block uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                Cor
              </label>
              <div className="flex gap-2 flex-wrap">
                {AGENDA_COLORS.map((c) => {
                  const isSel = color === c.id
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.id)}
                      title={c.name}
                      className="w-8 h-8 rounded-full transition shrink-0"
                      style={{
                        background: c.hex,
                        outline: isSel ? `2px solid ${c.hex}` : 'none',
                        outlineOffset: 2,
                        transform: isSel ? 'scale(1.1)' : 'scale(1)',
                      }}
                    />
                  )
                })}
              </div>
            </div>

            {/* Recorrência */}
            <div>
              <label className="text-xs mb-1 block uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                <Repeat size={11} className="inline mr-1" />
                Repetição
              </label>
              <select
                value={recurring}
                onChange={(e) => setRecurring(e.target.value)}
                style={{
                  ...inputStyle,
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'/%3e%3c/svg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  paddingRight: 36,
                  cursor: 'pointer',
                }}
              >
                {RECURRENCE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id} style={{ background: '#0f1525' }}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {recurring !== 'none' && (
                <div className="mt-2">
                  <div className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
                    Repetir até (opcional)
                  </div>
                  <input
                    type="date"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    min={date}
                    placeholder="Sem fim"
                    style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }}
                    className="focus:border-amber-400"
                  />
                  <div className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    Deixe vazio pra repetir pra sempre
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        {!confirmingDelete && (
          <div className="flex items-center justify-between gap-2 p-4 border-t" style={{ borderColor: 'var(--border-soft)' }}>
            {isEditing ? (
              <button
                onClick={() => setConfirmingDelete(true)}
                disabled={saving}
                className="text-sm px-3 py-2 rounded-lg flex items-center gap-1.5 transition hover:opacity-80 disabled:opacity-50"
                style={{ color: 'var(--accent-rose)' }}
              >
                <Trash2 size={14} /> Excluir
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                disabled={saving}
                className="text-sm px-3 py-2 rounded-lg transition hover:opacity-80 disabled:opacity-50"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={!canSubmit}
                className="text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition disabled:opacity-40"
                style={{
                  background: canSubmit ? 'linear-gradient(180deg, #d4af37, #a87f1f)' : 'rgba(212,175,55,0.3)',
                  color: '#070912',
                }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {saving ? 'Salvando…' : isEditing ? 'Salvar mudanças' : 'Criar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const inputStyle = {
  background: 'var(--bg-elev1)',
  border: '1px solid var(--border-medium)',
  color: 'var(--text-primary)',
  width: '100%',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}

// ---------- DeleteConfirm (interno) ----------
function DeleteConfirm({ event, isRecurring, onConfirm, onCancel, loading }) {
  return (
    <div className="p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg shrink-0" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--accent-amber)' }}>
          <AlertTriangle size={18} />
        </div>
        <div>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-lg leading-tight">
            Excluir compromisso?
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {event.title}
          </p>
        </div>
      </div>

      {isRecurring ? (
        <>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Este compromisso se repete. Como você quer excluir?
          </p>
          <button
            onClick={() => onConfirm('single')}
            disabled={loading}
            className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--bg-elev1)', border: '1px solid var(--border-medium)' }}
          >
            <div className="p-1.5 rounded-md shrink-0" style={{ background: 'rgba(6,182,212,0.15)', color: 'var(--accent-cyan)' }}>
              <Calendar size={13} />
            </div>
            <div>
              <div className="font-medium text-sm">Só essa ocorrência</div>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Pula só este dia. Continua aparecendo nos outros.
              </div>
            </div>
          </button>
          <button
            onClick={() => onConfirm('forever')}
            disabled={loading}
            className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition hover:opacity-90 disabled:opacity-50"
            style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.25)' }}
          >
            <div className="p-1.5 rounded-md shrink-0" style={{ background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)' }}>
              <Trash2 size={13} />
            </div>
            <div>
              <div className="font-medium text-sm">Pra sempre (a partir desta)</div>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Encerra a recorrência. Ocorrências passadas ficam no histórico.
              </div>
            </div>
          </button>
        </>
      ) : (
        <>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Esta ação não pode ser desfeita.
          </p>
          <button
            onClick={() => onConfirm('forever')}
            disabled={loading}
            className="w-full text-sm font-semibold px-4 py-2.5 rounded-lg transition disabled:opacity-50"
            style={{ background: 'var(--accent-rose)', color: '#fff' }}
          >
            {loading ? 'Excluindo…' : 'Sim, excluir'}
          </button>
        </>
      )}

      <div className="flex justify-end">
        <button
          onClick={onCancel}
          disabled={loading}
          className="text-sm px-3 py-2 rounded-lg transition hover:opacity-80"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
