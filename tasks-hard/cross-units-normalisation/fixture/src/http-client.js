/**
 * The planning HTTP client.
 *
 * It never opens a socket: the caller hands in how long the response took and the
 * client says whether that would have been a timeout. `timeoutMs` is an integer
 * number of milliseconds, like every other duration on the surface.
 */
export class HttpClient {
  constructor({ timeoutMs = 1000, baseUrl = '' } = {}) {
    this.timeoutMs = timeoutMs
    this.baseUrl = baseUrl
  }

  /** What the request would look like on the wire. */
  plan(path = '/') {
    return { url: this.baseUrl + path, timeoutMs: this.timeoutMs }
  }

  /**
   * Would a response that took `responseMs` have been a timeout?
   * A response that took exactly as long as the timeout is still a response.
   */
  attempt({ path = '/', responseMs }) {
    return {
      url: this.baseUrl + path,
      durationMs: responseMs,
      status: responseMs > this.timeoutMs ? 'timeout' : 'ok',
    }
  }
}
