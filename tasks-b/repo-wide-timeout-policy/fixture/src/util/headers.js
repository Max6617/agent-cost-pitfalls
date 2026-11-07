/**
 * Header normalisation for the HTTP client: header names are case-insensitive
 * on the wire, so plans carry them lowercased with whitespace-trimmed values,
 * and entries without a value are dropped.
 */
export function normalizeHeaders(headers = {}) {
  const out = {}
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined || value === null) continue
    out[String(name).toLowerCase()] = String(value).trim()
  }
  return out
}
