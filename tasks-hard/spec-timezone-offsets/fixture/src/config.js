/**
 * Loads the shipped configuration and the offset table.
 *
 * Both paths are resolved against this file, never against the working
 * directory, so the service behaves the same however it is started.
 */
import { readFileSync } from 'node:fs'
import { parseIsoInstant } from './util/iso.js'

const SERVICE_CONFIG = new URL('../config/service.json', import.meta.url)
const OFFSET_TABLE = new URL('../data/offsets.json', import.meta.url)

export const serviceConfig = JSON.parse(readFileSync(SERVICE_CONFIG, 'utf8'))

let table = null

/**
 * The offset table, with every transition instant already converted to
 * milliseconds. Cached: it is data on disk, not state that moves.
 */
export function loadOffsetTable() {
  if (table) return table
  const raw = JSON.parse(readFileSync(OFFSET_TABLE, 'utf8'))
  const zones = {}
  for (const [name, zone] of Object.entries(raw.zones)) {
    zones[name] = {
      name,
      kind: zone.kind,
      offsetMinutes: zone.offsetMinutes,
      initialOffsetMinutes: zone.kind === 'fixed'
        ? zone.offsetMinutes
        : (zone.initialOffsetMinutes ?? zone.offsetMinutes),
      transitions: (zone.transitions ?? []).map((t) => ({
        at: parseIsoInstant(t.at),
        offsetMinutes: t.offsetMinutes,
      })),
    }
  }
  table = { version: raw.version, generated: raw.generated, zones }
  return table
}

export function defaultZone() {
  return serviceConfig.defaultZone ?? 'UTC'
}
