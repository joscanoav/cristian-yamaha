/**
 * Estimación de la frecuencia fundamental con el algoritmo YIN
 * (de Cheveigné y Kawahara, 2002): diferencia, normalización por media
 * acumulada, umbral absoluto e interpolación parabólica.
 * Procesa muestras de audio en el propio navegador, sin grabar nada.
 */

export interface YinResult {
  /** Frecuencia fundamental estimada en Hz. */
  frequency: number
  /** Medida de periodicidad de 0 a 1 (1 = perfectamente periódico). */
  confidence: number
}

/**
 * Detecta la frecuencia fundamental en un buffer de muestras de tiempo.
 * Devuelve null si el buffer está en silencio o no hay periodicidad clara.
 */
export function yinDetect(
  buffer: Float32Array,
  sampleRate: number,
  threshold = 0.15,
): YinResult | null {
  if (sampleRate <= 0 || buffer.length < 4) return null

  let energy = 0
  for (let i = 0; i < buffer.length; i++) {
    energy += buffer[i] * buffer[i]
  }
  if (energy < 1e-8) return null

  const half = Math.floor(buffer.length / 2)

  // Función de diferencia
  const difference = new Float32Array(half)
  for (let tau = 0; tau < half; tau++) {
    let sum = 0
    for (let i = 0; i < half; i++) {
      const delta = buffer[i] - buffer[i + tau]
      sum += delta * delta
    }
    difference[tau] = sum
  }

  // Diferencia normalizada por la media acumulada (CMND)
  const normalized = new Float32Array(half)
  normalized[0] = 1
  let runningSum = 0
  for (let tau = 1; tau < half; tau++) {
    runningSum += difference[tau]
    normalized[tau] =
      runningSum > 1e-12 ? (difference[tau] * tau) / runningSum : 1
  }

  // Umbral absoluto: primer mínimo local por debajo del umbral
  let tauEstimate = -1
  for (let tau = 2; tau < half; tau++) {
    if (normalized[tau] < threshold) {
      while (tau + 1 < half && normalized[tau + 1] < normalized[tau]) tau++
      tauEstimate = tau
      break
    }
  }
  if (tauEstimate <= 0 || tauEstimate >= half - 1) return null

  // Interpolación parabólica para refinar el período entre muestras
  const betterTau = parabolicInterpolation(normalized, tauEstimate)
  const frequency = sampleRate / betterTau
  if (!Number.isFinite(frequency) || frequency <= 0) return null

  const confidence = Math.min(1, Math.max(0, 1 - normalized[tauEstimate]))
  return { frequency, confidence }
}

function parabolicInterpolation(values: Float32Array, tau: number): number {
  const a = values[tau - 1]
  const b = values[tau]
  const c = values[tau + 1]
  const denominator = a - 2 * b + c
  if (Math.abs(denominator) < 1e-12) return tau
  // Vértice de la parábola que pasa por (tau-1, a), (tau, b), (tau+1, c).
  return tau + (a - c) / (2 * denominator)
}
