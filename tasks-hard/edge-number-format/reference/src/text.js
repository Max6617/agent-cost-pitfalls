/**
 * Plain rendering: a value as sign, integer part and a fixed number of
 * fraction digits, with no notation switch and no separators.
 *
 * This is the layer that has to be exact. A double is turned into its shortest
 * exact decimal string, the digits are put on the grid there, and only then do
 * they become a number-shaped string again. A rounded value that is zero is `0`
 * with the grid's zeros after it, never `-0`.
 */
import { DEFAULT_DIGITS } from './rules.js'
import { exactDigits, magnitudeOf, roundsUp } from './util/guards.js'

/** `count` zeros. */
function zeros(count) {
  return '0'.repeat(Math.max(count, 0))
}

/**
 * The digits of a finite non-negative double, as an integer part and a fraction
 * part of plain digits.
 *
 * The digits come from `toExponential`, which is exact for the double it names
 * and writes an exponent, so a subnormal arrives as the digits it actually has
 * rather than as a double that cannot be written down.
 */
export function decompose(value) {
  const { digits, power } = exactDigits(magnitudeOf(value))
  if (power >= 0) return { whole: digits + zeros(power), fraction: '' }
  const whole = digits.slice(0, digits.length + power)
  const fraction = digits.slice(digits.length + power).padStart(-power, '0')
  return { whole: whole === '' ? '0' : whole, fraction }
}

/**
 * Round the magnitude of `value` to exactly `digits` fraction digits and return
 * the digits that were kept, as an integer part and `places` fraction digits.
 *
 * The digits are scaled, never measured through a double: `shift` is how many
 * powers of ten the last digit of the run stands above the last place the grid
 * keeps, so a negative shift says the value sits below the grid and rounds to
 * zero. Rounding is half away from zero on the exact decimal that was passed,
 * which is why `1.005` at two places is `1.01` while the double nearest that
 * literal sits below the halfway point.
 */
export function fixedRun(value, digits = DEFAULT_DIGITS) {
  const places = Math.max(0, digits)
  const { digits: run, power } = exactDigits(magnitudeOf(value))
  const shift = power + places

  const scaled = shift >= 0 ? BigInt(run) * 10n ** BigInt(shift) : BigInt(run) / 10n ** BigInt(-shift)
  const deciding = shift >= 0 ? '0' : run[run.length + shift]
  const rounded = roundsUp(deciding) ? scaled + 1n : scaled
  return { digits: rounded.toString(), places }
}

/**
 * A kept digit run as an integer part and `places` fraction digits.
 *
 * The run is a plain digit string whose last digit stands for 10^-places, so
 * laying it out is a matter of putting the point back in, and a run that grew a
 * leading digit by carrying takes the point along with it.
 */
export function layOut(run, places = DEFAULT_DIGITS) {
  const kept = Math.max(0, places)
  const text = run.padStart(kept + 1, '0')
  const whole = text.slice(0, text.length - kept)
  const fraction = kept === 0 ? '' : text.slice(text.length - kept)
  return { whole: whole === '' ? '0' : whole, fraction }
}

/** Render a finite value in plain notation with exactly `digits` fraction digits. */
export function renderFixed(value, digits = DEFAULT_DIGITS) {
  const { digits: run, places } = fixedRun(value, digits)
  const { whole, fraction } = layOut(run, places)
  return fraction === '' ? whole : whole + '.' + fraction
}
