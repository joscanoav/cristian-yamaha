/**
 * Utilidades de conversión entre frecuencia, número MIDI, nombre de nota
 * en notación española y octava.
 *
 * Convención de octavas (notación científica de afinación, usada por MIDI):
 * - Do4 = MIDI 60 = do central del piano (C4 en notación anglosajona).
 * - La4 = MIDI 69 = 440 Hz (afinación de referencia internacional).
 * - El teclado completo del piano abarca La0 (MIDI 21) hasta Do8 (MIDI 108).
 * La octava de una nota aumenta en 1 al pasar de Si a Do.
 */

export const NOTE_NAMES_ES = [
  'Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa',
  'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si',
] as const

export type NoteNameEs = (typeof NOTE_NAMES_ES)[number]

/** Afinación de referencia: La4 = 440 Hz. */
export const A4_FREQUENCY = 440
/** Número MIDI de La4. */
export const A4_MIDI = 69
/** Número MIDI del do central (Do4). */
export const MIDDLE_C_MIDI = 60
/** Tecla más grave del piano de 88 teclas (La0). */
export const PIANO_LOW_MIDI = 21
/** Tecla más aguda del piano de 88 teclas (Do8). */
export const PIANO_HIGH_MIDI = 108

export interface NoteInfo {
  /** Número MIDI entero. */
  midi: number
  /** Nombre en notación española, p. ej. "Do#". */
  name: NoteNameEs
  /** Octava según la convención Do4 = MIDI 60. */
  octave: number
  /** Etiqueta completa, p. ej. "Do4". */
  label: string
  /** true si es tecla negra (grado con sostenido). */
  isBlack: boolean
}

/** Convierte un número MIDI (posiblemente fraccionario) a frecuencia en Hz. */
export function frequencyFromMidi(midi: number): number {
  return A4_FREQUENCY * 2 ** ((midi - A4_MIDI) / 12)
}

/**
 * Convierte una frecuencia en Hz a su número MIDI más cercano (fraccionario).
 * Lanza un error si la frecuencia no es un número positivo finito.
 */
export function midiFromFrequency(frequency: number): number {
  if (!Number.isFinite(frequency) || frequency <= 0) {
    throw new RangeError(`Frecuencia inválida: ${frequency}`)
  }
  return A4_MIDI + 12 * Math.log2(frequency / A4_FREQUENCY)
}

/** Devuelve la información de la nota con el número MIDI entero indicado. */
export function noteFromMidi(midi: number): NoteInfo {
  if (!Number.isInteger(midi)) {
    throw new RangeError(`El número MIDI debe ser entero: ${midi}`)
  }
  const pitchClass = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1
  const name = NOTE_NAMES_ES[pitchClass]
  return {
    midi,
    name,
    octave,
    label: `${name}${octave}`,
    isBlack: name.includes('#'),
  }
}

/** Calcula el número MIDI a partir del nombre en español y la octava. */
export function midiFromNoteName(name: NoteNameEs, octave: number): number {
  const pitchClass = NOTE_NAMES_ES.indexOf(name)
  if (pitchClass < 0) {
    throw new RangeError(`Nombre de nota inválido: ${name}`)
  }
  return (octave + 1) * 12 + pitchClass
}

export interface NearestNote {
  /** Número MIDI entero de la nota más cercana. */
  midi: number
  /** Desviación en cents respecto a la nota ideal (negativa = bemol). */
  cents: number
}

/**
 * Dada una frecuencia estimada, devuelve la nota más cercana y su
 * desviación en cents (100 cents = 1 semitono).
 */
export function nearestNoteFromFrequency(frequency: number): NearestNote {
  const exactMidi = midiFromFrequency(frequency)
  const midi = Math.round(exactMidi)
  const cents = 1200 * Math.log2(frequency / frequencyFromMidi(midi))
  return { midi, cents }
}

/** Indica si una desviación en cents está dentro de la tolerancia (±30 cents por defecto). */
export function isWithinTolerance(cents: number, toleranceCents = 30): boolean {
  return Math.abs(cents) <= toleranceCents
}
