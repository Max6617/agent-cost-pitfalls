/**
 * A flat one-line-per-key rendering used by support scripts when they eyeball
 * a config. Not part of the round trip; serialize() is.
 */
export function dump(doc) {
  const out = []
  for (const [key, value] of Object.entries(doc.globals)) {
    out.push(`${key} -> ${JSON.stringify(value)}`)
  }
  for (const s of doc.sections) {
    for (const [key, value] of Object.entries(s.entries)) {
      out.push(`${s.name}.${key} -> ${JSON.stringify(value)}`)
    }
  }
  return out.join('\n')
}
