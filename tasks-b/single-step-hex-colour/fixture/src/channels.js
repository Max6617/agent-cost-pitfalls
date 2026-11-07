/**
 * Channel arithmetic shared by the parsers and the serialiser.
 *
 * A colour channel is an integer 0..255 by the time it leaves a parser; alpha
 * is a number 0..1 everywhere inside the library.
 */

/**
 * The library's one rounding rule: halves go up, so 127.5 is 128.
 * Rounding happens once, at the point a value becomes a channel.
 */
export function roundHalfUp(value) {
  return Math.floor(value + 0.5)
}

export function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value))
}

/** A value read as a channel: rounded, then clamped into byte range. */
export function channel(value) {
  return clamp(roundHalfUp(value), 0, 255)
}

/** A value read as an alpha: clamped into 0..1. */
export function alpha(value) {
  return clamp(value, 0, 1)
}

/** Two lowercase hex digits for a byte value. */
export function byte(value) {
  return channel(value).toString(16).padStart(2, '0')
}
