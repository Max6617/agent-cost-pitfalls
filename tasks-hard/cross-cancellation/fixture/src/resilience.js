import { TimeoutError } from './errors.js'

/**
 * Attempt bookkeeping: how many tries, how long between them, and when to stop.
 *
 * The wait between two attempts is a sleep like any other, which means it is
 * interruptible - docs/pipeline-policy.md section 7.2 - and the wait is part of
 * the request, not outside it.
 */
export async function withRetry(token, attempt, options = {}) {
  const retry = options.retry ?? {}
  const sleep = options.sleep ?? (() => Promise.resolve())

  let last
  for (let n = 1; n <= retry.maxAttempts; n += 1) {
    try {
      return await attempt()
    } catch (err) {
      last = err
      if (!retry.retryable(err)) throw err
      await sleep(retry.backoffMs)
    }
  }
  throw last
}

/**
 * A hard ceiling on one attempt. A sleep that is driven by the injected clock:
 * the wrapper measures the attempt against `clock()` and gives up with
 * TimeoutError once the budget is gone.
 *
 * The timeout is a *failure*, never an override: docs/pipeline-policy.md
 * section 3.2 says cancellation outranks it, so a run whose caller gave up while
 * the upstream was still thinking is a cancelled run, whatever the clock says.
 */
export async function withTimeout(token, attempt, options = {}) {
  const timeout = options.timeout ?? 1000
  const clock = options.clock ?? (() => 0)
  const sleep = options.sleep ?? (() => Promise.resolve())

  const started = clock()
  const work = attempt()
  const cancel = token.whenAborted().then(() => ({ cancelled: true }))
  const expiry = Promise.resolve(sleep(timeout)).then(() => ({ expired: true }))

  const first = await Promise.race([settled(work), settled(cancel), settled(expiry)])

  if (first.cancelled) return undefined

  // The clock is the authority on the budget, whether or not the sleep made it.
  if (clock() - started >= timeout) throw new TimeoutError(timeout)
  if (first.expired) throw new TimeoutError(timeout)
  if (first.error) throw first.error
  return first.value
}

/**
 * A promise that never rejects, so a losing side of the race cannot surface as
 * an unhandled rejection once nobody is listening to it any more.
 */
function settled(promise) {
  return Promise.resolve(promise).then(
    (value) => ({ value }),
    (error) => ({ error }),
  )
}
