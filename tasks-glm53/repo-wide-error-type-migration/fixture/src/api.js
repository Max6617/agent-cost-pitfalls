/**
 * The HTTP layer.
 *
 * Every handler returns a `{ status, body }` pair. Failures propagate as
 * thrown errors and are turned into responses in one place, so a handler never
 * writes a status code for a failure itself.
 */
import { toHttp } from './errors.js'
import { requireFields, requirePositiveInteger } from './validate.js'
import { Carts } from './carts.js'
import { Stock } from './stock.js'
import { Payments } from './payments.js'

export function makeApi({ carts = new Carts(), stock = new Stock(), payments = new Payments() } = {}) {
  return {
    carts,
    stock,
    payments,

    /** POST /carts/:id/lines */
    addLine(request) {
      try {
        const body = requireFields(request.body, ['sku', 'qty'])
        const qty = requirePositiveInteger(body.qty, 'qty')
        this.stock.require(body.sku, qty)
        this.carts.addLine(request.params.id, { sku: body.sku, qty, unitPrice: Number(body.unitPrice) || 0 })
        return { status: 200, body: { ok: true } }
      } catch (error) {
        return toHttp(error)
      }
    },

    /** POST /carts/:id/checkout */
    checkOut(request) {
      try {
        const cart = this.carts.checkOut(request.params.id)
        const total = this.carts.total(request.params.id)
        this.payments.capture(request.params.id, total)
        return { status: 200, body: { ok: true, total } }
      } catch (error) {
        return toHttp(error)
      }
    },
  }
}
