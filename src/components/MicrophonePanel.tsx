import { useEffect, useRef, useState } from 'react'
import {
  ANALYSIS_INTERVAL_MS,
  type DetectedFrame,
  type MicError,
  type MicrophoneHandle,
} from '../lib/microphone'
import { MicrophoneStartError, startMicrophone } from '../lib/microphone'
import { isWithinTolerance, noteFromMidi } from '../lib/notes'
import type { NoteEvent } from '../lib/pitchEvents'
import { DEFAULT_STABILIZER_OPTIONS } from '../lib/pitchStabilizer'

/**
 * Panel de micrófono: botón de activar/desactivar con permiso explícito,
 * lecturas de frecuencia, nota estimada y confianza, y errores claros.
 * El audio se procesa localmente y se libera al detener o desmontar.
 */

const ERROR_MESSAGES: Record<MicError, string> = {
  'permission-denied':
    'Has denegado el permiso del micrófono. Concede el acceso en la configuración del navegador (icono de candado o cámara en la barra de direcciones) y vuelve a intentarlo.',
  'not-supported':
    'Tu navegador no admite la captura de micrófono. Prueba con Chrome, Edge o Firefox actualizados, y asegúrate de abrir la página mediante HTTPS.',
  'not-found': 'No se ha encontrado ningún micrófono conectado.',
  'in-use':
    'El micrófono está en uso por otra aplicación. Ciérrala e inténtalo de nuevo.',
  unknown:
    'No se pudo iniciar el micrófono. Comprueba los permisos del navegador e inténtalo otra vez.',
}

type MicState = 'off' | 'starting' | 'on' | 'error'

const REQUIRED_FRAGMENTS = DEFAULT_STABILIZER_OPTIONS.requiredFragments
const CONFIRMATION_MS = REQUIRED_FRAGMENTS * ANALYSIS_INTERVAL_MS

interface MicrophonePanelProps {
  /** Eventos de nota detectados (solo cuando el micrófono está activo). */
  onNoteEvent: (event: NoteEvent) => void
}

export function MicrophonePanel({ onNoteEvent }: MicrophonePanelProps) {
  const [state, setState] = useState<MicState>('off')
  const [error, setError] = useState<MicError | null>(null)
  const [frame, setFrame] = useState<DetectedFrame | null>(null)
  const [diagnostic, setDiagnostic] = useState(false)
  const handleRef = useRef<MicrophoneHandle | null>(null)
  // Ref con el callback actual para que el bucle de audio no quede con
  // un closure antiguo (sin reiniciar el micrófono en cada render).
  const onNoteEventRef = useRef(onNoteEvent)
  useEffect(() => {
    onNoteEventRef.current = onNoteEvent
  }, [onNoteEvent])

  // Liberar el micrófono al desmontar la pantalla.
  useEffect(() => {
    return () => {
      handleRef.current?.stop()
      handleRef.current = null
    }
  }, [])

  const stopMicrophone = () => {
    handleRef.current?.stop()
    handleRef.current = null
    setState('off')
    setFrame(null)
    setError(null)
  }

  const startMicrophoneFlow = async () => {
    setState('starting')
    setError(null)
    try {
      const handle = await startMicrophone({
        onFrame: (detected) => setFrame(detected),
        onEvent: (event) => onNoteEventRef.current(event),
      })
      handleRef.current = handle
      setState('on')
    } catch (err) {
      const kind =
        err instanceof MicrophoneStartError ? err.kind : 'unknown'
      setError(kind)
      setState('error')
    }
  }

  const toggle = () => {
    if (state === 'on' || state === 'starting') {
      stopMicrophone()
    } else {
      void startMicrophoneFlow()
    }
  }

  const buttonLabel =
    state === 'on'
      ? 'Desactivar micrófono'
      : state === 'starting'
        ? 'Solicitando permiso…'
        : 'Activar micrófono'

  const noteInfo =
    frame?.midi !== null && frame?.midi !== undefined
      ? noteFromMidi(frame.midi)
      : null
  const inTune =
    frame?.cents !== null && frame?.cents !== undefined && isWithinTolerance(frame.cents)

  return (
    <section className="card mic-card" aria-labelledby="mic-title">
      <div className="mic-header">
        <h2 id="mic-title">Micrófono</h2>
        <span
          className={`mic-state mic-state-${state}`}
          role="status"
          aria-live="polite"
        >
          {state === 'on'
            ? 'Escuchando'
            : state === 'starting'
              ? 'Solicitando permiso…'
              : state === 'error'
                ? 'Error'
                : 'Apagado'}
        </span>
      </div>

      <div className="mic-actions">
        <button
          type="button"
          className={`btn ${state === 'on' ? 'btn-danger' : 'btn-primary'}`}
          onClick={toggle}
          aria-pressed={state === 'on'}
        >
          {buttonLabel}
        </button>
        <button
          type="button"
          className={`btn btn-secondary${diagnostic ? ' mic-diagnostic-toggle-on' : ''}`}
          onClick={() => setDiagnostic((value) => !value)}
          aria-pressed={diagnostic}
        >
          Modo diagnóstico
        </button>
        <p className="mic-note">
          El audio se analiza en este dispositivo; no se graba ni se envía a
          ningún servidor.
        </p>
      </div>

      {state === 'on' && frame !== null && (
        <div className="mic-readings" aria-live="polite">
          <div className="mic-reading">
            <span className="mic-reading-label">Frecuencia</span>
            <span className="mic-reading-value">
              {frame.frequency !== null ? `${frame.frequency.toFixed(1)} Hz` : '—'}
            </span>
          </div>
          <div className="mic-reading">
            <span className="mic-reading-label">Nota estimada</span>
            <span className="mic-reading-value">
              {noteInfo !== null ? noteInfo.label : '—'}
              {frame.cents !== null && noteInfo !== null && (
                <span className={`mic-cents ${inTune ? '' : 'mic-cents-off'}`}>
                  {' '}
                  ({frame.cents >= 0 ? '+' : ''}
                  {frame.cents.toFixed(0)} cents)
                </span>
              )}
            </span>
          </div>
          <div className="mic-reading">
            <span className="mic-reading-label">Confianza</span>
            <span className="mic-reading-value">
              {frame.confidence !== null
                ? `${Math.round(frame.confidence * 100)} %`
                : '—'}
            </span>
          </div>
          <div className="mic-reading">
            <span className="mic-reading-label">Volumen</span>
            <span className="mic-reading-value">
              <span className="mic-meter" aria-hidden="true">
                <span
                  className="mic-meter-fill"
                  style={{ width: `${Math.min(100, frame.rms * 300)}%` }}
                />
              </span>
            </span>
          </div>
          {frame.cents !== null && noteInfo !== null && !inTune && (
            <p className="mic-tuning-warning">
              Afinación fuera de tolerancia (±30 cents): ajusta la nota.
            </p>
          )}
        </div>
      )}

      {diagnostic && (
        <div className="mic-diagnostic">
          {state === 'on' && frame !== null ? (
            <>
              <p className="mic-diagnostic-hint">
                Lecturas crudas del análisis. La lección solo acepta la nota
                cuando coinciden {REQUIRED_FRAGMENTS} fragmentos seguidos
                (unos {CONFIRMATION_MS} ms); la estimación cruda de abajo puede
                variar antes de confirmarse.
              </p>
              <div className="mic-diagnostic-grid">
                <div className="mic-reading">
                  <span className="mic-reading-label">RMS</span>
                  <span className="mic-reading-value">
                    {frame.rms.toFixed(4)}
                  </span>
                </div>
                <div className="mic-reading">
                  <span className="mic-reading-label">Fragmentos seguidos</span>
                  <span className="mic-reading-value">
                    {Math.min(frame.consecutiveFragments, REQUIRED_FRAGMENTS)}{' '}
                    / {REQUIRED_FRAGMENTS}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="mic-diagnostic-hint">
              Activa el micrófono para ver en tiempo real el RMS, la frecuencia
              estimada, la confianza, la nota estimada y los fragmentos
              consecutivos que coinciden.
            </p>
          )}
        </div>
      )}

      {state === 'error' && error !== null && (
        <p className="message message-error" role="alert">
          {ERROR_MESSAGES[error]}
        </p>
      )}
    </section>
  )
}
