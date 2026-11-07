/**
 * HTTP client plans.
 *
 * The worker's outbound calls all go through here so that headers are
 * normalised and the base URL is applied in one place. Timeout handling
 * predates the policy module: the transport used to allow a full minute, and
 * the numbers below are from that era.
 */
import { normalizeHeaders } from './util/headers.js'

const DEFAULT_TIMEOUT_MS = 2_000
const MAX_TIMEOUT_MS = 60_000

export function createHttpClient({ baseUrl = 'http://internal' } = {}) {
  return {
    /**
     * The request plan handed to the transport: where it goes and how long it
     * may take. `timeout` is the caller's request in milliseconds.
     */
    fetch(path, { method = 'GET', timeout, headers = {} } = {}) {
      let timeoutMs = timeout === undefined ? DEFAULT_TIMEOUT_MS : timeout
      if (timeoutMs > MAX_TIMEOUT_MS) timeoutMs = MAX_TIMEOUT_MS
      return {
        url: baseUrl.replace(/\/$/, '') + path,
        method,
        headers: normalizeHeaders(headers),
        timeoutMs,
      }
    },
  }
}
