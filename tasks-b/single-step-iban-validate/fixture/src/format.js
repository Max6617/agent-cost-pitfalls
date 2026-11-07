import { chunk } from './util/text.js'

/**
 * Format conversion. `toElectronic` normalises input of any shape to the
 * canonical electronic form; `toPrintable` renders the grouped form used on
 * statements and invoices.
 */

/** Canonical electronic form: all whitespace removed, letters uppercased. */
export function toElectronic(input) {
  return String(input).replace(/\s+/g, '').toUpperCase()
}

/** Printable form: groups of four characters joined by single spaces. */
export function toPrintable(input) {
  return chunk(toElectronic(input), 4).join(' ')
}
