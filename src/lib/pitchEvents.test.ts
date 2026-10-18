import { describe, expect, it } from 'vitest'
import { createNoteEventTracker, type PitchFrame } from './pitchEvents'

function frame(rms: number, frequency: number | null, confidence: number | null): PitchFrame {
  return { rms, frequency, confidence }
}

/** Fotograma de una nota limpia a la frecuencia indicada. */
function tone(rms = 0.3, frequency = 440, confidence = 0.95): PitchFrame {
  return frame(rms, frequency, confidence)
}

describe('createNoteEventTracker', () => {
  it('emite un único evento de nota al iniciar un tono', () => {
    const tracker = createNoteEventTracker()
    expect(tracker.process(tone())).toEqual([{ type: 'note', midi: 69 }])
    // Los fotogramas siguientes de la misma nota no generan eventos
    expect(tracker.process(tone())).toEqual([])
    expect(tracker.process(tone())).toEqual([])
  })

  it('libera la nota tras el silencio sostenido', () => {
    const tracker = createNoteEventTracker()
    tracker.process(tone())
    const silence = frame(0, null, null)
    const results = [1, 2, 3, 4].map(() => tracker.process(silence))
    expect(results[0]).toEqual([])
    expect(results[3]).toEqual([{ type: 'release' }])
  })

  it('distingue una nota sostenida de una nueva pulsación de la misma nota', () => {
    const tracker = createNoteEventTracker()
    // Ataque
    expect(tracker.process(tone(0.3))).toEqual([{ type: 'note', midi: 69 }])
    tracker.process(tone(0.25))
    // Caída de volumen (cola del piano): libera
    const fall = tracker.process(tone(0.05))
    expect(fall).toEqual([{ type: 'release' }])
    // La cola sigue sonando por debajo del umbral de rearme: no ataca
    expect(tracker.process(tone(0.06))).toEqual([])
    expect(tracker.process(tone(0.08))).toEqual([])
    // Nuevo ataque fuerte de la misma nota: sí cuenta
    expect(tracker.process(tone(0.32))).toEqual([{ type: 'note', midi: 69 }])
  })

  it('sin caída de volumen, la nota sostenida no se repite', () => {
    const tracker = createNoteEventTracker()
    tracker.process(tone(0.3))
    for (let i = 0; i < 30; i++) {
      expect(tracker.process(tone(0.28))).toEqual([])
    }
  })

  it('ignora el sonido por debajo del umbral de confianza', () => {
    const tracker = createNoteEventTracker()
    expect(tracker.process(tone(0.3, 440, 0.4))).toEqual([])
    expect(tracker.process(tone(0.3, 440, 0.74))).toEqual([])
    expect(tracker.process(tone(0.3, 440, 0.8))).toEqual([{ type: 'note', midi: 69 }])
  })

  it('ignora el silencio y el ruido sin frecuencia', () => {
    const tracker = createNoteEventTracker()
    expect(tracker.process(frame(0, null, null))).toEqual([])
    expect(tracker.process(frame(0.2, null, null))).toEqual([])
    expect(tracker.process(frame(0.2, 0, 0.9))).toEqual([])
  })

  it('rechaza notas fuera de la tolerancia de ±30 cents', () => {
    const tracker = createNoteEventTracker()
    // 45 cents por encima de La4
    const detuned = 440 * 2 ** (45 / 1200)
    expect(tracker.process(tone(0.3, detuned))).toEqual([])
    // 25 cents: dentro de tolerancia
    const inTune = 440 * 2 ** (25 / 1200)
    expect(tracker.process(tone(0.3, inTune))).toEqual([{ type: 'note', midi: 69 }])
  })

  it('detecta el cambio directo a otra nota como nuevo ataque', () => {
    const tracker = createNoteEventTracker()
    tracker.process(tone(0.3, 440))
    // Cambio inmediato de pitch (Do4 = 261,63 Hz)
    expect(tracker.process(tone(0.3, 261.6255653005986))).toEqual([
      { type: 'note', midi: 60 },
    ])
  })

  it('la nota cambia al detectar la frecuencia correcta de cada fotograma', () => {
    const tracker = createNoteEventTracker()
    expect(tracker.process(tone(0.3, 261.6255653005986))[0]).toMatchObject({ midi: 60 })
    tracker.process(frame(0, null, null))
    tracker.process(frame(0, null, null))
    tracker.process(frame(0, null, null))
    tracker.process(frame(0, null, null)) // libera
    expect(tracker.process(tone(0.3, 329.6275569128699))[0]).toMatchObject({ midi: 64 })
  })

  it('reset devuelve al estado inicial', () => {
    const tracker = createNoteEventTracker()
    tracker.process(tone())
    tracker.reset()
    expect(tracker.process(tone())).toEqual([{ type: 'note', midi: 69 }])
  })
})
