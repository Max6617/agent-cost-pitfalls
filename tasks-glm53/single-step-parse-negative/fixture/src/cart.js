import { parseAmount, roundMoney, sumAmounts } from './money.js'

/**
 * Discount codes.
 *
 * The marketing table is stored as a flat object because that is what the CMS
 * export gives us. `OFF10` style codes take a percentage off the subtotal; the
 * fixed-amount codes take a flat number of currency units off.
 */
export const DISCOUNT_CODES = {
  OFF10: { kind: 'percent', value: 10 },
  OFF25: { kind: 'percent', value: 25 },
  SHIP5: { kind: 'fixed', value: 5 },
  LOYAL7: { kind: 'fixed', value: 7.5 },
}

/**
 * Apply a discount code to a subtotal.
 *
 * @param {number} subtotal
 * @param {string|undefined} code
 * @returns {{ code: string|null, discount: number, total: number, reason?: string }}
 */
export function applyDiscount(subtotal, code) {
  if (!code) return { code: null, discount: 0, total: roundMoney(subtotal) }

  const rule = DISCOUNT_CODES[String(code).trim().toUpperCase()]
  if (!rule) {
    return { code: null, discount: 0, total: roundMoney(subtotal), reason: 'unknown-code' }
  }

  const discount = roundMoney(rule.value)
  const total = roundMoney(subtotal - discount)

  return { code: String(code).trim().toUpperCase(), discount, total }
}

/**
 * A cart is a list of line items. Adjustments (refunds, manual credits) arrive
 * with a negative amount.
 *
 * @param {{ sku: string, qty: number, amount: string|number }[]} items
 */
export function cartTotals(items, code) {
  const lines = (items ?? []).map((item) => {
    const unit = parseAmount(item.amount)
    const qty = item.qty ?? 1
    return {
      sku: item.sku,
      qty,
      unit,
      lineTotal: roundMoney(unit * qty),
    }
  })

  const subtotal = sumAmounts(lines.map((l) => l.lineTotal))
  const discounted = applyDiscount(subtotal, code)

  return {
    lines,
    subtotal,
    discount: discounted.discount,
    total: discounted.total,
    reason: discounted.reason,
  }
}
