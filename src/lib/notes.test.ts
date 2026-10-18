import { describe, expect, it } from 'vitest'
import {
  frequencyFromMidi,
  isWithinTolerance,
  midiFromFrequency,
  midiFromNoteName,
  nearestNoteFromFrequency,
  noteFromMidi,
  NOTE_NAMES_ES,
  PIANO_HIGH_MIDI,
  PIANO_LOW_MIDI,
} from './notes'

describe('convención de octavas', () => {
  it('Do4 es el MIDI 60 (do central)', () => {
    expect(midiFromNoteName('Do', 4)).toBe(60)
    expect(noteFromMidi(60).label).toBe('Do4')
  })

  it('La4 es el MIDI 69 y equivale a 440 Hz', () => {
    expect(midiFromNoteName('La', 4)).toBe(69)
    expect(frequencyFromMidi(69)).toBeCloseTo(440, 10)
  })

  it('el teclado de 88 teclas va de La0 (21) a Do8 (108)', () => {
    expect(noteFromMidi(PIANO_LOW_MIDI).label).toBe('La0')
    expect(noteFromMidi(PIANO_HIGH_MIDI).label).toBe('Do8')
    expect(PIANO_HIGH_MIDI - PIANO_LOW_MIDI + 1).toBe(88)
  })

  it('la octava aumenta al pasar de Si a Do', () => {
    expect(noteFromMidi(midiFromNoteName('Si', 3)).label).toBe('Si3')
    expect(noteFromMidi(midiFromNoteName('Do', 4)).label).toBe('Do4')
  })
})

describe('noteFromMidi / midiFromNoteName', () => {
  it('recorre los doce nombres en español', () => {
    expect([...NOTE_NAMES_ES]).toEqual([
      'Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa',
      'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si',
    ])
    expect(noteFromMidi(61).name).toBe('Do#')
    expect(noteFromMidi(62).name).toBe('Re')
  })

  it('identifica teclas negras y blancas', () => {
    expect(noteFromMidi(61).isBlack).toBe(true) // Do#4
    expect(noteFromMidi(60).isBlack).toBe(false) // Do4
    expect(noteFromMidi(64).isBlack).toBe(false) // Mi4
  })

  it('midiFromNoteName y noteFromMidi son inversas en todo el rango del piano', () => {
    for (let midi = PIANO_LOW_MIDI; midi <= PIANO_HIGH_MIDI; midi++) {
      const info = noteFromMidi(midi)
      expect(midiFromNoteName(info.name, info.octave)).toBe(midi)
    }
  })

  it('rechaza MIDI no entero y nombres inválidos', () => {
    expect(() => noteFromMidi(60.5)).toThrow(RangeError)
    expect(() => midiFromNoteName('X' as never, 4)).toThrow(RangeError)
  })
})

describe('frecuencia <-> MIDI', () => {
  it('convierte frecuencias de notas conocidas', () => {
    expect(frequencyFromMidi(60)).toBeCloseTo(261.6255653005986, 6)
    expect(midiFromFrequency(261.6255653005986)).toBeCloseTo(60, 9)
  })

  it('cada octava dobla la frecuencia', () => {
    expect(frequencyFromMidi(72)).toBeCloseTo(frequencyFromMidi(60) * 2, 6)
    expect(frequencyFromMidi(60)).toBeCloseTo(frequencyFromMidi(48) * 2, 6)
  })

  it('midiFromFrequency rechaza valores no positivos o no finitos', () => {
    expect(() => midiFromFrequency(0)).toThrow(RangeError)
    expect(() => midiFromFrequency(-10)).toThrow(RangeError)
    expect(() => midiFromFrequency(Number.NaN)).toThrow(RangeError)
  })
})

describe('nearestNoteFromFrequency', () => {
  it('encuentra la nota exacta y 0 cents de desviación', () => {
    const result = nearestNoteFromFrequency(440)
    expect(result.midi).toBe(69)
    expect(result.cents).toBeCloseTo(0, 9)
  })

  it('mide la desviación en cents respecto a la nota más cercana', () => {
    // 10 cents por encima de La#4 (MIDI 70)
    const freq = frequencyFromMidi(70) * 2 ** (10 / 1200)
    const result = nearestNoteFromFrequency(freq)
    expect(result.midi).toBe(70)
    expect(result.cents).toBeCloseTo(10, 6)
  })

  it('redondea a la nota más cercana cuando la desviación es menor de medio tono', () => {
    // 10 cents por debajo de Do4 sigue siendo Do4
    const freq = frequencyFromMidi(60) * 2 ** (-10 / 1200)
    const result = nearestNoteFromFrequency(freq)
    expect(result.midi).toBe(60)
    expect(result.cents).toBeCloseTo(-10, 6)
  })
})

describe('isWithinTolerance', () => {
  it('acepta desviaciones dentro del rango por defecto (±50 cents)', () => {
    expect(isWithinTolerance(0)).toBe(true)
    expect(isWithinTolerance(30)).toBe(true)
    expect(isWithinTolerance(-49)).toBe(true)
    expect(isWithinTolerance(51)).toBe(false)
    expect(isWithinTolerance(-50.1)).toBe(false)
  })

  it('respeta una tolerancia personalizada', () => {
    expect(isWithinTolerance(20, 15)).toBe(false)
    expect(isWithinTolerance(15, 15)).toBe(true)
  })
})
