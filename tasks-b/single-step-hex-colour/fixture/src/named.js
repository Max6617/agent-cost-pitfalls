/**
 * The named colours theme files are allowed to use. The table is the whole
 * vocabulary: lookup is case-insensitive, and anything not listed here is not
 * a colour.
 */
export const NAMED = {
  black: [0, 0, 0],
  white: [255, 255, 255],
  red: [255, 0, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
  yellow: [255, 255, 0],
  cyan: [0, 255, 255],
  magenta: [255, 0, 255],
  orange: [255, 165, 0],
  purple: [128, 0, 128],
  rebeccapurple: [102, 51, 153],
  tomato: [255, 99, 71],
}

export function lookupNamed(text) {
  const rgb = NAMED[text.toLowerCase()]
  return rgb ? { r: rgb[0], g: rgb[1], b: rgb[2], a: 1 } : null
}
