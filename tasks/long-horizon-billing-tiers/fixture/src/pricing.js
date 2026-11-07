import { CATALOG, SETTINGS } from './tables.js'
import { roundAndSum, roundMoney } from './money.js'
import { rateForQty } from './tiers.js'
import { resolveCode } from './codes.js'

/**
 * Invoice construction.
 *
 * Order of operations, from the rules document:
 *
 *   extended = qty * unitPrice          (exact)
 *   floored  = max(extended, minCharge) (exact, before any discount)
 *   tierOff  = floored * tierRate       (exact)
 *   codeOff  = percent ? taxable * pct : flat
 *   taxable  = floored - tierOff - codeOff
 *
 * Only `taxable` is rounded, and only once.
 */

/**
 * @param {{ sku: string, qty: number, unitPrice?: number, code?: string }} line
 * @param {{ minCharge?: number }} [options] invoice-wide overrides
 */
export function priceLine(line, options = {}) {
  const unitPrice = line.unitPrice ?? CATALOG[line.sku]
  if (unitPrice == null) throw new Error('no catalogue price for ' + line.sku)

  const minCharge = options.minCharge ?? SETTINGS.minCharge
  const extended = roundMoney(line.qty * unitPrice, 2)

  const floored = Math.max(extended, minCharge)
  const tierRate = rateForQty(line.qty)
  const tierOff = floored * tierRate

  const afterTier = floored - tierOff
  const promo = resolveCode(line.code, afterTier)
  const codeOff = promo.discount

  const taxable = roundMoney(afterTier - codeOff)

  return {
    sku: line.sku,
    qty: line.qty,
    unitPrice,
    extended,
    floored,
    tierRate,
    tierOff: roundMoney(tierOff),
    code: promo.code,
    codeOff: roundMoney(codeOff),
    reason: promo.reason,
    taxable,
  }
}

/** Total an invoice over several lines. */
export function invoice(lines, options = {}) {
  const priced = lines.map((line) => priceLine(line, options))
  const taxable = roundAndSum(priced.map((l) => l.taxable))
  return {
    lines: priced,
    taxable,
    code: priced.find((l) => l.code)?.code ?? null,
  }
}
