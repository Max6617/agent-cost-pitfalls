/**
 * JSON boundary for records.
 *
 * The wire format has to carry all three states, which is why the serializer
 * does not go through a plain `JSON.stringify` of the record: a key that is
 * present and null and a key that is not there at all must not come back as the
 * same thing on the other side of the round trip.
 */
import { formatJson, isPlainObject } from './core.js'

/**
 * Encode a record as JSON text.
 *
 *   key absent in the record        the key is not in the output
 *   key present with value null     `"key":null`
 *   key present with ''  []  {}  0  `"key":""`, `"key":[]`, `"key":{}`, `"key":0`
 *
 * Keys are emitted in sorted order so the same record always produces the same
 * text.
 */
export function serialize(record) {
  const body = {}
  if (record === null || record === undefined) return '{}'
  if (!isPlainObject(record)) throw new TypeError('serialize expects a plain object')
  for (const key of Object.keys(record)) {
    const value = record[key]
    if (value === undefined) continue
    body[key] = value
  }
  return formatJson(body)
}

/**
 * Decode JSON text into a record. A `null` in the text becomes a field that is
 * present and null; a key the text does not mention stays missing.
 */
export function deserialize(text) {
  if (typeof text !== 'string') throw new TypeError('deserialize expects a string')
  const parsed = JSON.parse(text)
  if (parsed === null) return null
  if (!isPlainObject(parsed)) throw new TypeError('deserialize expects a JSON object')
  return parsed
}

/** Serialize, then deserialize. A record survives its own round trip unchanged. */
export function roundTrip(record) {
  return deserialize(serialize(record))
}
