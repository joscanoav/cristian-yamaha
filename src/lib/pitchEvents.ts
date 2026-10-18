/**
 * Seguimiento de eventos de nota a partir de fotogramas de audio
 * (volumen RMS + frecuencia estimada). Convierte un flujo continuo en
 * eventos discretos: nuevo ataque ('note') y fin de nota ('release').
 *
 * Distingue una nota sostenida de una nueva pulsación de la misma nota
 * mediante la caída de volumen: tras detectar un debilitamiento claro
 * respecto al pico se emite 'release' y solo se acepta un nuevo ataque
 * cuando el volumen vuelve a subir (histéresis), evitando que la cola
 * del piano repute como pulsación.
 */

import { nearestNoteFromFrequency } from './notes'

export interface PitchFrame {
  /** Volumen RMS del fotograma (0 = silencio). */
  rms: number
  /** Frecuencia estimada por YIN, o null si no hay pitch claro. */
  frequency: number | null
  /** Confianza de la estimación (0 a 1), o null. */
  confidence: number | null
}

export type NoteEvent =
  | { type: 'note'; midi: number }
  | { type: 'release' }

export interface PitchTrackerOptions {
  /** Confianza mínima de YIN para aceptar una nota. */
  minConfidence?: number
  /** RMS por debajo del cual se considera silencio. */
  silenceRms?: number
  /** Fracción del pico por debajo de la cual el volumen se ha "caído". */
  releaseRatio?: number
  /** Desviación máxima en cents para aceptar la nota (±30 cents). */
  toleranceCents?: number
  /** Fotogramas seguidos de silencio/inválidos necesarios para liberar. */
  framesToRelease?: number
  /** Factor de histéresis para rearmar tras una caída de volumen. */
  rearmFactor?: number
}

export const DEFAULT_PITCH_TRACKER_OPTIONS: Required<PitchTrackerOptions> = {
  minConfidence: 0.75,
  silenceRms: 0.012,
  releaseRatio: 0.35,
  toleranceCents: 30,
  framesToRelease: 4,
  rearmFactor: 2.5,
}

export interface NoteEventTracker {
  /** Procesa un fotograma y devuelve los eventos producidos. */
  process(frame: PitchFrame): NoteEvent[]
  /** Vuelve al estado inicial (silencio). */
  reset(): void
}

export function createNoteEventTracker(
  options: PitchTrackerOptions = {},
): NoteEventTracker {
  const opts = { ...DEFAULT_PITCH_TRACKER_OPTIONS, ...options }

  let mode: 'idle' | 'sounding' = 'idle'
  let currentMidi: number | null = null
  let peakRms = 0
  let lastRms = 0
  let quietFrames = 0
  let invalidFrames = 0
  let rearmRms = opts.silenceRms * 2

  function release(events: NoteEvent[]): void {
    events.push({ type: 'release' })
    mode = 'idle'
    currentMidi = null
    quietFrames = 0
    invalidFrames = 0
    // Histéresis: el siguiente ataque debe superar claramente el volumen
    // al que se liberó (o el silencio), no basta con la cola del sonido.
    rearmRms = Math.max(opts.silenceRms * 2, lastRms * opts.rearmFactor)
  }

  return {
    reset(): void {
      mode = 'idle'
      currentMidi = null
      peakRms = 0
      lastRms = 0
      quietFrames = 0
      invalidFrames = 0
      rearmRms = opts.silenceRms * 2
    },

    process(frame: PitchFrame): NoteEvent[] {
      const events: NoteEvent[] = []
      lastRms = frame.rms

      // Silencio sostenido: termina la nota.
      if (frame.rms < opts.silenceRms) {
        quietFrames++
        invalidFrames = 0
        if (mode === 'sounding' && quietFrames >= opts.framesToRelease) {
          release(events)
        }
        return events
      }
      quietFrames = 0

      const hasPitch =
        frame.frequency !== null &&
        frame.frequency > 0 &&
        frame.confidence !== null &&
        frame.confidence >= opts.minConfidence

      // Sonido sin pitch claro (ruido, habla): no cuenta como nota.
      if (!hasPitch) {
        invalidFrames++
        if (mode === 'sounding' && invalidFrames >= opts.framesToRelease) {
          release(events)
        }
        return events
      }

      const { midi, cents } = nearestNoteFromFrequency(frame.frequency as number)

      // Fuera de tolerancia (±opts.toleranceCents): no es una nota válida.
      if (Math.abs(cents) > opts.toleranceCents) {
        return events
      }
      invalidFrames = 0

      if (mode === 'idle') {
        // Tras una liberación, ignorar la cola que aún suena por debajo
        // del umbral de rearme.
        if (frame.rms < rearmRms) return events
        mode = 'sounding'
        currentMidi = midi
        peakRms = frame.rms
        events.push({ type: 'note', midi })
        return events
      }

      // Nota sonando: cambio directo a otra nota = nuevo ataque.
      if (midi !== currentMidi) {
        currentMidi = midi
        peakRms = frame.rms
        events.push({ type: 'note', midi })
        return events
      }

      // Misma nota: si el volumen cae claramente respecto al pico,
      // se libera y queda lista para un nuevo ataque.
      if (frame.rms > peakRms) peakRms = frame.rms
      if (frame.rms < peakRms * opts.releaseRatio) {
        release(events)
      }
      return events
    },
  }
}
