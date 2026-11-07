/**
 * serializers - the { type, id, ... } envelopes the API speaks in.
 *
 * toDTO wraps a record for the wire, emitting its id in canonical form;
 * fromDTO unwraps an incoming envelope, reading the id the way the
 * convention reads every id - legacy bare ids included.
 */
import * as idkit from './idkit.js'

export function toDTO(type, record) {
  return { type, ...record, id: idkit.parse(type, record.id) }
}

export function fromDTO(dto) {
  return { ...dto, id: idkit.parse(dto?.type, dto?.id) }
}
