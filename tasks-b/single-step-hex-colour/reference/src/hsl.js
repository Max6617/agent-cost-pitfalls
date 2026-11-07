/**
 * hsl() / hsla() functional notation, comma form.
 *
 *   hsl(120, 100%, 50%)        hue in degrees, saturation/lightness percentages
 *   hsla(240, 100%, 50%, 0.5)  optional alpha, a fraction or a percentage
 *
 * The hue is an angle and is taken modulo 360. Saturation and lightness must
 * carry the % sign; both clamp into 0..100.
 */
import { channel, alpha } from './channels.js'

const HSL_RE = /^hsla?\(\s*(.+?)\s*\)$/i
const NUMBER = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/
const PERCENT = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)%$/

function percent01(text) {
  return Math.min(100, Math.max(0, parseFloat(text))) / 100
}

/**
 * The standard hue/saturation/lightness conversion. Each channel rounds
 * half-up on its own, once, at the end.
 */
export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let r, g, b
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]

  return {
    r: channel((r + m) * 255),
    g: channel((g + m) * 255),
    b: channel((b + m) * 255),
  }
}

export function parseHsl(text) {
  const m = typeof text === 'string' ? HSL_RE.exec(text.trim()) : null
  if (!m) return null
  const parts = m[1].split(',').map((p) => p.trim())
  if (parts.length !== 3 && parts.length !== 4) return null
  if (!NUMBER.test(parts[0]) || !PERCENT.test(parts[1]) || !PERCENT.test(parts[2])) return null

  const { r, g, b } = hslToRgb(parseFloat(parts[0]), percent01(parts[1]), percent01(parts[2]))

  let a = 1
  if (parts.length === 4) {
    const p = parts[3]
    if (NUMBER.test(p)) a = alpha(parseFloat(p))
    else if (PERCENT.test(p)) a = alpha(parseFloat(p) / 100)
    else return null
  }
  return { r, g, b, a }
}
