import { withContext } from '../logger.js'

/**
 * Shipping rates.
 *
 * Rates come from a carrier matrix that is refreshed nightly. A postcode the
 * matrix does not cover is a soft failure: the order still goes through at the
 * standard rate, but someone has to fix the matrix.
 */

export const MATRIX = {
  'AB1': { standard: 4.95, express: 11.5 },
  'DE1': { standard: 6.5, express: 14 },
}

export function rateFor(carrier, postcode, logger = withContext()) {
  const area = String(postcode).replace(/\s+/g, '').slice(0, 3).toUpperCase()
  const row = MATRIX[area]
  if (!row) {
    logger.warn('shipping: no rate for ' + carrier + ' at ' + postcode + ', falling back to standard')
    return 9.99
  }
  return row.standard
}

export function expressRateFor(carrier, postcode, logger = withContext()) {
  const area = String(postcode).replace(/\s+/g, '').slice(0, 3).toUpperCase()
  const row = MATRIX[area]
  if (!row) {
    logger.warn('shipping: no express rate for ' + carrier + ' at ' + postcode)
    return 19.99
  }
  return row.express
}
