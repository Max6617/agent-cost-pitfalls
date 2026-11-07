/**
 * Published UTC offsets.
 *
 * data/offsets.json is the only authority for local wall-clock time: an entry
 * says "from this instant onwards, local time is UTC plus offsetMinutes". The
 * table is data, so a local schedule means the same thing on every machine.
 */
import { parseWallClock, toWallClock } from './time.js'

const MINUTE = 60000

/** Build a lookup table out of the published file (or any data of that shape). */
export function createOffsetTable(data) {
  const zones = {}
  for (const [name, entries] of Object.entries(data?.zones ?? {})) {
    zones[name] = (entries ?? [])
      .map((entry) => ({ from: Date.parse(entry.from), offsetMinutes: Math.trunc(entry.offsetMinutes) }))
      .sort((a, b) => a.from - b.from)
  }
  return { zones }
}

export function zonesOf(table) {
  return Object.keys(table?.zones ?? {}).sort()
}

/** The entries of one zone, oldest first. An unpublished zone is an error. */
export function entriesFor(table, zone) {
  const entries = table?.zones?.[zone]
  if (!Array.isArray(entries) || !entries.length) {
    throw new RangeError('no published offsets for zone ' + JSON.stringify(zone))
  }
  return entries
}

/** The offset in force at an instant, in minutes. */
export function offsetAt(table, zone, at) {
  const entries = entriesFor(table, zone)
  let offset = entries[0].offsetMinutes
  for (const entry of entries) {
    if (entry.from <= at) offset = entry.offsetMinutes
    else break
  }
  return offset
}

/**
 * The instant at which the local clock in `zone` reads `wall`.
 *
 * `wall` is a clock face, not an instant: it carries no zone and is resolved
 * against the published table. Local time is UTC plus the offset, so the instant
 * is the clock face minus it. A reading the local calendar repeats resolves to
 * its first occurrence; a reading it skips resolves forward by the size of the
 * gap, which is the offset in force before the transition.
 */
export function localToEpoch(table, zone, wall) {
  const entries = entriesFor(table, zone)
  const clock = parseWallClock(wall)

  const consistent = []
  for (const entry of entries) {
    const at = clock - entry.offsetMinutes * MINUTE
    if (offsetAt(table, zone, at) === entry.offsetMinutes) consistent.push(at)
  }
  if (consistent.length) return Math.min(...consistent)

  for (let i = 1; i < entries.length; i += 1) {
    const before = entries[i - 1]
    const after = entries[i]
    if (after.offsetMinutes <= before.offsetMinutes) continue
    const gap = (after.offsetMinutes - before.offsetMinutes) * MINUTE
    const at = clock - before.offsetMinutes * MINUTE
    if (at >= after.from && at < after.from + gap) return at
  }

  return clock - entries[entries.length - 1].offsetMinutes * MINUTE
}

/** The clock face in `zone` at an instant. */
export function epochToLocal(table, zone, at) {
  return toWallClock(at + offsetAt(table, zone, at) * MINUTE)
}
