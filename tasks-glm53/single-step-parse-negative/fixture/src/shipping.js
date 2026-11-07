/**
 * Shipping rules. Kept separate from the cart because the rates are owned by
 * the fulfilment team and change on their own schedule.
 */

export const RATES = {
  standard: 4.95,
  express: 11.5,
  collect: 0,
}

const FREE_SHIPPING_THRESHOLD = 50

/**
 * @param {number} subtotal
 * @param {'standard'|'express'|'collect'} method
 */
export function shippingFor(subtotal, method = 'standard') {
  const rate = RATES[method]
  if (rate == null) throw new Error('unknown shipping method: ' + method)
  if (method === 'collect') return 0
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : rate
}

export function estimatedDays(method = 'standard') {
  switch (method) {
    case 'express':
      return 1
    case 'collect':
      return 0
    default:
      return 4
  }
}
