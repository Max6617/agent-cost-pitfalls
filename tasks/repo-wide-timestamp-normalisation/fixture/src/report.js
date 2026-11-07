/**
 * Building the export rows.
 *
 * A report row has a timestamp, a label and a count. The timestamp is rendered
 * by the shared helper, so every export agrees with the audit log.
 */
import { toTimestamp, shortStamp } from './timestamps.js'

export function reportRows(entries) {
  return entries.map((entry) => ({
    at: toTimestamp(entry.at),
    label: entry.label,
    count: entry.count ?? 1,
  }))
}

/** The header line the finance team pastes into a spreadsheet. */
export function reportHeader() {
  return ['timestamp', 'label', 'count']
}

/** A one-line summary for the dashboard card. */
export function summarise(entries) {
  if (!entries.length) return 'nothing recorded'
  const latest = entries[entries.length - 1]
  return entries.length + ' events, last at ' + shortStamp(toTimestamp(latest.at))
}
