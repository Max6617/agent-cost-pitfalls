/**
 * rgb() / rgba() functional notation, comma form.
 *
 *   rgb(255, 136, 0)        integer channels, clamped to 0..255
 *   rgb(100%, 53%, 0%)      percentage channels, clamped to 0..100
 *   rgba(255, 0, 0, 0.5)    alpha as a fraction 0..1 or a percentage
 *
 * Integers and percentages may mix in one declaration, and rgba() with three
 * channels is just rgb(). The function name is matched case-insensitively.
 */
import { channel, alpha } from './channels.js'

const RGB_RE = /^rgba?\(\s*(.+?)\s*\)$/i
const INTEGER = /^[+-]?\d+$/
const PERCENT = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)%$/
const NUMBER = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/

/** A percentage channel onto the byte grid: a percentage of 255. */
function fromPercent(text) {
  const pct = Math.min(100, Math.max(0, parseFloat(text)))
  return channel((pct / 100) * 255)
}

/** The optional fourth channel: a fraction, or a percentage of full opacity. */
function readAlpha(text) {
  if (NUMBER.test(text)) return alpha(parseFloat(text))
  if (PERCENT.test(text)) return alpha(parseFloat(text) / 100)
  return null
}

export function parseRgb(text) {
  const m = typeof text === 'string' ? RGB_RE.exec(text.trim()) : null
  if (!m) return null
  const parts = m[1].split(',').map((p) => p.trim())
  if (parts.length !== 3 && parts.length !== 4) return null

  const rgb = []
  for (const part of parts.slice(0, 3)) {
    if (INTEGER.test(part)) rgb.push(channel(parseInt(part, 10)))
    else if (PERCENT.test(part)) rgb.push(fromPercent(part))
    else return null
  }

  let a = 1
  if (parts.length === 4) {
    a = readAlpha(parts[3])
    if (a === null) return null
  }
  return { r: rgb[0], g: rgb[1], b: rgb[2], a }
}
