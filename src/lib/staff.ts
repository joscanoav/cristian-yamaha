/**
 * Lógica de posicionamiento en el pentagrama en clave de sol.
 * La posición se calcula a partir de la altura musical (paso diatónico),
 * no de posiciones fijas: cada paso de letra (Do, Re, Mi...) sube o baja
 * medio espacio en el pentagrama.
 *
 * Convención clave de sol (referencias en pasos diatónicos, Do4 = paso 28):
 * - Líneas de abajo arriba: Mi4 (30), Sol4 (32), Si4 (34), Re5 (36), Fa5 (38).
 * - Los pasos pares por debajo de Mi4 o por encima de Fa5 llevan líneas
 *   adicionales (p. ej. Do4 = paso 28, una línea adicional inferior).
 */

import { NOTE_NAMES_ES } from './notes'

const LETTER_ORDER = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'] as const

/**
 * Paso diatónico de un número MIDI: octave * 7 + índice de letra (Do=0..Si=6).
 * Las alteraciones (sostenidos) se ignoran para el cálculo de altura; se
 * representan con el sostenido a la izquierda de la nota.
 */
export function diatonicStep(midi: number): number {
  const pitchClass = ((midi % 12) + 12) % 12
  const natural = NOTE_NAMES_ES[pitchClass].replace('#', '')
  const letterIndex = LETTER_ORDER.indexOf(natural as (typeof LETTER_ORDER)[number])
  const octave = Math.floor(midi / 12) - 1
  return octave * 7 + letterIndex
}

/** Paso diatónico de la línea inferior del pentagrama: Mi4. */
export const TREBLE_BOTTOM_STEP = diatonicStep(64) // Mi4 = 30
/** Paso diatónico de la línea superior del pentagrama: Fa5. */
export const TREBLE_TOP_STEP = diatonicStep(77) // Fa5 = 38

/**
 * Desplazamiento vertical de una nota en el pentagrama, en pasos diatónicos
 * respecto a la línea inferior (positivo = hacia arriba).
 */
export function staffOffsetSteps(midi: number): number {
  return diatonicStep(midi) - TREBLE_BOTTOM_STEP
}

/**
 * Posición Y en píxeles de una nota. `bottomLineY` es la Y de la línea
 * inferior y `spacing` la separación entre líneas (cada paso diatónico
 * equivale a media separación).
 */
export function noteY(midi: number, bottomLineY: number, spacing: number): number {
  return bottomLineY - staffOffsetSteps(midi) * (spacing / 2)
}

/**
 * Pasos diatónicos de las líneas adicionales necesarias para dibujar la
 * nota indicada (vacío si la nota cabe dentro del pentagrama).
 */
export function ledgerLines(midi: number): number[] {
  const step = diatonicStep(midi)
  const lines: number[] = []
  if (step <= TREBLE_BOTTOM_STEP - 2) {
    for (let s = TREBLE_BOTTOM_STEP - 2; s >= step; s -= 2) lines.push(s)
  } else if (step >= TREBLE_TOP_STEP + 2) {
    for (let s = TREBLE_TOP_STEP + 2; s <= step; s += 2) lines.push(s)
  }
  return lines
}

/** true si el número MIDI corresponde a una tecla negra (sostenido). */
export function hasSharp(midi: number): boolean {
  return NOTE_NAMES_ES[((midi % 12) + 12) % 12].includes('#')
}
