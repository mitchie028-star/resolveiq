export type EngineResult<T = unknown> = {
  ok: boolean
  processed: number
  errors: number
  data?: T
  error?: string | null
}