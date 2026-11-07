/**
 * Shared-equipment traces.
 *
 * The matrix in data/equipment.json is the kitchen's agreed list of what each
 * station may carry traces of - the fryer that also does the breaded items,
 * the grill the salmon goes on. Traces are strictly "may contain": an allergen
 * the dish actually contains is reported as contains, never as a trace.
 */
import { sortedUnique } from './sets.js'

export function tracesFor(matrix, equipmentIds) {
  const out = []
  for (const id of equipmentIds ?? []) {
    out.push(...(matrix?.[id] ?? []))
  }
  return sortedUnique(out)
}
