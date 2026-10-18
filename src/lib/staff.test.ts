import { describe, expect, it } from 'vitest'
import { midiFromNoteName } from './notes'
import {
  diatonicStep,
  hasSharp,
  ledgerLines,
  noteY,
  staffOffsetSteps,
  TREBLE_BOTTOM_STEP,
  TREBLE_TOP_STEP,
} from './staff'

describe('diatonicStep', () => {
  it('asigna el paso 0 a Do0 según la convención Do4 = paso 28', () => {
    expect(diatonicStep(midiFromNoteName('Do', 0))).toBe(0)
    expect(diatonicStep(midiFromNoteName('Do', 4))).toBe(28)
  })

  it('cada letra consecutiva sube un paso', () => {
    expect(diatonicStep(midiFromNoteName('Do', 4))).toBe(28)
    expect(diatonicStep(midiFromNoteName('Re', 4))).toBe(29)
    expect(diatonicStep(midiFromNoteName('Mi', 4))).toBe(30)
    expect(diatonicStep(midiFromNoteName('Fa', 4))).toBe(31)
    expect(diatonicStep(midiFromNoteName('Sol', 4))).toBe(32)
    expect(diatonicStep(midiFromNoteName('La', 4))).toBe(33)
    expect(diatonicStep(midiFromNoteName('Si', 4))).toBe(34)
    expect(diatonicStep(midiFromNoteName('Do', 5))).toBe(35)
  })

  it('ignora los sostenidos para el cálculo de altura', () => {
    expect(diatonicStep(midiFromNoteName('Do', 4) + 1)).toBe(
      diatonicStep(midiFromNoteName('Do', 4)),
    )
  })

  it('sitúa las líneas del pentagrama en Mi4, Sol4, Si4, Re5 y Fa5', () => {
    expect(TREBLE_BOTTOM_STEP).toBe(diatonicStep(midiFromNoteName('Mi', 4)))
    expect(TREBLE_TOP_STEP).toBe(diatonicStep(midiFromNoteName('Fa', 5)))
    expect(diatonicStep(midiFromNoteName('Sol', 4))).toBe(TREBLE_BOTTOM_STEP + 2)
    expect(diatonicStep(midiFromNoteName('Si', 4))).toBe(TREBLE_BOTTOM_STEP + 4)
    expect(diatonicStep(midiFromNoteName('Re', 5))).toBe(TREBLE_BOTTOM_STEP + 6)
  })
})

describe('staffOffsetSteps y noteY', () => {
  it('Mi4 (línea inferior) tiene desplazamiento 0', () => {
    expect(staffOffsetSteps(midiFromNoteName('Mi', 4))).toBe(0)
  })

  it('Fa5 (línea superior) está 8 pasos por encima', () => {
    expect(staffOffsetSteps(midiFromNoteName('Fa', 5))).toBe(8)
  })

  it('Do4 (una línea adicional inferior) está 2 pasos por debajo', () => {
    expect(staffOffsetSteps(midiFromNoteName('Do', 4))).toBe(-2)
  })

  it('noteY coloca cada paso a media separación de la línea inferior', () => {
    const bottom = 100
    const spacing = 12
    expect(noteY(midiFromNoteName('Mi', 4), bottom, spacing)).toBe(100)
    expect(noteY(midiFromNoteName('Fa', 4), bottom, spacing)).toBe(94)
    expect(noteY(midiFromNoteName('Sol', 4), bottom, spacing)).toBe(88)
    expect(noteY(midiFromNoteName('Do', 4), bottom, spacing)).toBe(112)
  })
})

describe('ledgerLines', () => {
  it('las notas dentro del pentagrama no llevan líneas adicionales', () => {
    expect(ledgerLines(midiFromNoteName('Mi', 4))).toEqual([])
    expect(ledgerLines(midiFromNoteName('Si', 4))).toEqual([])
    expect(ledgerLines(midiFromNoteName('Fa', 5))).toEqual([])
  })

  it('Do4 lleva una única línea adicional inferior (paso 28)', () => {
    expect(ledgerLines(midiFromNoteName('Do', 4))).toEqual([28])
  })

  it('Re4 (por debajo de la línea inferior) no lleva línea, es un espacio', () => {
    expect(ledgerLines(midiFromNoteName('Re', 4))).toEqual([])
  })

  it('La3 lleva dos líneas inferiores (28 y 26)', () => {
    expect(ledgerLines(midiFromNoteName('La', 3))).toEqual([28, 26])
  })

  it('Sol5 (por encima de la línea superior) no lleva línea adicional', () => {
    expect(ledgerLines(midiFromNoteName('Sol', 5))).toEqual([])
  })

  it('La5 lleva una línea adicional superior (paso 40)', () => {
    expect(ledgerLines(midiFromNoteName('La', 5))).toEqual([40])
  })

  it('Do6 lleva dos líneas superiores (40 y 42)', () => {
    expect(ledgerLines(midiFromNoteName('Do', 6))).toEqual([40, 42])
  })
})

describe('hasSharp', () => {
  it('detecta las notas con sostenido', () => {
    expect(hasSharp(midiFromNoteName('Do', 4) + 1)).toBe(true)
    expect(hasSharp(midiFromNoteName('Fa', 4) + 1)).toBe(true)
    expect(hasSharp(midiFromNoteName('Do', 4))).toBe(false)
    expect(hasSharp(midiFromNoteName('Mi', 4))).toBe(false)
  })
})
