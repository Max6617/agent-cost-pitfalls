/**
 * Canonical serialisation. A colour always writes as #rrggbb in lowercase,
 * with two more digits for the alpha when - and only when - the colour is not
 * opaque.
 */
import { byte, alpha } from './channels.js'

export function toHex(colour) {
  if (colour === null || typeof colour !== 'object') return null
  const rgb = byte(colour.r) + byte(colour.g) + byte(colour.b)
  const a = alpha(colour.a ?? 1)
  if (a === 1) return '#' + rgb
  return '#' + rgb + byte(a * 255)
}
