/**
 * Retrying an operation.
 *
 * Each attempt is its own span, opened from the span that asked for the retry
 * loop, and each failure inside it stays inside it. A trace that shows one span
 * for three attempts cannot answer the only questions anybody asks about a
 * retry: which attempt was slow, and which one failed.
 */
import { childSpan, runInSpan } from './tracing.js'

export const DEFAULT_ATTEMPTS = 3

/**
 * `operation(attempt)` is awaited up to `attempts` times. `shouldRetry(err,
 * attempt)` decides whether another attempt is worth making; an error it rejects
 * is rethrown as-is.
 */
export async function withRetry(
  operation,
  { attempts = DEFAULT_ATTEMPTS, shouldRetry = () => false, events, idGen = undefined } = {},
) {
  if (typeof operation !== 'function') throw new TypeError('withRetry needs an operation')
  if (!Number.isInteger(attempts) || attempts < 1) throw new TypeError('attempts must be a positive integer')

  const failures = []
  let attempt = 0
  while (attempt < attempts) {
    attempt += 1
    // One span per attempt, opened from the span the loop was entered in.
    const span = childSpan({ idGen })
    try {
      return await runInSpan(span, async () => {
        events?.emit({ name: 'retry.attempt', meta: { attempt } })
        return operation(attempt)
      })
    } catch (err) {
      failures.push(err)
      if (attempt >= attempts || !shouldRetry(err, attempt)) throw err
      events?.emit({ name: 'retry.scheduled', meta: { attempt, code: err?.code ?? 'error' } })
    }
  }
  /* c8 ignore next */
  throw failures[failures.length - 1]
}

/** The `withRetry` every outbound call gets, so each attempt is its own span. */
export function retryingSend(client, request, options = {}) {
  return withRetry((attempt) => client.send({ ...request, attempt }), {
    ...options,
    attempts: options.attempts ?? DEFAULT_ATTEMPTS,
  })
}
