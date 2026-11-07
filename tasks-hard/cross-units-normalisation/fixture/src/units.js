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

const DURATION_SUFFIXES = { ms: 1, s: MS_PER_SECOND }
const SIZE_SUFFIXES = { b: 1, kb: 1000, mb: 1000 * 1000 }

const DURATION_TEXT = /^([0-9.]+)([a-z]*)$/
const SIZE_TEXT = /^([0-9.]+)([a-z]*)$/

/**
 * Read a duration written by a human. A number is already milliseconds.
 */
export function parseDuration(value) {
  if (typeof value === 'number') return value
  const match = DURATION_TEXT.exec(value)
  if (!match) throw new Error('invalid duration: ' + value)
  const scale = DURATION_SUFFIXES[match[2] || 'ms']
  if (!scale) throw new Error('invalid duration: ' + value)
  return parseInt(match[1], 10) * scale
}

/**
 * Read a size written by a human. A number is already bytes.
 */
export function parseSize(value) {
  if (typeof value === 'number') return value
  const match = SIZE_TEXT.exec(value)
  if (!match) throw new Error('invalid size: ' + value)
  const scale = SIZE_SUFFIXES[match[2] || 'b']
  if (!scale) throw new Error('invalid size: ' + value)
  return parseInt(match[1], 10) * scale
}

/**
 * Write a duration for the operator report.
 */
export function formatDuration(ms) {
  return ms / MS_PER_SECOND + 's'
}

/**
 * Write a size for the operator report.
 */
export function formatSize(bytes) {
  return bytes / 1000 + 'kb'
}
