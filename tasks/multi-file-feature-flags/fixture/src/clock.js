/** The one place an instant is turned into text. */
export function toTimestamp(instant) {
  const date = instant instanceof Date ? instant : new Date(instant)
  return date.toISOString()
}
