import { PROMOTIONS } from './promotions.js'

/**
 * Line-level pricing.
 *
 * A multi-buy promotion is applied to the number of complete groups on the
 * line: three for two on five units gives one free unit, not two.
 *
 * Amounts are exact throughout. Rounding happens once, at the end of the
 * invoice, because rounding a line and then discounting the total produces
 * figures that do not foot.
 */

/**
 * @param {{ sku: string, qty: number, unitPrice: number }} line
 * @returns {{ gross: number, discount: number, net: number, groups: number }}
 */
export function priceLine(line) {
  const gross = line.qty * line.unitPrice
  const promo = PROMOTIONS[line.sku]
  if (!promo || line.qty < promo.buy) {
    return { gross, discount: 0, net: gross, groups: 0 }
  }

  const groups = Math.floor(line.qty / promo.buy)
  const free = groups * (promo.buy - promo.payFor + 1)
  const discount = free * line.unitPrice
  return { gross, discount, net: gross - discount, groups }
}

/** Total a set of lines before any order-level discount. */
export function linesTotal(lines) {
  return lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0)
}
