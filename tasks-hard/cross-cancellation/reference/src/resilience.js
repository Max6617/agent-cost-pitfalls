import { TimeoutError, UpstreamError } from './errors.js'
import { isCancellation } from './tokens.js'
import { warn } from './util/log.js'

/**
 * One attempt against the upstream, wrapped so that it cannot lie about how
 * many times it ran.
 *
 * `options.upstream` is injected: in production it is the fetch, in a test it is
 * a function the caller controls. Its contract is in docs/pipeline-policy.md
 * section 6 - it is called with an options object carrying `signal`, it must not
 * be started at all once the token is aborted, and a call that answers after the
 * caller gave up is discarded rather than returned.
 */
export async function callUpstream(token, options) {
  const { upstream, request } = options

  token.rethrow()

  let result
  try {
    result = await upstream({ request, signal: token })
  } catch (err) {
    if (isCancellation(err)) {
      // The upstream saying "I gave up" is a cancellation, not a failure: it is
      // attributed to this stage and never wrapped and never retried.
      token.abort(err.reason ?? 'aborted')
      return undefined
    }
    warn('upstream threw', err?.message)
    throw new UpstreamError(err)
  }

  return result
}

/**
 * Attempt bookkeeping: how many tries, how long between them, and when to stop.
 *
 * The wait between two attempts is a sleep like any other, which means it is
 * interruptible - docs/pipeline-policy.md section 7.1 - and the wait is part of
 * the request, not outside it.
 */
export async function withRetry(token, attempt, options = {}) {
  const retry = options.retry ?? {}
  const sleep = options.sleep ?? (() => Promise.resolve())

  let last
  for (let n = 1; n <= retry.maxAttempts; n += 1) {
    token.rethrow()
    try {
      return await attempt()
    } catch (err) {
      last = err
      token.rethrow()
      if (!retry.retryable(err)) throw err
      await sleep(retry.backoffMs)
      token.rethrow()
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
 * section 7.2 says cancellation outranks it, so a run whose caller gave up while
 * the upstream was still thinking is a cancelled run, whatever the clock says.
 */
export async function withTimeout(token, attempt, options = {}) {
  const timeout = options.timeout ?? 1000
  const clock = options.clock ?? (() => 0)
  const sleep = options.sleep ?? (() => Promise.resolve())

  token.rethrow()

  const started = clock()
  const work = attempt()
  const cancel = token.whenAborted().then(() => ({ cancelled: true }))
  const expiry = Promise.resolve(sleep(timeout)).then(() => ({ expired: true }))

  const first = await Promise.race([settled(work), settled(cancel), settled(expiry)])

  // Cancellation first: the caller giving up ends the attempt regardless of how
  // long the upstream took, and the pipeline's checkpoint turns it into the
  // documented cancelled result.
  if (token.aborted || first.cancelled) return undefined

  if (first.error) {
    if (isCancellation(first.error)) {
      token.abort(first.error.reason ?? 'aborted')
      return undefined
    }
    throw first.error
  }

  if (first.expired || clock() - started >= timeout) throw new TimeoutError(timeout)

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
