/**
 * Deep copies for the audit snapshots. Anything handed to the audit log must
 * already be a copy (docs/audit-convention.md, rule 3): the log takes ownership
 * of what it is given, and nothing that happens to the live record afterwards
 * may show up in an event that was already emitted.
 */
export function clone(value) {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(clone)
  const out = {}
  for (const [key, v] of Object.entries(value)) out[key] = clone(v)
  return out
}
