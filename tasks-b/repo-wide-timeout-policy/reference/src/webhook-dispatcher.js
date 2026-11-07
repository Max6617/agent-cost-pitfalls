/**
 * Webhook delivery plans.
 *
 * One delivery attempt per subscriber endpoint; the worker requeues on
 * failure up to `attempts`. The per-call timeout is resolved through the
 * policy like every other client's.
 */
export function createWebhookDispatcher({ policy, attempts = 3 } = {}) {
  return {
    /** The plan for one delivery of `event`. */
    deliver(event, { timeout } = {}) {
      return { event, attempts, timeoutMs: policy.resolve('webhook.deliver', timeout) }
    },
  }
}
