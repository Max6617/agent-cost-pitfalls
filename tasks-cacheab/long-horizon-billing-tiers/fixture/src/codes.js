import { CODES } from './tables.js'

/**
 * Promotional codes.
 *
 * A percentage code takes a share of the taxable amount; a fixed code takes a
 * flat number of currency units off. An unknown code discounts nothing and says
 * so — it is not an error, because the code was typed by a customer.
 */

/**
 * Resolve a code against a taxable amount.
 *
 * @param {string|undefined|null} code
 * @param {number} taxable
 * @returns {{ code: string|null, discount: number, reason?: string }}
 */
export function resolveCode(code, taxable = 0) {
  if (!code) return { code: null, discount: 0 }

  const key = String(code).trim().toUpperCase()
  const rule = CODES[key]
  if (!rule) return { code: null, discount: 0, reason: 'unknown-code' }

  const discount = rule.kind === 'percent' ? rule.value : rule.value
  return { code: key, discount }
}

/** Does this code take a share rather than a flat amount? */
export function isPercentCode(code) {
  const rule = CODES[String(code ?? '').trim().toUpperCase()]
  return rule?.kind === 'percent'
}
