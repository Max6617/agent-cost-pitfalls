/**
 * {name} placeholder substitution. What counts as a placeholder, and what a
 * missing value means in each mode, is pinned in docs/messages-rules.md.
 */
import { MissingValueError } from './errors.js'

const PLACEHOLDER = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g

export function interpolate(text, values = {}, { mode = 'lenient', key } = {}) {
  return text.replace(PLACEHOLDER, (match, name) => {
    if (values[name] === undefined || values[name] === null) {
      return match
    }
    return String(values[name])
  })
}
