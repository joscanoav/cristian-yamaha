import { describe, expect, it } from 'vitest'
import { yinDetect } from './yin'

const SAMPLE_RATE = 44100

function sineBuffer(frequency: number, length: number, sampleRate = SAMPLE_RATE): Float32Array {
  const buffer = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    buffer[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate)
  }
  return buffer
}

describe('yinDetect', () => {
  it('detecta La4 (440 Hz) en una sinusoida limpia', () => {
    const result = yinDetect(sineBuffer(440, 4096), SAMPLE_RATE)
    expect(result).not.toBeNull()
    expect(result!.frequency).toBeCloseTo(440, 0)
    expect(result!.confidence).toBeGreaterThan(0.9)
  })

  it('detecta Do4 (261,63 Hz) en una sinusoida limpia', () => {
    const result = yinDetect(sineBuffer(261.6255653005986, 4096), SAMPLE_RATE)
    expect(result).not.toBeNull()
    expect(result!.frequency).toBeCloseTo(261.63, 1)
    expect(result!.confidence).toBeGreaterThan(0.9)
  })

  it('detecta notas graves del piano con buffer suficientemente largo', () => {
    const result = yinDetect(sineBuffer(130.81, 8192), SAMPLE_RATE)
    expect(result).not.toBeNull()
    expect(result!.frequency).toBeCloseTo(130.81, 1)
  })

  it('devuelve null con silencio', () => {
    expect(yinDetect(new Float32Array(4096), SAMPLE_RATE)).toBeNull()
  })

  it('devuelve null con argumentos inválidos', () => {
    expect(yinDetect(sineBuffer(440, 4), SAMPLE_RATE)).toBeNull()
    expect(yinDetect(sineBuffer(440, 4096), 0)).toBeNull()
  })

  it('una sinusoida con ruido moderado sigue detectando la frecuencia', () => {
    const buffer = sineBuffer(440, 4096)
    // Ruido determinista pequeño (no aleatorio para que el test sea estable)
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] += 0.05 * Math.sin(i * 12.9898)
    }
    const result = yinDetect(buffer, SAMPLE_RATE)
    expect(result).not.toBeNull()
    expect(result!.frequency).toBeCloseTo(440, -1)
  })
})
