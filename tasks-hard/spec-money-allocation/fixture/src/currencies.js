/**
 * Currencies.
 *
 * A currency's minor unit is how many decimals its amounts are written with.
 * The service was launched billing in the four currencies below, so that is
 * what this table knows about; anything else is written the way dollars are.
 */

const MINOR_UNITS = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  CHF: 2,
}

const CODE_RE = /^[A-Z]{3}$/

export function isCurrency(code) {
  return typeof code === 'string' && CODE_RE.test(code)
}

/** How many decimals amounts in this currency are written with. */
export function minorUnits(code) {
  if (!isCurrency(code)) throw new Error('unknown currency: ' + code)
  return MINOR_UNITS[code] ?? 2
}

const SYMBOLS = {
  USD: '$',
  EUR: '\u20ac',
  GBP: '\u00a3',
  CHF: 'CHF',
}

/** The symbol, for the console. */
export function symbol(code) {
  if (!isCurrency(code)) throw new Error('unknown currency: ' + code)
  return SYMBOLS[code] ?? code
}

export function currencyCodes() {
  return Object.keys(MINOR_UNITS)
}
