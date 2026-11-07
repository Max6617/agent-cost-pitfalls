/**
 * Tokens to values.
 *
 * The scanner has already removed the quotes, so what is left here is the
 * smallest decision in the library: what does an empty field mean, and does
 * whitespace around a field belong to it.
 *
 * An empty field that was never quoted is *absent* - the supplier's export
 * writes nothing for a value it does not have. An empty field that was written
 * as `""` is the empty string, which is a value. The two are kept apart all the
 * way to the loader, which is why a `null` never becomes `''` here.
 */
import { trimEdges } from './util/chars.js'

export function fieldValue(token, dialect) {
  if (token.quoted) return token.text
  if (!dialect.trim) return token.text === '' ? null : token.text
  const text = trimEdges(token.text)
  return text === '' ? null : text
}

/** The same decision for a whole record, in order. */
export function recordValues(record, dialect) {
  return record.fields.map((field) => fieldValue(field, dialect))
}
