import { useState, useEffect } from 'react'
import { X, Calendar, Clock, FileText, Repeat, Check, Loader2, Trash2, AlertTriangle, Bell, MessageCircle, Copy } from 'lucide-react'
import { AGENDA_COLORS, RECURRENCE_OPTIONS, WEEKDAY_LABELS, WEEKDAY_PRESETS, todayISO } from '../../lib/agendaUtils'

// Modal pra criar OU editar um compromisso.
//
// Props:
//   event?    — se passado, é edição
//   initialDate? — pré-preenche a data
//   initialTitle? — pré-preenche o título (usado quando converte tarefa em compromisso)
//   initialTime? — pré-preenche a hora (usado quando clica num slot do timeline)
//   onSave    — async (payload) => void
//   onDelete  — async (mode: 'single' | 'forever') => void
//   onDuplicate? — async () => void (cria cópia idêntica e fecha)
//   onClose   — () => void
export default function EventForm({ event, initialDate, initialTitle, initialTime, occurrenceDate, onSave, onDelete, onDuplicate, onClose }) {
  const isEditing = !!event
  const isRecurringEdit = isEditing && event.recurring !== 'none'

  // Campo único — substitui título + descrição
  const [text, setText] = useState(event?.title || initialTitle || '')
  const [date, setDate] = useState(event?.date || occurrenceDate || initialDate || todayISO())
  const [time, setTime] = useState(event?.time?.slice(0, 5) || initialTime || nextRoundHour())
  // Duração padrão: 1h quando criando novo (se já tem time mas não tem end_time)
  const computeDefaultEndTime = () => {
    if (event?.end_time) return event.end_time.slice(0, 5)
    if (event) return ''  // editando evento sem end_time, mantém vazio
    // Criando novo: assume 1h
    const startStr = event?.time?.slice(0, 5) || initialTime || nextRoundHour()
    const [h, m] = startStr.split(':').map(Number)
    const totalEnd = (h * 60 + m) + 60
    const eh = Math.floor(totalEnd / 60) % 24
    const em = totalEnd % 60
    return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
  }
  const [endTime, setEndTime] = useState(computeDefaultEndTime())
  const [notes, setNotes] = useState(event?.notes || '')  // mantém no banco caso queira
  const [color, setColor] = useState(event?.color || 'cyan')
  const [recurring, setRecurring] = useState(event?.recurring || 'none')
  const [weekdays, setWeekdays] = useState(event?.recurring_weekdays || [])
  const [endsAt, setEndsAt] = useState(event?.ends_at || '')
  const [customDurInput, setCustomDurInput] = useState('')

  // Lembrete: toggle + minutos antes
  const [wantReminder, setWantReminder] = useState(
    event?.reminder_minutes_before != null && event?.reminder_minutes_before >= 0
  )
  const [reminderMins, setReminderMins] = useState(
    event?.reminder_minutes_before != null ? event.reminder_minutes_before : 15
  )
  const [customReminderInput, setCustomReminderInput] = useState('')

  // Calcula duração inicial em minutos. Default ao criar = 60min (1h)
  function computeInitialDuration() {
    if (event?.time && event?.end_time) {
      const [sh, sm] = event.time.split(':').map(Number)
      const [eh, em] = event.end_time.split(':').map(Number)
      return (eh * 60 + em) - (sh * 60 + sm)
    }
    if (event) return null  // editando sem end_time
    return 60  // criando novo: padrão 1h
  }
  const [duration, setDuration] = useState(computeInitialDuration())

  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState('')

  // ===== Bloqueia scroll do body enquanto modal está aberto =====
  // Compensa a largura da scrollbar pra evitar o "salto" visual
  useEffect(() => {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`
    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
    }
  }, [])

  // ESC fecha
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  const canSubmit = text.trim().length > 0 && !!date && !!time
    && !(recurring === 'weekdays' && weekdays.length === 0)
    && !saving

  // Aplica duração escolhida — calcula endTime
  const applyDuration = (mins) => {
    setDuration(mins)
    if (mins) setCustomDurInput('')  // limpa input custom quando seleciona chip
    if (!mins) { setEndTime(''); return }
    const [h, m] = time.split(':').map(Number)
    const totalStart = h * 60 + m
    const totalEnd = totalStart + mins
    const eh = Math.floor(totalEnd / 60) % 24
    const em = totalEnd % 60
    setEndTime(`${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}`)
  }

  // Quando digita duração custom no input
  const onCustomDurChange = (val) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 4)
    setCustomDurInput(cleaned)
    if (cleaned) {
      applyDuration(parseInt(cleaned, 10))
    } else {
      setDuration(null)
      setEndTime('')
    }
  }

  // Toggle dia da semana selecionado
  const toggleWeekday = (id) => {
    setWeekdays((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].sort())
  }

  const applyPreset = (days) => {
    setWeekdays(days)
  }

  // Quando muda time manualmente, recalcula endTime se houver duração
  const onTimeChange = (newTime) => {
    setTime(newTime)
    if (duration) {
      const [h, m] = newTime.split(':').map(Number)
      const totalStart = h * 60 + m
      const totalEnd = totalStart + duration
      const eh = Math.floor(totalEnd / 60) % 24
      const em = totalEnd % 60
      setEndTime(`${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}`)
    }
  }

  const submit = async () => {
    if (!canSubmit) return
    setError('')
    setSaving(true)
    try {
      await onSave({
        title: text.trim(),
        date,
        time,
        end_time: endTime || null,
        location: null,
        notes: notes.trim() || null,
        color,
        recurring,
        recurring_weekdays: recurring === 'weekdays' ? weekdays : null,
        ends_at: recurring !== 'none' && endsAt ? endsAt : null,
        reminder_minutes_before: wantReminder ? reminderMins : null,
      })
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
          <button onClick={onClose} disabled={saving} className="p-1.5 rounded transition hover:bg-white/5 shrink-0" style={{ color: 'var(--text-tertiary)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Confirmação de delete */}
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

            {/* Campo principal — único */}
            <div>
              <label className="text-xs mb-1.5 block uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                O que é?
              </label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ex: Reunião com cliente, Consulta médica, Jantar com Ana..."
                style={inputStyle}
                className="placeholder:text-white/25 focus:border-cyan-400"
              />
            </div>

            {/* Data e Hora — compactos, largura limitada (evita estouro no iOS) */}
            <div className="flex flex-wrap gap-4">
              <div className="min-w-0">
                <label className="text-xs mb-1.5 block uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  <Calendar size={11} className="inline mr-1" />
                  Data
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={dateInputStyle}
                  className="focus:border-cyan-400"
                />
              </div>

              <div className="min-w-0">
                <label className="text-xs mb-1.5 block uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  <Clock size={11} className="inline mr-1" />
                  Hora
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => onTimeChange(e.target.value)}
                  style={timeInputStyle}
                  className="focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Duração — chips + input livre sempre visível */}
            <div>
              <label className="text-xs mb-1.5 block uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                Duração
              </label>
              <div className="flex gap-1.5 flex-wrap items-center">
                {[
                  { label: '15 min', mins: 15 },
                  { label: '30 min', mins: 30 },
                  { label: '1 hora', mins: 60 },
                  { label: '1h 30min', mins: 90 },
                  { label: '2 horas', mins: 120 },
                ].map((opt) => {
                  const isSel = duration === opt.mins
                  return (
                    <button
                      key={opt.mins}
                      type="button"
                      onClick={() => applyDuration(opt.mins)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition"
                      style={{
                        background: isSel ? 'rgba(6,182,212,0.15)' : 'var(--bg-elev1)',
                        border: `1px solid ${isSel ? 'rgba(6,182,212,0.5)' : 'var(--border-medium)'}`,
                        color: isSel ? '#06b6d4' : 'var(--text-secondary)',
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}

                {/* Input livre — sempre visível, sem botão "Outro" */}
                <div className="flex items-center gap-1.5 rounded-full"
                  style={{ background: 'var(--bg-elev1)', border: '1px solid var(--border-medium)' }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={customDurInput}
                    onChange={(e) => onCustomDurChange(e.target.value)}
                    placeholder="ou…"
                    style={{
                      background: 'transparent', border: 'none', outline: 'none',
                      color: 'var(--text-primary)',
                      fontSize: 12, fontWeight: 500,
                      width: 50, padding: '6px 4px 6px 12px',
                      textAlign: 'right',
                      fontFamily: 'Manrope, sans-serif',
                    }}
                  />
                  <span className="pr-3 text-xs" style={{ color: 'var(--text-muted)' }}>min</span>
                </div>

                {(duration || endTime) && (
                  <button
                    type="button"
                    onClick={() => { setEndTime(''); setDuration(null); setCustomDurInput('') }}
                    className="px-2.5 py-1.5 rounded-full text-xs transition"
                    style={{ color: 'var(--text-muted)' }}
                    title="Sem duração definida"
                  >
                    ✕
                  </button>
                )}
              </div>

              {endTime && (
                <div className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                  🕐 Termina às <strong style={{ color: 'var(--text-primary)' }}>{endTime}</strong>
                </div>
              )}
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

            {/* Lembrete via Alfred */}
            <div>
              <button
                type="button"
                onClick={() => setWantReminder((v) => !v)}
                className="w-full flex items-center gap-3 p-3 rounded-xl transition text-left"
                style={{
                  background: wantReminder ? 'rgba(37,211,102,0.08)' : 'var(--bg-elev1)',
                  border: `1px solid ${wantReminder ? 'rgba(37,211,102,0.4)' : 'var(--border-medium)'}`,
                }}
              >
                <div className="p-2 rounded-lg shrink-0" style={{
                  background: wantReminder ? '#25D366' : 'var(--bg-elev2)',
                  color: wantReminder ? 'white' : 'var(--text-tertiary)',
                }}>
                  <MessageCircle size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                    Quer um lembrete do Alfred?
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    🎩 Alfred manda mensagem no seu WhatsApp antes do compromisso
                  </div>
                </div>
                <div
                  className="flex items-center justify-center w-5 h-5 rounded shrink-0"
                  style={{
                    background: wantReminder ? '#25D366' : 'transparent',
                    border: `2px solid ${wantReminder ? '#25D366' : 'var(--border-strong)'}`,
                  }}
                >
                  {wantReminder && <Check size={11} style={{ color: 'white' }} strokeWidth={3} />}
                </div>
              </button>

              {wantReminder && (
                <div className="mt-3 pl-1">
                  <div className="text-[10px] mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Avisar quanto tempo antes?
                  </div>
                  <div className="flex gap-1.5 flex-wrap items-center">
                    {[
                      { label: 'na hora', mins: 0 },
                      { label: '5 min', mins: 5 },
                      { label: '15 min', mins: 15 },
                      { label: '30 min', mins: 30 },
                      { label: '1 hora', mins: 60 },
                      { label: '1 dia', mins: 1440 },
                    ].map((opt) => {
                      const isSel = reminderMins === opt.mins && customReminderInput === ''
                      return (
                        <button
                          key={opt.mins}
                          type="button"
                          onClick={() => { setReminderMins(opt.mins); setCustomReminderInput('') }}
                          className="px-3 py-1.5 rounded-full text-xs font-medium transition"
                          style={{
                            background: isSel ? 'rgba(37,211,102,0.15)' : 'var(--bg-elev1)',
                            border: `1px solid ${isSel ? 'rgba(37,211,102,0.5)' : 'var(--border-medium)'}`,
                            color: isSel ? '#25D366' : 'var(--text-secondary)',
                          }}
                        >
                          {opt.label}
                        </button>
                      )
                    })}

                    {/* Input livre */}
                    <div className="flex items-center gap-1.5 rounded-full"
                      style={{ background: 'var(--bg-elev1)', border: '1px solid var(--border-medium)' }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={customReminderInput}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                          setCustomReminderInput(v)
                          if (v) setReminderMins(parseInt(v, 10))
                        }}
                        placeholder="ou…"
                        style={{
                          background: 'transparent', border: 'none', outline: 'none',
                          color: 'var(--text-primary)',
                          fontSize: 12, fontWeight: 500,
                          width: 50, padding: '6px 4px 6px 12px',
                          textAlign: 'right',
                          fontFamily: 'Manrope, sans-serif',
                        }}
                      />
                      <span className="pr-3 text-xs" style={{ color: 'var(--text-muted)' }}>min</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Recorrência */}
            <div>
              <label className="text-xs mb-1.5 block uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
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

              {/* Seletor de dias da semana — só quando recurring='weekdays' */}
              {recurring === 'weekdays' && (
                <div className="mt-3 space-y-2.5">
                  {/* Presets */}
                  <div className="flex gap-1.5 flex-wrap">
                    {WEEKDAY_PRESETS.map((p) => {
                      const isSel = JSON.stringify([...weekdays].sort()) === JSON.stringify([...p.days].sort())
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => applyPreset(p.days)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium transition"
                          style={{
                            background: isSel ? 'rgba(6,182,212,0.15)' : 'var(--bg-elev1)',
                            border: `1px solid ${isSel ? 'rgba(6,182,212,0.5)' : 'var(--border-medium)'}`,
                            color: isSel ? '#06b6d4' : 'var(--text-secondary)',
                          }}
                        >
                          {p.label}
                        </button>
                      )
                    })}
                  </div>

                  {/* Bolinhas de dias da semana */}
                  <div>
                    <div className="text-[10px] mb-1.5" style={{ color: 'var(--text-muted)' }}>
                      Ou escolha os dias:
                    </div>
                    <div className="flex gap-1.5 justify-between sm:justify-start sm:flex-wrap">
                      {WEEKDAY_LABELS.map((d) => {
                        const isSel = weekdays.includes(d.id)
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => toggleWeekday(d.id)}
                            title={d.label}
                            className="w-9 h-9 rounded-full text-sm font-semibold transition flex items-center justify-center"
                            style={{
                              background: isSel ? '#06b6d4' : 'var(--bg-elev1)',
                              border: `1px solid ${isSel ? '#06b6d4' : 'var(--border-medium)'}`,
                              color: isSel ? '#fff' : 'var(--text-secondary)',
                            }}
                          >
                            {d.short}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {weekdays.length === 0 && (
                    <div className="text-[11px]" style={{ color: 'var(--accent-amber)' }}>
                      ⚠ Selecione ao menos um dia da semana
                    </div>
                  )}
                </div>
              )}

              {recurring !== 'none' && (
                <div className="mt-3">
                  <div className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
                    Repetir até <span className="opacity-70">(deixe vazio pra sempre)</span>
                  </div>
                  <input
                    type="date"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    min={date}
                    style={dateInputStyle}
                    className="focus:border-cyan-400"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        {!confirmingDelete && (
          <div className="flex items-center justify-between gap-2 p-4 border-t" style={{ borderColor: 'var(--border-soft)' }}>
            {isEditing ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setConfirmingDelete(true)}
                  disabled={saving}
                  className="text-sm px-2.5 py-2 rounded-lg flex items-center gap-1.5 transition hover:opacity-80 disabled:opacity-50"
                  style={{ color: 'var(--accent-rose)' }}
                  title="Excluir compromisso"
                >
                  <Trash2 size={14} /> <span className="hidden sm:inline">Excluir</span>
                </button>
                {onDuplicate && (
                  <button
                    onClick={async () => {
                      if (saving) return
                      setSaving(true)
                      try { await onDuplicate() } catch (err) { console.error(err) }
                      finally { setSaving(false) }
                    }}
                    disabled={saving}
                    className="text-sm px-2.5 py-2 rounded-lg flex items-center gap-1.5 transition hover:opacity-80 disabled:opacity-50"
                    style={{ color: '#06b6d4' }}
                    title="Criar uma cópia idêntica deste compromisso"
                  >
                    <Copy size={14} /> <span className="hidden sm:inline">Duplicar</span>
                  </button>
                )}
              </div>
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
                  background: canSubmit ? '#06b6d4' : 'rgba(6,182,212,0.3)',
                  color: '#fff',
                  boxShadow: canSubmit ? '0 6px 16px rgba(6,182,212,0.25)' : 'none',
                }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {saving ? 'Salvando…' : isEditing ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ===== Helpers =====

// Arredonda hora atual pra próxima hora cheia (ex: 14:23 → 15:00)
function nextRoundHour() {
  const d = new Date()
  d.setHours(d.getHours() + 1, 0, 0, 0)
  return `${String(d.getHours()).padStart(2, '0')}:00`
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

// Fonte mais bonita pra data/hora — usa a do app (Manrope) em vez de mono
const dateTimeStyle = {
  ...inputStyle,
  fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  fontSize: 15,
  fontWeight: 500,
  letterSpacing: '0.01em',
}

// Inputs date/time COMPACTOS — pra não estourar em iOS (native input ocupa tela toda)
const dateInputStyle = {
  background: 'var(--bg-elev1)',
  border: '1px solid var(--border-medium)',
  color: 'var(--text-primary)',
  borderRadius: 10,
  padding: '10px 12px',
  fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  fontSize: 14,
  fontWeight: 500,
  outline: 'none',
  width: 160,
  maxWidth: '100%',
  boxSizing: 'border-box',
}

const timeInputStyle = {
  background: 'var(--bg-elev1)',
  border: '1px solid var(--border-medium)',
  color: 'var(--text-primary)',
  borderRadius: 10,
  padding: '10px 12px',
  fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  fontSize: 14,
  fontWeight: 500,
  outline: 'none',
  width: 110,
  maxWidth: '100%',
  boxSizing: 'border-box',
}

// ---------- DeleteConfirm ----------
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
