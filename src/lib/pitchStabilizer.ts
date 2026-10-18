/**
 * Estabilización de la frecuencia estimada por el micrófono.
 *
 * Exige varios fragmentos consecutivos (3–5, por defecto 4) con la misma
 * nota antes de aceptarla y devuelve la mediana de las estimaciones
 * fiables. El primer fragmento de cada ataque queda fuera de la mediana:
 * su ventana de 4096 muestras (unos 85 ms) incluye el transitorio del
 * ataque, más de los 60 ms que conviene ignorar. A un análisis cada 80 ms,
 * la nota se confirma en unos 320 ms, lo que evita falsos positivos por
 * un cálculo aislado erróneo de YIN.
 */

import { midiFromFrequency } from './notes'

export interface StabilizerInput {
  /** Volumen RMS del fotograma. */
  rms: number
  /** Frecuencia estimada por YIN, o null si no hay pitch claro. */
  frequency: number | null
  /** Confianza de la estimación (0 a 1), o null. */
  confidence: number | null
}

export interface StabilizedFrame extends StabilizerInput {
  /**
   * Mediana de las estimaciones fiables solo cuando la nota acumula los
   * fragmentos requeridos; null mientras no esté confirmada.
   */
  stableFrequency: number | null
  /** Fragmentos consecutivos con la misma nota (0 si no hay pitch). */
  consecutiveFragments: number
}

export interface PitchStabilizerOptions {
  /** Fragmentos consecutivos con la misma nota necesarios para aceptarla. */
  requiredFragments?: number
  /** Fragmentos iniciales del ataque excluidos de la mediana. */
  warmupFragments?: number
}

export const DEFAULT_STABILIZER_OPTIONS: Required<PitchStabilizerOptions> = {
  requiredFragments: 4,
  warmupFragments: 1,
}

export interface PitchStabilizer {
  /** Procesa un fotograma y devuelve la versión estabilizada. */
  process(frame: StabilizerInput): StabilizedFrame
  /** Vuelve al estado inicial (sin racha). */
  reset(): void
}

export function createPitchStabilizer(
  options: PitchStabilizerOptions = {},
): PitchStabilizer {
  const merged = { ...DEFAULT_STABILIZER_OPTIONS, ...options }
  const required = Math.max(1, Math.round(merged.requiredFragments))
  // El warmup debe dejar al menos una estimación para la mediana.
  const warmup = Math.max(
    0,
    Math.min(Math.round(merged.warmupFragments), required - 1),
  )

  let streakMidi: number | null = null
  let streak = 0
  // Últimas estimaciones fiables (sin las de warmup), como mucho `required`.
  const estimates: number[] = []

  function clear(): void {
    streakMidi = null
    streak = 0
    estimates.length = 0
  }

  return {
    reset(): void {
      clear()
    },

    process(frame: StabilizerInput): StabilizedFrame {
      const hasPitch =
        frame.frequency !== null &&
        Number.isFinite(frame.frequency) &&
        frame.frequency > 0 &&
        frame.confidence !== null &&
        frame.confidence > 0

      if (!hasPitch) {
        clear()
        return { ...frame, stableFrequency: null, consecutiveFragments: 0 }
      }

      const midi = Math.round(midiFromFrequency(frame.frequency as number))
      if (midi !== streakMidi) {
        // Nuevo ataque: se reinicia la racha y, si hay warmup, este
        // fragmento (con el transitorio) queda fuera de la mediana.
        clear()
        streakMidi = midi
        streak = 1
        if (warmup < 1) estimates.push(frame.frequency as number)
        return { ...frame, stableFrequency: null, consecutiveFragments: 1 }
      }

      streak++
      if (streak > warmup) {
        estimates.push(frame.frequency as number)
        if (estimates.length > required) estimates.shift()
      }

      return {
        ...frame,
        stableFrequency:
          streak >= required && estimates.length > 0 ? median(estimates) : null,
        consecutiveFragments: streak,
      }
    },
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = sorted.length >> 1
  if (sorted.length % 2 === 1) return sorted[middle]
  return (sorted[middle - 1] + sorted[middle]) / 2
}
