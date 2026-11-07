/**
 * Zone resolution.
 *
 * A zone is either a key of the offset table or an explicit offset string. Both
 * end up as the same little record: a kind, an offset and a transition list.
 * Anything else is an UnknownZoneError - the service has no UTC default, because
 * a mistyped zone silently scheduled against UTC is a missed job nobody notices
 * until the customer calls.
 */
import { loadOffsetTable } from './config.js'
import { UnknownZoneError } from './errors.js'

const OFFSET_ZONE = /^([+-])(\d{2}):(\d{2})$/

let resolved = null

function table() {
  if (!resolved) resolved = loadOffsetTable()
  return resolved
}

function offsetStringZone(zone) {
  const m = OFFSET_ZONE.exec(zone)
  if (!m) return null
  const hours = Number(m[2])
  const minutes = Number(m[3])
  if (hours > 23 || minutes > 59) return null
  return {
    name: zone,
    kind: 'fixed',
    offsetMinutes: (m[1] === '-' ? -1 : 1) * (hours * 60 + minutes),
    initialOffsetMinutes: (m[1] === '-' ? -1 : 1) * (hours * 60 + minutes),
    transitions: [],
  }
}

/** The table record for a zone name, or a synthetic record for an offset string. */
export function resolveZone(zone) {
  if (zone && typeof zone === 'object' && typeof zone.kind === 'string') return zone
  if (typeof zone !== 'string') throw new UnknownZoneError(zone)
  const zones = table().zones
  if (Object.prototype.hasOwnProperty.call(zones, zone)) return zones[zone]
  const explicit = offsetStringZone(zone)
  if (explicit) return explicit
  throw new UnknownZoneError(zone)
}
