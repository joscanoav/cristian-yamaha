import { useCallback, useEffect, useMemo, useRef } from 'react'
import { NOTE_NAMES_ES, PIANO_HIGH_MIDI, PIANO_LOW_MIDI } from '../lib/notes'

/**
 * Teclado virtual de 88 teclas (La0 = MIDI 21 hasta Do8 = MIDI 108).
 * Las teclas se posicionan a partir del recuento de teclas blancas: las
 * negras se centran sobre el límite entre dos blancas contiguas.
 * El contenedor permite el desplazamiento horizontal y hay botones para
 * centrar el Do4 o la nota objetivo.
 */

const WHITE_WIDTH = 48
const BLACK_WIDTH = 30
const KEYBOARD_HEIGHT = 180
const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]) // Do#, Re#, Fa#, Sol#, La#

export const KEYBOARD_WIDTH = 52 * WHITE_WIDTH // 52 teclas blancas

interface KeyLayout {
  midi: number
  x: number
  isBlack: boolean
  label: string
  octave: number
}

function buildLayout(): KeyLayout[] {
  const keys: KeyLayout[] = []
  let whiteCount = 0
  for (let midi = PIANO_LOW_MIDI; midi <= PIANO_HIGH_MIDI; midi++) {
    const pitchClass = midi % 12
    const isBlack = BLACK_PITCH_CLASSES.has(pitchClass)
    const octave = Math.floor(midi / 12) - 1
    const label = NOTE_NAMES_ES[pitchClass]
    if (isBlack) {
      keys.push({ midi, x: whiteCount * WHITE_WIDTH - BLACK_WIDTH / 2, isBlack: true, label, octave })
    } else {
      keys.push({ midi, x: whiteCount * WHITE_WIDTH, isBlack: false, label, octave })
      whiteCount++
    }
  }
  return keys
}

const LAYOUT = buildLayout()

function keyCenterX(midi: number): number {
  const key = LAYOUT.find((k) => k.midi === midi)
  if (!key) return 0
  return key.x + (key.isBlack ? BLACK_WIDTH / 2 : WHITE_WIDTH / 2)
}

interface PianoKeyboardProps {
  /** Número MIDI de la nota objetivo de la lección (resaltada). */
  targetMidi: number | null
  /** Número MIDI resaltado como detectado/simulado, si lo hay. */
  detectedMidi: number | null
  /** Se llama al pulsar una tecla (solo reproduce sonido). */
  onKeyClick?: (midi: number) => void
}

export function PianoKeyboard({ targetMidi, detectedMidi, onKeyClick }: PianoKeyboardProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const centerOn = useCallback((midi: number) => {
    const container = scrollRef.current
    if (!container) return
    const target = keyCenterX(midi) - container.clientWidth / 2
    container.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
  }, [])

  useEffect(() => {
    centerOn(60) // Do4 al cargar
  }, [centerOn])

  const keys = useMemo(() => LAYOUT, [])

  return (
    <div className="keyboard-controls">
      <div className="keyboard-actions">
        <button type="button" className="btn btn-secondary" onClick={() => centerOn(60)}>
          Centrar Do4
        </button>
        {targetMidi !== null && (
          <button type="button" className="btn btn-secondary" onClick={() => centerOn(targetMidi)}>
            Centrar nota objetivo
          </button>
        )}
      </div>
      <div className="keyboard-scroll" ref={scrollRef}>
        <div
          className="keyboard"
          style={{ width: KEYBOARD_WIDTH, height: KEYBOARD_HEIGHT }}
          role="group"
          aria-label="Teclado de piano de 88 teclas"
        >
          {keys.map((key) => {
            const isTarget = !key.isBlack && targetMidi === key.midi
            const isTargetBlack = key.isBlack && targetMidi === key.midi
            const isDetected = detectedMidi === key.midi
            const className = [
              'piano-key',
              key.isBlack ? 'key-black' : 'key-white',
              isTarget || isTargetBlack ? 'is-target' : '',
              isDetected ? 'is-detected' : '',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <button
                key={key.midi}
                type="button"
                className={className}
                style={{ left: key.x, width: key.isBlack ? BLACK_WIDTH : WHITE_WIDTH }}
                aria-label={`${key.label}${key.octave}`}
                onPointerDown={() => onKeyClick?.(key.midi)}
                tabIndex={-1}
              >
                {!key.isBlack && (
                  <span className="key-label">
                    {key.label}
                    {key.label === 'Do' && <span className="key-octave">{key.octave}</span>}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
