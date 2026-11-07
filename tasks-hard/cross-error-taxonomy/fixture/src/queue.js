/**
 * The job publisher. The broker is a single injected function that takes the
 * envelope and answers with a status, the same shape the outbound client's
 * transport uses.
 */
export function createPublisher(broker) {
  return {
    publish(topic, payload, { ctx, idempotent = true } = {}) {
      const envelope = { topic, jobId: payload ? payload.jobId : undefined, payload }
      broker(envelope)
      return { accepted: true, envelope }
    },
  }
}
