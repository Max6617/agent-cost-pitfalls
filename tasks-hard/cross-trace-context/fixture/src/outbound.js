/**
 * The outbound client.
 *
 * Every call to a downstream service is one span of its own, opened from the
 * span that is making the call, and it reports a request event before the call
 * and a response event after it. The span is what an operator uses to line a
 * slow downstream up against the request that waited for it, so a call that
 * reports itself in the caller's span is invisible in the trace.
 */
import { currentContext } from './context.js'

export function createClient({ transport, events, clock } = {}) {
  if (typeof transport !== 'function') {
    throw new TypeError('createClient needs a transport function')
  }
  let calls = 0

  return {
    async send(request) {
      calls += 1
      const { method = 'GET', url, body } = request ?? {}
      if (typeof url !== 'string' || url.length === 0) {
        throw new TypeError('an outbound request needs a url')
      }

      // The call runs in the span that is in flight. Downstream uses the id it
      // is given to line its own logs up with ours.
      const parent = currentContext()

      events?.emit({
        name: 'outbound.request',
        meta: { method, url, attempt: request?.attempt ?? 1 },
      })

      const startedAt = clock ? clock.now() : undefined
      let response
      try {
        response = await transport({ method, url, body, trace: parent })
      } catch (err) {
        events?.emit({
          name: 'outbound.failed',
          meta: { method, url, clientId: parent?.spanId, code: err?.code ?? 'error' },
        })
        // The transport's own error is rethrown unchanged: the caller may know
        // whether it is worth another attempt, and this layer does not.
        throw err
      }

      events?.emit({
        name: 'outbound.response',
        meta: { method, url, status: response?.status ?? 200, clientId: parent?.spanId },
      })
      return { ...response, startedAt }
    },

    get calls() {
      return calls
    },
  }
}
