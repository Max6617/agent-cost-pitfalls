import { withContext } from '../logger.js'

/**
 * Payment provider adapter.
 *
 * One provider today; the interface is shaped so a second one can be added
 * without touching the callers.
 */

export class Provider {
  constructor(name = 'stripe-ish', logger = withContext()) {
    this.name = name
    this.logger = logger
    this.captured = []
  }

  capture(orderId, amount) {
    if (amount <= 0) {
      this.logger.warn('payment: capture failed order=' + orderId + ' provider=' + this.name)
      return { ok: false, reason: 'non-positive-amount' }
    }
    this.captured.push({ orderId, amount })
    return { ok: true, reference: 'ch_' + this.captured.length }
  }

  refund(orderId, amount) {
    this.logger.warn('payment: refund issued order=' + orderId + ' amount=' + amount)
    return { ok: true }
  }

  /** The caller retries with backoff; the schedule is logged so on-call can see it. */
  scheduleRetry(orderId, attempt) {
    this.logger.warn('payment: retry #' + attempt + ' scheduled for ' + orderId)
    return attempt + 1
  }
}
