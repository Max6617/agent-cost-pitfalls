import { roundMoney } from './round.js'
import { priceLine, linesTotal } from './lines.js'
import { loyaltyPercent } from './promotions.js'
import { applyCoupon } from './coupons.js'

/**
 * The invoice.
 *
 * Order of operations, from the rules:
 *
 *   gross      = sum of qty * unitPrice
 *   lineOff    = sum of line promotion discounts
 *   afterLines = gross - lineOff
 *   loyaltyOff = afterLines * loyaltyPercent / 100
 *   afterLoyalty = afterLines - loyaltyOff
 *   couponOff  = coupon applied to afterLoyalty
 *   total      = afterLoyalty - couponOff, rounded once
 */
export function priceOrder(lines, { lifetimeSpend = 0, coupon } = {}) {
  const priced = lines.map((line) => ({ ...line, ...priceLine(line) }))

  const gross = linesTotal(lines)
  const lineOff = priced.reduce((sum, line) => sum + line.discount, 0)
  const afterLines = gross - lineOff

  const loyalty = loyaltyPercent(lifetimeSpend)
  const loyaltyOff = (afterLines * loyalty) / 100
  const afterLoyalty = afterLines - loyaltyOff

  const applied = applyCoupon(coupon, afterLoyalty)
  const total = roundMoney(afterLoyalty - applied.discount)

  return {
    lines: priced,
    gross: roundMoney(gross),
    lineOff: roundMoney(lineOff),
    loyaltyPercent: loyalty,
    loyaltyOff: roundMoney(loyaltyOff),
    coupon: applied.code,
    couponOff: roundMoney(applied.discount),
    reason: applied.reason,
    total,
  }
}
