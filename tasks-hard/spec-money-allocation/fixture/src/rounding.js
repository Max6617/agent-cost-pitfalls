/**
 * Rounding modes.
 *
 * Rounding is a decision about the value, and the modes are the ones billing
 * signed off: see docs/billing-rules.md section 3.
 *
 * Every mode produces a fixed-scale string - that is the point of the function -
 * and the sign of the source value is put back on afterwards, so that a rounded
 * amount keeps the sign of the amount it was rounded from.
 */
import { toNumber } from './decimal.js'

/** The modes billing signed off, in the order docs/billing-rules.md lists them. */
export const ROUNDING_MODES = ['half-up', 'half-even', 'half-down', 'floor', 'ceiling']

function render(number, scale, source) {
  const text = Math.abs(number).toFixed(scale)
  return String(source).trim().startsWith('-') ? '-' + text : text
}

export function roundTo(value, scale = 2, mode = 'half-up') {
  if (!ROUNDING_MODES.includes(mode)) throw new Error('unknown rounding mode: ' + mode)
  const number = toNumber(value)
  const factor = 10 ** scale
  let rounded
  if (mode === 'floor') rounded = Math.floor(number * factor) / factor
  else if (mode === 'ceiling') rounded = Math.ceil(number * factor) / factor
  else rounded = Math.round(number * factor) / factor
  return render(rounded, scale, value)
}
