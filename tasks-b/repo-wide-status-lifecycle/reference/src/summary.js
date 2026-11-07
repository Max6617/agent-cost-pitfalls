/**
 * summary - the weekly rollup.
 *
 * Reads the status column of whatever the boards export that week and counts
 * under the canonical vocabulary of docs/status-lifecycle.md.
 */
import { normaliseStatus, isActive } from './lifecycle.js'

export function summarise(statuses) {
  const counts = {}
  let active = 0
  for (const raw of statuses) {
    const status = normaliseStatus(raw)
    counts[status] = (counts[status] ?? 0) + 1
    if (isActive(status)) active += 1
  }
  return { counts, active, total: statuses.length }
}
