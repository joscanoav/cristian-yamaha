import { useCallback, useEffect, useRef, useState } from 'react'
import { MicrophonePanel } from './components/MicrophonePanel'
import { PianoKeyboard } from './components/PianoKeyboard'
import { Staff } from './components/Staff'
import { playNote } from './lib/audio'
import {
  createLessonState,
  LESSONS,
  lessonProgress,
  noteReleased,
  processDetectedNote,
  resetLesson,
  type Lesson,
  type LessonFeedback,
  type LessonState,
} from './lib/lessons'
import type { NoteEvent } from './lib/pitchEvents'

type Message = {
  kind: 'success' | 'error' | 'info' | 'complete'
  text: string
}

/** Nota incorrecta de ejemplo para el modo demostración (Mi4 si no es la objetivo, si no Re4). */
function wrongNoteFor(targetMidi: number): number {
  return targetMidi === 64 ? 62 : 64
}

function messageForFeedback(
  feedback: LessonFeedback,
  nextState: LessonState,
): Message | null {
  switch (feedback.type) {
    case 'correct':
      return {
        kind: 'success',
        text: `¡Correcto! ${feedback.target.label} bien tocada. Ahora toca ${nextState.target.label}.`,
      }
    case 'incorrect':
      return {
        kind: 'error',
        text: `Casi. Suena ${feedback.detected.label}, pero toca ${feedback.target.label}.`,
      }
    case 'completed':
      return {
        kind: 'complete',
        text: `¡Lección completada! Has tocado las ${feedback.total} notas correctamente.`,
      }
    case 'ignored-sustained':
      return null
  }
}

function App() {
  const [lessonState, setLessonState] = useState<LessonState>(() =>
    createLessonState(LESSONS[0]),
  )
  const [message, setMessage] = useState<Message | null>({
    kind: 'info',
    text: 'Toca Do4 en el piano. Puedes escucharla o usar el modo demostración.',
  })
  const [detectedMidi, setDetectedMidi] = useState<number | null>(null)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (highlightTimer.current !== null) clearTimeout(highlightTimer.current)
    }
  }, [])

  const flashDetected = useCallback((midi: number) => {
    setDetectedMidi(midi)
    if (highlightTimer.current !== null) clearTimeout(highlightTimer.current)
    highlightTimer.current = setTimeout(() => setDetectedMidi(null), 900)
  }, [])

  const applyDetection = useCallback(
    (midi: number) => {
      // Los handlers de eventos ven el estado actual fresco; el estado se
      // reemplaza en bloque (sin updater) para no mezclar efectos secundarios.
      const { state: next, feedback } = processDetectedNote(lessonState, midi)
      const released = noteReleased(next)
      setLessonState(released)
      const msg = messageForFeedback(feedback, released)
      if (msg !== null) setMessage(msg)
    },
    [lessonState],
  )

  const simulateCorrect = useCallback(() => {
    const midi = lessonState.target.midi
    playNote(midi, 0.9)
    flashDetected(midi)
    applyDetection(midi)
  }, [applyDetection, flashDetected, lessonState.target.midi])

  const simulateWrong = useCallback(() => {
    const midi = wrongNoteFor(lessonState.target.midi)
    playNote(midi, 0.9)
    flashDetected(midi)
    applyDetection(midi)
  }, [applyDetection, flashDetected, lessonState.target.midi])

  const playReference = useCallback(() => {
    playNote(lessonState.target.midi)
    setMessage({
      kind: 'info',
      text: `Esta es la nota ${lessonState.target.label}. Escúchala y repítela en el piano.`,
    })
  }, [lessonState.target.midi, lessonState.target.label])

  const repeatInstruction = useCallback(() => {
    playNote(lessonState.target.midi, 0.9)
    setMessage({
      kind: 'info',
      text: `Instrucción: toca la nota ${lessonState.target.label} resaltada en el pentagrama y en el teclado.`,
    })
  }, [lessonState.target.midi, lessonState.target.label])

  const restart = useCallback(() => {
    setLessonState((current) => resetLesson(current))
    setMessage({ kind: 'info', text: 'Lección reiniciada. Toca Do4 para empezar.' })
  }, [])

  const handleKeyClick = useCallback((midi: number) => {
    playNote(midi, 0.9)
  }, [])

  // Eventos reales del micrófono: el ataque alimenta la lección y la
  // liberación (caída de volumen/silencio) la prepara para la siguiente.
  const handleMicEvent = useCallback(
    (event: NoteEvent) => {
      if (event.type === 'note') {
        flashDetected(event.midi)
        applyDetection(event.midi)
      } else {
        setLessonState((current) => noteReleased(current))
      }
    },
    [applyDetection, flashDetected],
  )

  const selectLesson = useCallback((lesson: Lesson) => {
    setLessonState(createLessonState(lesson))
    setMessage({
      kind: 'info',
      text: `${lesson.title}: toca la primera nota para empezar.`,
    })
  }, [])

  const completed = lessonState.status === 'completed'
  const progress = lessonProgress(lessonState)
  const progressCount = lessonState.correctCount
  const total = lessonState.lesson.notes.length

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-mark" aria-hidden="true">
            <span className="logo-key logo-key-white" />
            <span className="logo-key logo-key-black" />
          </span>
          <h1>
            Cristian <span className="logo-accent">Yamaha</span>
          </h1>
        </div>
        <p className="tagline">Aprende a tocar el piano paso a paso</p>
      </header>

      <main className="app-main">
        <section className="card lesson-picker" aria-labelledby="lessons-title">
          <h2 id="lessons-title">Elige una lección</h2>
          <div className="lesson-picker-actions">
            {LESSONS.map((lesson) => (
              <button
                key={lesson.id}
                type="button"
                className={`btn ${lesson.id === lessonState.lesson.id ? 'btn-primary' : 'btn-secondary'}`}
                aria-pressed={lesson.id === lessonState.lesson.id}
                onClick={() => selectLesson(lesson)}
              >
                {lesson.title}
              </button>
            ))}
          </div>
        </section>

        <section className="card lesson-card" aria-labelledby="lesson-title">
          <div className="lesson-header">
            <h2 id="lesson-title">{lessonState.lesson.title}</h2>
            <div className="progress" role="progressbar" aria-valuenow={progressCount} aria-valuemin={0} aria-valuemax={total}>
              <span className="progress-text">
                Nota {Math.min(progressCount + (completed ? 0 : 1), total)} de {total}
              </span>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="lesson-body">
            <div className="staff-area">
              <Staff midi={completed ? lessonState.lesson.notes[total - 1].midi : lessonState.target.midi} />
            </div>

            <div className="target-area">
              {!completed ? (
                <>
                  <p className="target-caption">Nota a tocar</p>
                  <p className="target-note" aria-live="polite">
                    {lessonState.target.label}
                  </p>
                  <div className="target-actions">
                    <button type="button" className="btn btn-primary" onClick={playReference}>
                      Escuchar nota
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={repeatInstruction}>
                      Repetir instrucción
                    </button>
                  </div>
                </>
              ) : (
                <div className="completion">
                  <p className="completion-title">¡Lección completada!</p>
                  <p className="completion-text">
                    Has tocado las {total} notas correctamente. ¡Sigue practicando!
                  </p>
                  <button type="button" className="btn btn-primary" onClick={restart}>
                    Repetir lección
                  </button>
                </div>
              )}
            </div>
          </div>

          {message !== null && (
            <p className={`message message-${message.kind}`} role="status" aria-live="polite">
              {message.text}
            </p>
          )}
        </section>

        <MicrophonePanel onNoteEvent={handleMicEvent} />

        <section className="card demo-card" aria-labelledby="demo-title">
          <div className="demo-header">
            <h2 id="demo-title">
              Modo demostración <span className="badge-simulated">SIMULACIÓN</span>
            </h2>
          </div>
          <p className="demo-text">
            Las notas de estos botones se <strong>simulan</strong> y no provienen del
            micrófono. Úsalos para probar el flujo de la lección sin piano real.
          </p>
          <div className="demo-actions">
            <button
              type="button"
              className="btn btn-success"
              onClick={simulateCorrect}
              disabled={completed}
            >
              Simular nota correcta
            </button>
            <button
              type="button"
              className="btn btn-warning"
              onClick={simulateWrong}
              disabled={completed}
            >
              Simular nota incorrecta
            </button>
          </div>
        </section>

        <section className="card keyboard-card" aria-labelledby="keyboard-title">
          <h2 id="keyboard-title">Teclado (88 teclas, La0 – Do8)</h2>
          <p className="keyboard-hint">
            Desliza horizontalmente para recorrer el teclado. Pulsa una tecla para escucharla.
          </p>
          <PianoKeyboard
            targetMidi={completed ? null : lessonState.target.midi}
            detectedMidi={detectedMidi}
            onKeyClick={handleKeyClick}
          />
        </section>
      </main>

      <footer className="app-footer">
        <p>
          Cristian Yamaha — el sonido del micrófono se analiza localmente en tu
          dispositivo y no se envía a ningún servidor.
        </p>
      </footer>
    </div>
  )
}

export default App
