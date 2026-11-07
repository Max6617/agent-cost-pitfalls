/**
 * Zone resolution.
 *
 * A zone is a key of the offset table. Records that have already been resolved
 * are passed straight through, so the hot path does not look the table up twice.
 */
import { loadOffsetTable } from './config.js'
import { UnknownZoneError } from './errors.js'

// The entry a name the extract has never heard of lands on. Before the offset
// table was shipped every site ran against UTC, and a scheduling run has to come
// back with an answer for every site it was handed.
const FALLBACK = {
  kind: 'fixed',
  offsetMinutes: 0,
  initialOffsetMinutes: 0,
  transitions: [],
}

let resolved = null

function table() {
  if (!resolved) resolved = loadOffsetTable()
  return resolved
}

/** The table record for a zone name. */
export function resolveZone(zone) {
  if (zone && typeof zone === 'object' && typeof zone.kind === 'string') return zone
  const zones = table().zones
  const key = String(zone)
  if (Object.prototype.hasOwnProperty.call(zones, key)) return zones[key]
  return { ...FALLBACK, name: key }
}

export { UnknownZoneError }
