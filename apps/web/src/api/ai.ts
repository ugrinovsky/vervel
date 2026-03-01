import { privateApi } from './http/privateApi'

export interface AiExercise {
  name: string
  /** Название на русском для отображения */
  displayName?: string
  sets: number
  reps?: number
  weight?: number
  duration?: number
  notes?: string
  /** Реальный ID из каталога упражнений (если AI-имя удалось смэтчить) */
  exerciseId?: string
}

export interface AiWorkoutResult {
  workoutType: 'crossfit' | 'bodybuilding' | 'cardio'
  exercises: AiExercise[]
  notes?: string
}

export interface AiBalance {
  balance: number
  costs: { generate: number; recognize: number; chat: number }
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

  /**
   * Распознать тренировку с фото (атлет).
   * imageBase64 — строка base64 без префикса data:...
   */
  recognizeWorkout: (imageBase64: string, mimeType: string) =>
    privateApi.post<{ data: AiWorkoutResult }>('/ai/recognize-workout', {
      imageBase64,
      mimeType,
    }),

  /**
   * Сгенерировать тренировку из текста (тренер).
   * prompt — произвольное описание, напр. "грудь плечи 45 мин средний уровень"
   */
  generateWorkout: (prompt: string) =>
    privateApi.post<{ data: AiWorkoutResult }>('/ai/generate-workout', { prompt }),

  /**
   * AI-чат — фитнес-советник.
   * Принимает историю диалога и возвращает ответ ассистента.
   */
  chat: (messages: Array<{ role: 'user' | 'assistant'; content: string }>) =>
    privateApi.post<{ reply: string; balance: number }>('/ai/chat', { messages }),
}
