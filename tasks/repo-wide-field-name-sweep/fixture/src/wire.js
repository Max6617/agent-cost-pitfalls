/**
 * The wire convention.
 *
 * Every object the API emits or accepts uses camelCase keys. The database uses
 * snake_case and the legacy CSV export uses `SCREAMING_SNAKE`; both are
 * translated at the boundary and nowhere else, so a handler never has to know
 * which storage layer it is talking to.
 *
 * `toWire` is the only function that renames a key on the way out, and
 * `fromWire` the only one on the way in. A module that builds a payload by hand
 * is a module that will ship a snake_case key to a client that is not expecting
 * one — which is exactly what happened when the cart and the invoice disagreed
 * about `line_total` and `lineTotal` for a month.
 */

/** snake_case or SCREAMING_SNAKE or kebab-case to camelCase. */
export function toCamel(key) {
  return String(key).replace(/[-_]+([a-zA-Z0-9])/g, (whole, char) => char.toUpperCase())
}

/** camelCase to snake_case. */
export function toSnake(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase()
}

/** Rename the keys of an object, leaving the values alone. */
export function renameKeys(object, rename) {
  if (Array.isArray(object)) return object.map((item) => renameKeys(item, rename))
  if (object === null || typeof object !== 'object') return object
  const out = {}
  for (const [key, value] of Object.entries(object)) out[rename(key)] = renameKeys(value, rename)
  return out
}

/** A stored row, as the API sends it. */
export function toWire(row) {
  return renameKeys(row, toCamel)
}

/** A request body, as the storage layer wants it. */
export function fromWire(body) {
  return renameKeys(body, toSnake)
}

/** Rename only the top level, for a payload whose nested shape is fixed. */
export function toWireShallow(row) {
  const out = {}
  for (const [key, value] of Object.entries(row ?? {})) out[toCamel(key)] = value
  return out
}
