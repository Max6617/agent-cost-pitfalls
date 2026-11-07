/**
 * Webhook delivery plans.
 *
 * One delivery attempt per subscriber endpoint; the worker requeues on
 * failure up to `attempts`. The dispatcher rewrite kept the `timeout` option
 * on the signature but the per-call value never made it back in — deliveries
 * have run on the fleet-wide ten seconds since.
 */

const DELIVERY_TIMEOUT_MS = 10_000

export function createWebhookDispatcher({ attempts = 3 } = {}) {
  return {
    /** The plan for one delivery of `event`. */
    deliver(event, { timeout } = {}) {
      const timeoutMs = DELIVERY_TIMEOUT_MS
      return { event, attempts, timeoutMs }
    },
  }
}
