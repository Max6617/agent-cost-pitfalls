/**
 * parse(text) - read a colour in any supported notation.
 *
 * Leading and trailing whitespace is ignored. The notation is recognised from
 * the shape of the text: a leading # is hex, rgb()/rgba() and hsl()/hsla() are
 * functional notation, anything else is tried against the named table.
 * Whatever cannot be read is refused with null, never guessed.
 */
import { parseHex } from './hex.js'
import { parseRgb } from './rgb.js'
import { parseHsl } from './hsl.js'
import { lookupNamed } from './named.js'

export function parse(text) {
  if (typeof text !== 'string') return null
  const trimmed = text.trim()
  if (trimmed === '') return null
  if (trimmed.startsWith('#')) return parseHex(trimmed)
  if (/^rgba?\(/i.test(trimmed)) return parseRgb(trimmed)
  if (/^hsla?\(/i.test(trimmed)) return parseHsl(trimmed)
  return lookupNamed(trimmed)
}
