/**
 * The unit module.
 *
 * Everything the service stores, compares and hands around is an integer number
 * of milliseconds or an integer number of bytes. This is the only file that
 * knows any other unit exists: durations arrive as text in
 * config/service.config.json and leave as text in the operator report.
 *
 * See docs/units.md for the policy this file implements.
 */

export const MS_PER_SECOND = 1000
export const MS_PER_MINUTE = 60 * MS_PER_SECOND
export const MS_PER_HOUR = 60 * MS_PER_MINUTE

export const BYTES_PER_KB = 1024
export const BYTES_PER_MB = 1024 * BYTES_PER_KB
export const BYTES_PER_GB = 1024 * BYTES_PER_MB

/** The longest duration and the largest size the service will accept. */
export const MAX_DURATION_MS = 24 * MS_PER_HOUR
export const MAX_SIZE_BYTES = BYTES_PER_GB

const DURATION_SUFFIXES = { ms: 1, s: MS_PER_SECOND, m: MS_PER_MINUTE, h: MS_PER_HOUR }
const SIZE_SUFFIXES = { b: 1, kb: BYTES_PER_KB, mb: BYTES_PER_MB, gb: BYTES_PER_GB }

const DURATION_UNITS = [['h', MS_PER_HOUR], ['m', MS_PER_MINUTE], ['s', MS_PER_SECOND], ['ms', 1]]
const SIZE_UNITS = [['gb', BYTES_PER_GB], ['mb', BYTES_PER_MB], ['kb', BYTES_PER_KB], ['b', 1]]

const AMOUNT = /^([0-9]*\.?[0-9]+)\s*([a-z]*)$/

/**
 * Read one amount, in the given suffixes, and round it up to a whole unit.
 *
 * Reading never shortens a value: a fraction of a millisecond is still a
 * millisecond, and a timeout that was configured is never rounded to nothing.
 */
function readAmount(value, { suffixes, fallback, what, max }) {
  let amount
  let scale = 1
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) throw new RangeError('invalid ' + what + ': ' + value)
    amount = value
  } else if (typeof value === 'string') {
    const match = AMOUNT.exec(value.trim())
    if (!match) throw new RangeError('invalid ' + what + ': ' + value)
    const suffix = match[2] || fallback
    scale = suffixes[suffix]
    if (!scale) throw new RangeError('invalid ' + what + ': ' + value)
    amount = Number(match[1])
  } else {
    throw new RangeError('invalid ' + what + ': ' + String(value))
  }
  const whole = Math.ceil(amount * scale)
  if (!Number.isFinite(whole) || whole > max) throw new RangeError(what + ' out of range: ' + value)
  return whole
}

/**
 * Write a whole value in the largest unit that keeps it at or above one and
 * within a single decimal digit.
 */
function writeAmount(value, { units, what, max }) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > max) {
    throw new RangeError('invalid ' + what + ': ' + value)
  }
  const smallest = units[units.length - 1][0]
  if (value === 0) return '0' + smallest
  for (const [suffix, scale] of units) {
    const amount = value / scale
    if (amount >= 1 && Math.abs(amount * 10 - Math.round(amount * 10)) < 1e-9) {
      return Number(amount.toFixed(1)) + suffix
    }
  }
  return value + smallest
}

/**
 * Read a duration written by a human. A number is already milliseconds.
 */
export function parseDuration(value) {
  return readAmount(value, {
    suffixes: DURATION_SUFFIXES,
    fallback: 'ms',
    what: 'duration',
    max: MAX_DURATION_MS,
  })
}

/**
 * Read a size written by a human. A number is already bytes.
 */
export function parseSize(value) {
  return readAmount(value, {
    suffixes: SIZE_SUFFIXES,
    fallback: 'b',
    what: 'size',
    max: MAX_SIZE_BYTES,
  })
}

/**
 * Write a duration for the operator report.
 */
export function formatDuration(ms) {
  return writeAmount(ms, { units: DURATION_UNITS, what: 'duration', max: MAX_DURATION_MS })
}

/**
 * Write a size for the operator report.
 */
export function formatSize(bytes) {
  return writeAmount(bytes, { units: SIZE_UNITS, what: 'size', max: MAX_SIZE_BYTES })
}
