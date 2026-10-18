import { describe, expect, it } from 'vitest'
import { frequencyFromMidi } from './notes'
import {
  createPitchStabilizer,
  DEFAULT_STABILIZER_OPTIONS,
  type StabilizerInput,
} from './pitchStabilizer'

const DO4 = 60
const RE4 = 62

/** Frecuencia de la nota desviada la cantidad de cents indicada. */
function detuned(midi: number, cents: number): number {
  return frequencyFromMidi(midi) * 2 ** (cents / 1200)
}

function frame(midi: number, cents = 0): StabilizerInput {
  return { rms: 0.2, frequency: detuned(midi, cents), confidence: 0.9 }
}

function silence(): StabilizerInput {
  return { rms: 0, frequency: null, confidence: null }
}

describe('createPitchStabilizer', () => {
  it('pasa un fotograma sin pitch con la racha a cero', () => {
    const stabilizer = createPitchStabilizer()
    const out = stabilizer.process(silence())
    expect(out.frequency).toBeNull()
    expect(out.stableFrequency).toBeNull()
    expect(out.consecutiveFragments).toBe(0)
  })

  it('trata la confianza nula como ausencia de pitch', () => {
    const stabilizer = createPitchStabilizer()
    const out = stabilizer.process({
      rms: 0.3,
      frequency: detuned(DO4, 0),
      confidence: null,
    })
    expect(out.stableFrequency).toBeNull()
    expect(out.consecutiveFragments).toBe(0)
  })

  it('descarta el fragmento del ataque y no confirma antes de tiempo', () => {
    const stabilizer = createPitchStabilizer()
    for (let i = 1; i <= 3; i++) {
      const out = stabilizer.process(frame(DO4))
      expect(out.consecutiveFragments).toBe(i)
      expect(out.stableFrequency).toBeNull()
    }
  })

  it('confirma en el cuarto fragmento con la mediana de las estimaciones fiables', () => {
    const stabilizer = createPitchStabilizer()
    stabilizer.process(frame(DO4, -20))
    stabilizer.process(frame(DO4, -5))
    stabilizer.process(frame(DO4, 0))
    const out = stabilizer.process(frame(DO4, 10))
    expect(out.consecutiveFragments).toBe(4)
    // Mediana de [-5, 0, +10] cents = 0 cents = frecuencia exacta de Do4.
    expect(out.stableFrequency).toBeCloseTo(frequencyFromMidi(DO4), 6)
  })

  it('usa la media de las dos estimaciones centrales con número par', () => {
    const stabilizer = createPitchStabilizer({
      requiredFragments: 3,
      warmupFragments: 1,
    })
    stabilizer.process(frame(DO4, -50))
    stabilizer.process(frame(DO4, -10))
    const out = stabilizer.process(frame(DO4, 10))
    expect(out.stableFrequency).toBeCloseTo(
      (detuned(DO4, -10) + detuned(DO4, 10)) / 2,
      6,
    )
  })

  it('reinicia la racha al cambiar de nota', () => {
    const stabilizer = createPitchStabilizer()
    stabilizer.process(frame(DO4))
    stabilizer.process(frame(DO4))
    let out = stabilizer.process(frame(RE4))
    expect(out.consecutiveFragments).toBe(1)
    expect(out.stableFrequency).toBeNull()
    stabilizer.process(frame(RE4))
    stabilizer.process(frame(RE4))
    out = stabilizer.process(frame(RE4))
    expect(out.consecutiveFragments).toBe(4)
    expect(out.stableFrequency).toBeCloseTo(frequencyFromMidi(RE4), 6)
  })

  it('reinicia la racha al perder el pitch', () => {
    const stabilizer = createPitchStabilizer()
    stabilizer.process(frame(DO4))
    stabilizer.process(frame(DO4))
    let out = stabilizer.process(silence())
    expect(out.consecutiveFragments).toBe(0)
    out = stabilizer.process(frame(DO4))
    expect(out.consecutiveFragments).toBe(1)
    expect(out.stableFrequency).toBeNull()
  })

  it('mantiene la confirmación con una mediana deslizante en nota sostenida', () => {
    const stabilizer = createPitchStabilizer()
    stabilizer.process(frame(DO4, 0))
    stabilizer.process(frame(DO4, 4))
    stabilizer.process(frame(DO4, 2))
    stabilizer.process(frame(DO4, 0))
    const out = stabilizer.process(frame(DO4, -2))
    expect(out.consecutiveFragments).toBe(5)
    // Ventana con las 4 estimaciones más recientes: [4, 2, 0, -2] cents.
    expect(out.stableFrequency).toBeCloseTo(
      (detuned(DO4, 0) + detuned(DO4, 2)) / 2,
      6,
    )
  })

  it('permite una configuración sin warmup', () => {
    const stabilizer = createPitchStabilizer({
      requiredFragments: 3,
      warmupFragments: 0,
    })
    stabilizer.process(frame(DO4, -10))
    stabilizer.process(frame(DO4, 0))
    const out = stabilizer.process(frame(DO4, 10))
    expect(out.stableFrequency).toBeCloseTo(frequencyFromMidi(DO4), 6)
  })

  it('expone una configuración por defecto dentro del rango pedido (3–5)', () => {
    expect(DEFAULT_STABILIZER_OPTIONS.requiredFragments).toBeGreaterThanOrEqual(3)
    expect(DEFAULT_STABILIZER_OPTIONS.requiredFragments).toBeLessThanOrEqual(5)
  })

  it('reset() borra la racha acumulada', () => {
    const stabilizer = createPitchStabilizer()
    for (let i = 0; i < 4; i++) stabilizer.process(frame(DO4))
    stabilizer.reset()
    const out = stabilizer.process(frame(DO4))
    expect(out.consecutiveFragments).toBe(1)
    expect(out.stableFrequency).toBeNull()
  })
})
