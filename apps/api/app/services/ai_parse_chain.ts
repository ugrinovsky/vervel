/** Сквозной контекст для логов цепочки: парсинг → зоны → (матчинг) → ответ. */
export type AiParseChainCtx = {
  traceId: string
  userId?: number
  /** Имя HTTP-ручки / сценария */
  route: string
}
