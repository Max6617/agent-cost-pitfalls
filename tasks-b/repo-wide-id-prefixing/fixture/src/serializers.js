/**
 * serializers - the { type, id, ... } envelopes the API speaks in.
 *
 * toDTO wraps a record for the wire, fromDTO unwraps an incoming envelope.
 * fromDTO is strict on purpose: an envelope that does not carry the typed
 * form of its id is bounced before it can reach a record.
 */
import * as idkit from './idkit.js'
import { IdError } from './idkit.js'

export function toDTO(type, record) {
  if (idkit.PREFIX[type] === undefined) {
    throw new IdError('bad-type', 'unknown id type: ' + String(type))
  }
  return { type, ...record }
}

export function fromDTO(dto) {
  const prefix = idkit.PREFIX[dto?.type]
  if (prefix === undefined) {
    throw new IdError('bad-type', 'unknown id type: ' + String(dto?.type))
  }
  if (typeof dto.id !== 'string' || !dto.id.startsWith(prefix + '_')) {
    throw new IdError('bad-id', 'an envelope carries the typed form of its id')
  }
  return { ...dto }
}
