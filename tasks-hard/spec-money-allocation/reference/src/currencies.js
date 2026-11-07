/**
 * The declared currencies.
 *
 * A currency's minor unit is how many decimals its amounts are written with,
 * and it is not a property of the toolkit: it is declared, per currency, in
 * data/currencies.json. Assuming two decimals is how a yen amount ends up with
 * cents in it.
 */
import { readJson } from './config.js'

const TABLE = readJson('data/currencies.json')

function lookup(code) {
  if (typeof code !== 'string' || !Object.prototype.hasOwnProperty.call(TABLE, code)) {
    throw new Error('unknown currency: ' + code)
  }
  return TABLE[code]
}

export function isCurrency(code) {
  try {
    lookup(code)
    return true
  } catch {
    return false
  }
}

/** How many decimals amounts in this currency are written with. */
export function minorUnits(code) {
  const declared = lookup(code)
  const units = declared.minorUnits
  if (!Number.isInteger(units) || units < 0) throw new Error('bad minor units for ' + code)
  return units
}

/** The declared symbol, for the console; not used by anything that prints money. */
export function symbol(code) {
  return lookup(code).symbol ?? code
}

export function currencyCodes() {
  return Object.keys(TABLE)
}
