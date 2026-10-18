/**
 * Captura de audio del micrófono en el navegador y análisis en tiempo real.
 * El audio nunca se graba ni se envía a ningún servidor: solo se procesa
 * localmente con YIN y la máquina de eventos de nota.
 */

import { nearestNoteFromFrequency } from './notes'
import {
  createNoteEventTracker,
  type NoteEvent,
} from './pitchEvents'
import { yinDetect } from './yin'

export type MicError =
  | 'permission-denied'
  | 'not-supported'
  | 'not-found'
  | 'in-use'
  | 'unknown'

export interface DetectedFrame {
  /** Frecuencia estimada en Hz, o null si no hay pitch. */
  frequency: number | null
  /** Nota más cercana (MIDI), o null. */
  midi: number | null
  /** Desviación en cents respecto a la nota estimada, o null. */
  cents: number | null
  /** Confianza de YIN (0 a 1), o null. */
  confidence: number | null
  /** Volumen RMS del fotograma. */
  rms: number
}

export interface MicrophoneCallbacks {
  onFrame: (frame: DetectedFrame) => void
  onEvent: (event: NoteEvent) => void
}

export interface MicrophoneHandle {
  /** Detiene el análisis y libera el micrófono y el contexto de audio. */
  stop: () => void
}

/** Error de inicio del micrófono con un código identificable. */
export class MicrophoneStartError extends Error {
  readonly kind: MicError

  constructor(kind: MicError) {
    super(kind)
    this.name = 'MicrophoneStartError'
    this.kind = kind
  }
}

const ANALYSIS_INTERVAL_MS = 80

export async function startMicrophone(
  callbacks: MicrophoneCallbacks,
): Promise<MicrophoneHandle> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new MicrophoneStartError('not-supported')
  }

  let stream: MediaStream
  try {
    // Procesamiento del navegador desactivado: para afinar interesa la
    // señal lo más "cruda" posible.
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })
  } catch (error) {
    throw new MicrophoneStartError(mapGetUserMediaError(error))
  }

  const AudioContextCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextCtor) {
    stopStream(stream)
    throw new MicrophoneStartError('not-supported')
  }

  const context = new AudioContextCtor()
  if (context.state === 'suspended') {
    await context.resume()
  }

  const source = context.createMediaStreamSource(stream)
  const analyser = context.createAnalyser()
  analyser.fftSize = 4096
  source.connect(analyser)

  const timeData = new Float32Array(analyser.fftSize)
  const tracker = createNoteEventTracker()
  let rafId = 0
  let lastAnalysis = 0
  let stopped = false

  const loop = (now: number): void => {
    if (stopped) return
    rafId = requestAnimationFrame(loop)
    analyser.getFloatTimeDomainData(timeData)
    if (now - lastAnalysis < ANALYSIS_INTERVAL_MS) return
    lastAnalysis = now

    let sum = 0
    for (let i = 0; i < timeData.length; i++) {
      sum += timeData[i] * timeData[i]
    }
    const rms = Math.sqrt(sum / timeData.length)

    const yin = rms > 0.001 ? yinDetect(timeData, context.sampleRate) : null
    let frequency: number | null = null
    let confidence: number | null = null
    let midi: number | null = null
    let cents: number | null = null
    if (yin !== null) {
      frequency = yin.frequency
      confidence = yin.confidence
      const nearest = nearestNoteFromFrequency(yin.frequency)
      midi = nearest.midi
      cents = nearest.cents
    }

    callbacks.onFrame({ frequency, midi, cents, confidence, rms })
    for (const event of tracker.process({ rms, frequency, confidence })) {
      callbacks.onEvent(event)
    }
  }
  rafId = requestAnimationFrame(loop)

  return {
    stop(): void {
      if (stopped) return
      stopped = true
      cancelAnimationFrame(rafId)
      source.disconnect()
      stopStream(stream)
      void context.close()
    },
  }
}

function stopStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    track.stop()
  }
}

function mapGetUserMediaError(error: unknown): MicError {
  const name = (error as { name?: string } | null)?.name
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'permission-denied'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'not-found'
    case 'NotReadableError':
    case 'TrackStartError':
      return 'in-use'
    default:
      return 'unknown'
  }
}
