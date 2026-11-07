/**
 * Tokens to values.
 *
 * The scanner has already removed the quotes, so what is left here is the
 * smallest decision in the library: what does an empty field mean, and does
 * whitespace around a field belong to it.
 */
export function fieldValue(token, dialect) {
  let text = token.text
  if (dialect.trim) text = text.trim()
  return text === '' ? '' : text
}

/** The same decision for a whole record, in order. */
export function recordValues(record, dialect) {
  return record.fields.map((field) => fieldValue(field, dialect))
}
