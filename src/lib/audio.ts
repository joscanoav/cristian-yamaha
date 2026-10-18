/**
 * Generación de sonido mediante Web Audio API, sin archivos de audio
 * externos. El timbre combina un fundamental y dos armónicos con envolvente
 * de decaimiento para aproximar el ataque de un piano.
 */

import { frequencyFromMidi } from './notes'

type AudioContextCtor = typeof AudioContext

let audioContext: AudioContext | null = null
let playingTones = 0

/**
 * Indica si suena ahora mismo un tono generado por la aplicación.
 * El micrófono usa esta señal para pausar el análisis y no interpretar
 * el propio altavoz como una nota del usuario.
 */
export function isTonePlaying(): boolean {
  return playingTones > 0
}

function getAudioContext(): AudioContext {
  if (audioContext === null) {
    const ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
    if (!ctor) {
      throw new Error('Este navegador no es compatible con Web Audio API')
    }
    audioContext = new ctor()
  }
  return audioContext
}

/**
 * Reproduce una nota de referencia (o el sonido de una tecla pulsada).
 * Debe llamarse desde un gesto del usuario para garantizar que el
 * navegador permita el audio.
 */
export function playNote(midi: number, durationSeconds = 1.4): void {
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  const now = ctx.currentTime
  const fundamental = frequencyFromMidi(midi)

  const master = ctx.createGain()
  master.gain.setValueAtTime(0.0001, now)
  master.gain.exponentialRampToValueAtTime(0.5, now + 0.012)
  master.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds)
  master.connect(ctx.destination)

  playingTones++
  // El tono audible termina alrededor de durationSeconds; el margen extra
  // asegura que la ventana del analizador (unos 85 ms) quede limpia de
  // cola antes de reanudar el análisis del micrófono.
  window.setTimeout(
    () => {
      playingTones = Math.max(0, playingTones - 1)
    },
    (durationSeconds + 0.2) * 1000,
  )

  const partials = [
    { ratio: 1, gain: 0.55 },
    { ratio: 2, gain: 0.2 },
    { ratio: 3, gain: 0.08 },
  ]
  for (const partial of partials) {
    const oscillator = ctx.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.value = fundamental * partial.ratio
    const gain = ctx.createGain()
    gain.gain.value = partial.gain
    oscillator.connect(gain)
    gain.connect(master)
    oscillator.start(now)
    oscillator.stop(now + durationSeconds + 0.1)
  }
}
