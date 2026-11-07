/**
 * The outbound client. The transport is injected, so the client's whole job is
 * to turn whatever the far side did into something this service can report.
 */
export function createOutbound(transport) {
  return {
    send(request, { ctx, idempotent = true } = {}) {
      const answer = transport(request)
      const status = answer ? answer.status : 0
      if (status >= 200 && status < 300) return answer.body
      if (status === 404) throw new Error('the upstream has no such resource')
      if (status === 429) throw new Error('the upstream is rate limiting us')
      throw new Error('the upstream answered ' + status)
    },
  }
}
