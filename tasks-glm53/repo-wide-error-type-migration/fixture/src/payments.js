/** The payment provider adapter. */

export class Payments {
  constructor({ provider = 'stripe-ish', logger = () => {} } = {}) {
    this.provider = provider
    this.logger = logger
    this.charge = null
  }

  /**
   * Capture a payment.
   *
   * The provider answers with a decline rather than an HTTP error, so a decline
   * has to be turned into a failure by us.
   */
  capture(cartId, amount) {
    if (!(amount > 0)) {
      throw new Error('amount must be positive')
    }
    if (amount > 5000) {
      this.logger({ event: 'payment.declined', cartId, amount })
      throw new Error('payment declined by provider')
    }
    this.charge = { cartId, amount, provider: this.provider }
    return this.charge
  }

  /** Ask the provider to reverse a capture. */
  refund(cartId) {
    if (!this.charge || this.charge.cartId !== cartId) {
      throw new Error('nothing to refund for ' + cartId)
    }
    this.charge = null
    return { refunded: true }
  }
}
