/**
 * Deep copy of a JSON value.
 *
 * Document content crosses the service boundary as plain JSON: objects, arrays,
 * strings, numbers, booleans, null. Copying is how the service detaches what it
 * stores from what its callers hold.
 */
export function clone(value) {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(clone)
  const out = {}
  for (const key of Object.keys(value)) out[key] = clone(value[key])
  return out
}
