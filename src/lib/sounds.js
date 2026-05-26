// Sons de feedback pro app — sintetizados via Web Audio API
// (sem precisar de arquivos MP3 e sem peso no bundle)

let audioContext = null

function getCtx() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
    } catch {
      return null
    }
  }
  return audioContext
}

/**
 * Toca um "ding" elegante — usado quando pagamento é confirmado.
 * Duas notas em sequência (G5 → C6) com fade out, estilo notification refinado.
 */
export function playSuccess() {
  const ctx = getCtx()
  if (!ctx) return
  // Browser pode bloquear se nunca houve interação — silencia em caso de erro
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})

  const now = ctx.currentTime
  const notes = [
    { freq: 783.99, start: 0, duration: 0.18 },     // G5
    { freq: 1046.50, start: 0.13, duration: 0.35 }, // C6
  ]

  notes.forEach(({ freq, start, duration }) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    osc.connect(gain)
    gain.connect(ctx.destination)
    // Envelope ADSR simplificado pra som suave (sem clique)
    gain.gain.setValueAtTime(0, now + start)
    gain.gain.linearRampToValueAtTime(0.18, now + start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration)
    osc.start(now + start)
    osc.stop(now + start + duration + 0.05)
  })
}
