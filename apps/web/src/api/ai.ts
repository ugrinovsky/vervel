import { privateApi } from './http/privateApi'

export interface AiSetData {
  reps?: number
  weight?: number
  time?: number
}

export interface AiExercise {
  name: string
  /** Название на русском для отображения */
  displayName?: string
  sets: number
  reps?: number
  weight?: number
  duration?: number
  setData?: AiSetData[]
  notes?: string
  /** Реальный ID из каталога упражнений (если AI-имя удалось смэтчить) */
  exerciseId?: string
  /** Метка суперсета — упражнения с одинаковой меткой объединяются (напр. "A") */
  supersetGroup?: string
  /** Зоны мышц от AI (используются для аналитики, если упражнение не в каталоге) */
  zones?: string[]
  /** Доли нагрузки по зонам (сумма 1), от AI */
  zoneWeights?: Record<string, number>
}

export interface AiWorkoutResult {
  workoutType: 'crossfit' | 'bodybuilding' | 'cardio'
  exercises: AiExercise[]
  notes?: string
}

export interface AiRecognizedWorkoutResult {
  workoutType: null
  exercises: AiExercise[]
  notes?: string
}

/** Превью-строка в ответах parse-workout-notes / parse-notes-text */
export type AiParsedWorkoutPreviewItem = {
  exerciseId: string
  name: string
  zones?: string[] | null
  sets: number
  reps?: number
  weight?: number
  weightMax?: number
}

/** Упражнение в том же ответе и в теле apply-parsed-workout */
export type AiParsedWorkoutExercisePayload = {
  exerciseId: string
  name?: string
  zones?: string[]
  zoneWeights?: Record<string, number>
  bodyweight?: boolean
  type: string
  duration?: number
  rounds?: number
  wodType?: 'amrap' | 'emom' | 'fortime' | 'tabata'
  sets?: Array<{ id: string; reps?: number; weight?: number; time?: number }>
  blockId?: string
}

export type AiParseWorkoutNotesResponse = {
  workoutType: 'crossfit' | 'bodybuilding' | 'cardio'
  previewItems: AiParsedWorkoutPreviewItem[]
  exercises: AiParsedWorkoutExercisePayload[]
  warning: string | null
  balance: number
}

export type AiParseNotesTextResponse = {
  workoutType: null
  previewItems: AiParsedWorkoutPreviewItem[]
  exercises: AiParsedWorkoutExercisePayload[]
  warning: string | null
  balance: number
}

/** То, что уходит в форму после parse-notes-text (без balance / workoutType с ответа). */
export type AiTextParseUiPayload = {
  sourceText: string
  previewItems: AiParsedWorkoutPreviewItem[]
  exercises: AiParsedWorkoutExercisePayload[]
  warning: string | null
}

/** Сообщение ИИ-чата (как в GET /chats/:id/messages, таблица messages) */
export interface AiChatApiMessage {
  id: number
  content: string
  senderId: number | null
  sender: { id: number; fullName: string | null; email: string } | null
  createdAt: string
  aiGenerated: boolean
  aiCharge: number | null
}

export interface AiBalance {
  balance: number
  costs: {
    generate: number
    recognize: number
    parseNotes: number
    suggestStandardLinks: number
    chatMinCharge: number
  }
  transactions: Array<{
    id: number
    amount: number
    balanceAfter: number
    type: string
    description: string
    createdAt: string
  }>
}

export const aiApi = {
  /** Проверить, включена ли AI-функция */
  status: () => privateApi.get<{ enabled: boolean }>('/ai/status'),

  /** Текущий баланс кошелька и последние транзакции */
  getBalance: () => privateApi.get<AiBalance>('/ai/balance'),

  /** Постраничная история транзакций */
  getTransactions: (offset: number, limit: number) =>
    privateApi.get<{ success: boolean; data: AiBalance['transactions'] }>('/ai/transactions', {
      params: { offset, limit },
    }),

  /**
   * Распознать тренировку с фото (атлет).
   * imageBase64 — строка base64 без префикса data:...
   */
  recognizeWorkout: (imageBase64: string, mimeType: string) =>
    privateApi.post<{ data: AiRecognizedWorkoutResult }>('/ai/recognize-workout', {
      imageBase64,
      mimeType,
    }),

  /**
   * Сгенерировать тренировку из текста (тренер).
   * prompt — произвольное описание, напр. "грудь плечи 45 мин средний уровень"
   */
  generateWorkout: (prompt: string) =>
    privateApi.post<{ data: AiWorkoutResult }>('/ai/generate-workout', { prompt }),

  /** История ИИ-чата из БД (та же модель, что и обычные диалоги). */
  getChatMessages: (params?: { limit?: number; before_id?: number }) =>
    privateApi.get<{ success: boolean; data: AiChatApiMessage[] }>('/ai/chat/messages', {
      params,
    }),

  clearChatMessages: () => privateApi.delete<{ success: boolean }>('/ai/chat/messages'),

  /**
   * AI-чат — текст сообщения; история и ответ сохраняются на сервере.
   */
  chat: (content: string) =>
    privateApi.post<{ reply: string; balance: number; cost: number }>('/ai/chat', { content }),

  /**
   * Парсит заметки тренировки через AI и возвращает превью — НЕ сохраняет.
   * Возвращает previewItems для отображения, exercises для передачи в applyParsedWorkout.
   */
  parseWorkoutNotes: (workoutId: number) =>
    privateApi.post<AiParseWorkoutNotesResponse>('/ai/parse-workout-notes', { workoutId }),

  /**
   * Парсит произвольный текст (без workoutId) — для формы создания тренировки.
   */
  parseNotesText: (notes: string) =>
    privateApi.post<AiParseNotesTextResponse>('/ai/parse-notes-text', { notes }),

  /**
   * Сохраняет упражнения после подтверждения превью (без повторного списания баланса).
   */
  applyParsedWorkout: (
    workoutId: number,
    workoutType: 'crossfit' | 'bodybuilding' | 'cardio',
    exercises: AiParsedWorkoutExercisePayload[]
  ) =>
    privateApi.post<{ data: unknown }>('/ai/apply-parsed-workout', { workoutId, workoutType, exercises }),
}
