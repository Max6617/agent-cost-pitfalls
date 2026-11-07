import { UpstreamError } from './errors.js'
import { warn } from './util/log.js'

/**
 * The upstream call itself: one attempt, wrapped so that it cannot lie about
 * how many times it ran.
 *
 * `options.upstream` is injected: in production it is the fetch, in a test it is
 * a function the caller controls. Its contract is in docs/pipeline-policy.md
 * section 6 - it is called with an options object carrying `signal`, it must not
 * be started at all once the token is aborted, and a call that answers after the
 * caller gave up is discarded rather than returned.
 *
 * This sits between the retry and timeout wrappers on purpose: those two decide
 * whether another attempt happens, and the three of them share one rule - a
 * cancelled run does not start, keep or collect an upstream call.
 */
export async function callUpstream(token, options) {
  const { upstream, request } = options

  let result
  try {
    result = await upstream({ request, signal: token })
  } catch (err) {
    warn('upstream threw', err?.message)
    throw new UpstreamError(err)
  }

  return result
}
