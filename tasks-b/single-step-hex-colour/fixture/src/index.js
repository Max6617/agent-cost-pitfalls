/**
 * tint - public surface.
 *
 * Everything the theme pipeline and the pre-commit check are allowed to
 * import. Modules under src/ that are not re-exported here are internal and
 * may be reorganised freely; the names below may not.
 */
export { parse } from './parse.js'
export { parseHex } from './hex.js'
export { parseRgb } from './rgb.js'
export { parseHsl, hslToRgb } from './hsl.js'
export { toHex } from './serialise.js'
export { NAMED } from './named.js'
