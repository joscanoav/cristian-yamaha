import { describe, expect, it } from 'vitest'
import {
  createLessonState,
  FIRST_LESSON,
  lessonProgress,
  noteReleased,
  processDetectedNote,
  resetLesson,
} from './lessons'

describe('createLessonState', () => {
  it('inicia en la primera nota con estado activo', () => {
    const state = createLessonState(FIRST_LESSON)
    expect(state.currentIndex).toBe(0)
    expect(state.status).toBe('active')
    expect(state.correctCount).toBe(0)
    expect(state.target.label).toBe('Do4')
    expect(state.releasedSinceLastHit).toBe(true)
  })

  it('rechaza lecciones sin notas', () => {
    expect(() => createLessonState({ id: 'x', title: 'x', notes: [] })).toThrow()
  })
})

describe('processDetectedNote', () => {
  it('avanza al acertar la nota objetivo', () => {
    let state = createLessonState(FIRST_LESSON)
    const result = processDetectedNote(state, 60) // Do4
    state = result.state
    expect(result.feedback.type).toBe('correct')
    expect(state.currentIndex).toBe(1)
    expect(state.correctCount).toBe(1)
    expect(state.target.label).toBe('Re4')
  })

  it('informa de error sin avanzar ante una nota incorrecta', () => {
    const state = createLessonState(FIRST_LESSON)
    const result = processDetectedNote(state, 64) // Mi4 cuando toca Do4
    expect(result.feedback.type).toBe('incorrect')
    if (result.feedback.type === 'incorrect') {
      expect(result.feedback.target.label).toBe('Do4')
      expect(result.feedback.detected.label).toBe('Mi4')
    }
    expect(result.state.currentIndex).toBe(0)
    expect(result.state.correctCount).toBe(0)
  })

  it('una nota sostenida tras un acierto no cuenta dos veces', () => {
    let state = createLessonState(FIRST_LESSON)
    state = processDetectedNote(state, 60).state // acierto Do4
    // Sigue sonando Do4 sin liberación: debe ignorarse
    const sustained = processDetectedNote(state, 60)
    expect(sustained.feedback.type).toBe('ignored-sustained')
    expect(sustained.state.currentIndex).toBe(1)
    expect(sustained.state.correctCount).toBe(1)
  })

  it('tras liberar, la siguiente detección correcta vuelve a contar', () => {
    let state = createLessonState(FIRST_LESSON)
    state = processDetectedNote(state, 60).state // acierto Do4
    state = noteReleased(state) // suelta la tecla
    const next = processDetectedNote(state, 62) // Re4
    expect(next.feedback.type).toBe('correct')
    expect(next.state.correctCount).toBe(2)
  })

  it('un error libera la nota para poder reintentar', () => {
    let state = createLessonState(FIRST_LESSON)
    const wrong = processDetectedNote(state, 64) // error
    state = wrong.state
    // Vuelve a sonar Do4 sin liberación explícita: cuenta como acierto
    const retry = processDetectedNote(state, 60)
    expect(retry.feedback.type).toBe('correct')
    expect(retry.state.currentIndex).toBe(1)
  })

  it('una nota equivocada sostenida no se repite infinitamente', () => {
    let state = createLessonState(FIRST_LESSON)
    state = processDetectedNote(state, 64).state // error con Mi4
    const sustained = processDetectedNote(state, 64)
    expect(sustained.feedback.type).toBe('ignored-sustained')
  })

  it('completa la lección al acertar las cinco notas', () => {
    let state = createLessonState(FIRST_LESSON)
    const sequence = [60, 62, 64, 65, 67]
    for (const midi of sequence.slice(0, -1)) {
      state = processDetectedNote(state, midi).state
      state = noteReleased(state)
    }
    const last = processDetectedNote(state, 67)
    expect(last.feedback.type).toBe('completed')
    if (last.feedback.type === 'completed') {
      expect(last.feedback.correctCount).toBe(5)
      expect(last.feedback.total).toBe(5)
    }
    expect(last.state.status).toBe('completed')
    expect(lessonProgress(last.state)).toBe(1)
  })

  it('ignora cualquier detección tras completar la lección', () => {
    let state = createLessonState(FIRST_LESSON)
    for (const midi of [60, 62, 64, 65, 67]) {
      state = processDetectedNote(state, midi).state
      state = noteReleased(state)
    }
    const after = processDetectedNote(state, 60)
    expect(after.feedback.type).toBe('ignored-sustained')
    expect(after.state.status).toBe('completed')
  })
})

describe('resetLesson y lessonProgress', () => {
  it('reinicia el progreso desde cero', () => {
    let state = createLessonState(FIRST_LESSON)
    state = processDetectedNote(state, 60).state
    state = resetLesson(state)
    expect(state.currentIndex).toBe(0)
    expect(state.correctCount).toBe(0)
    expect(state.status).toBe('active')
    expect(lessonProgress(state)).toBe(0)
  })

  it('refleja el progreso parcial', () => {
    let state = createLessonState(FIRST_LESSON)
    state = processDetectedNote(state, 60).state
    expect(lessonProgress(state)).toBeCloseTo(0.2, 9)
  })
})
