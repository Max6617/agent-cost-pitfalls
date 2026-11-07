/**
 * HTTP client plans.
 *
 * The worker's outbound calls all go through here so that headers are
 * normalised and the base URL is applied in one place. The timeout comes
 * from the policy, like every other client's.
 */
import { normalizeHeaders } from './util/headers.js'

export function createHttpClient({ policy, baseUrl = 'http://internal' } = {}) {
  return {
    /**
     * The request plan handed to the transport: where it goes and how long it
     * may take. `timeout` is the caller's request in milliseconds.
     */
    fetch(path, { method = 'GET', timeout, headers = {} } = {}) {
      return {
        url: baseUrl.replace(/\/$/, '') + path,
        method,
        headers: normalizeHeaders(headers),
        timeoutMs: policy.resolve('http.fetch', timeout),
      }
    },
  }
}
