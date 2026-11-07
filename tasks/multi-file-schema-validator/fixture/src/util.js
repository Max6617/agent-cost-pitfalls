/** Small helpers shared by the intake pipeline. */

export function isPlainObject(v) {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null)
  )
}

/** Deep-clone a JSON-ish structure. Used before handing values to handlers. */
export function clone(value) {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(clone)
  const out = {}
  for (const [k, v] of Object.entries(value)) out[k] = clone(v)
  return out
}

/** Render diagnostics for the support log. */
export function summarise(errors) {
  return (errors ?? []).map((e) => e.field + ':' + e.code).join(', ')
}
