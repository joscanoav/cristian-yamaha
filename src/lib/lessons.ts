/**
 * Lógica de lecciones independiente del audio y de la interfaz.
 * Una lección es una secuencia de notas objetivo; la lección avanza cuando
 * se acepta una detección correcta y se produce una liberación (la nota
 * deja de sonar) antes de aceptar la siguiente. Así una nota sostenida
 * no cuenta varias veces.
 */

import { type NoteInfo, noteFromMidi } from './notes'

export interface LessonNote {
  midi: number
}

export interface Lesson {
  id: string
  title: string
  notes: LessonNote[]
}

export type LessonStatus = 'idle' | 'active' | 'completed'

export interface LessonState {
  lesson: Lesson
  /** Índice de la nota objetivo actual. */
  currentIndex: number
  status: LessonStatus
  /** Número de aciertos válidos acumulados en esta ejecución. */
  correctCount: number
  /**
   * true cuando la última nota aceptada ya fue liberada y se puede
   * aceptar una nueva detección. Evita dobles avances por sostenido.
   */
  releasedSinceLastHit: boolean
  /** MIDI de la última detección aceptada (acierto o error), para detectar sostenidos. */
  lastAcceptedMidi: number | null
  /** Información de la nota objetivo actual, derivada de currentIndex. */
  target: NoteInfo
}

/** Crea el estado inicial de una lección. */
export function createLessonState(lesson: Lesson): LessonState {
  if (lesson.notes.length === 0) {
    throw new Error('La lección debe contener al menos una nota')
  }
  return {
    lesson,
    currentIndex: 0,
    status: 'active',
    correctCount: 0,
    releasedSinceLastHit: true,
    lastAcceptedMidi: null,
    target: noteFromMidi(lesson.notes[0].midi),
  }
}

export type LessonFeedback =
  | { type: 'correct'; target: NoteInfo }
  | { type: 'incorrect'; target: NoteInfo; detected: NoteInfo }
  | { type: 'ignored-sustained' }
  | { type: 'completed'; correctCount: number; total: number }

/**
 * Procesa una nota detectada (por micrófono, MIDI o simulada en el modo
 * demostración). Devuelve el nuevo estado y un mensaje de retroalimentación.
 */
export function processDetectedNote(
  state: LessonState,
  detectedMidi: number,
): { state: LessonState; feedback: LessonFeedback } {
  if (state.status === 'completed') {
    return { state, feedback: { type: 'ignored-sustained' } }
  }

  // Una nota sostenida tras una detección aceptada no vuelve a contar.
  if (!state.releasedSinceLastHit && detectedMidi === state.lastAcceptedMidi) {
    return { state, feedback: { type: 'ignored-sustained' } }
  }
  // Si suena otra nota distinta sin liberación explícita, se trata como
  // liberación implícita y se evalúa normalmente.

  const detected = noteFromMidi(detectedMidi)
  const target = state.target

  if (detectedMidi !== target.midi) {
    // El error queda registrado como última detección aceptada: si la misma
    // nota sigue sonando no se repetirá el mensaje, pero una nota distinta
    // se evalúa como liberación implícita.
    const next: LessonState = {
      ...state,
      releasedSinceLastHit: false,
      lastAcceptedMidi: detectedMidi,
    }
    return {
      state: next,
      feedback: { type: 'incorrect', target, detected },
    }
  }

  const isLast = state.currentIndex === state.lesson.notes.length - 1
  const correctCount = state.correctCount + 1
  const base = { ...state, releasedSinceLastHit: false, lastAcceptedMidi: detectedMidi }
  const next: LessonState = isLast
    ? { ...base, status: 'completed', correctCount }
    : {
        ...base,
        currentIndex: state.currentIndex + 1,
        correctCount,
        target: noteFromMidi(state.lesson.notes[state.currentIndex + 1].midi),
      }

  if (isLast) {
    return {
      state: next,
      feedback: {
        type: 'completed',
        correctCount,
        total: state.lesson.notes.length,
      },
    }
  }
  return { state: next, feedback: { type: 'correct', target } }
}

/**
 * Registra que la nota dejó de sonar (silencio o caída por debajo del
 * umbral de confianza). Habilita la aceptación de la siguiente detección.
 */
export function noteReleased(state: LessonState): LessonState {
  if (state.status === 'completed') return state
  return { ...state, releasedSinceLastHit: true }
}

/** Reinicia la lección desde la primera nota. */
export function resetLesson(state: LessonState): LessonState {
  return createLessonState(state.lesson)
}

/** Progreso de la lección para la interfaz (0 a 1). */
export function lessonProgress(state: LessonState): number {
  return state.correctCount / state.lesson.notes.length
}

/** Lección de demostración inicial: cinco notas en el centro del teclado. */
export const FIRST_LESSON: Lesson = {
  id: 'leccion-1',
  title: 'Lección 1: cinco notas',
  // Do4=60, Re4=62, Mi4=64, Fa4=65, Sol4=67 (convención Do4 = MIDI 60).
  notes: [
    { midi: 60 },
    { midi: 62 },
    { midi: 64 },
    { midi: 65 },
    { midi: 67 },
  ],
}

/**
 * Lección 2: frase principal del Himno de la Alegría (Beethoven),
 * transcrita a la tonalidad de Do mayor y usando solo notas de Do4 a Sol4:
 * Mi Mi Fa Sol | Sol Fa Mi Re | Do Do Re Mi | Mi Re Re.
 */
export const ODE_TO_JOY_LESSON: Lesson = {
  id: 'leccion-2',
  title: 'Lección 2: Himno de la Alegría',
  notes: [
    { midi: 64 }, { midi: 64 }, { midi: 65 }, { midi: 67 },
    { midi: 67 }, { midi: 65 }, { midi: 64 }, { midi: 62 },
    { midi: 60 }, { midi: 60 }, { midi: 62 }, { midi: 64 },
    { midi: 64 }, { midi: 62 }, { midi: 62 },
  ],
}

/** Todas las lecciones disponibles. */
export const LESSONS: Lesson[] = [FIRST_LESSON, ODE_TO_JOY_LESSON]
