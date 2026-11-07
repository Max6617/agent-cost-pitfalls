/**
 * Ordering.
 *
 * The keys are applied left to right: the first one decides, the next one
 * settles the rows the first called equal, and so on. Two things in here are
 * easy to get wrong and expensive in a report. First, a row whose key is missing
 * or null is not a small value: it goes after every row that has one, whichever
 * way the key runs, so that turning a report around does not fill its first page
 * with blank rows. Second, the rows no key separates stay in the order they
 * arrived in - a stable report is worth more than a tidy implementation.
 */
import { compareValues } from './values.js'

export function orderRows(rows, keys) {
  if (!keys || keys.length === 0) return rows
  const decorated = rows.map((row, index) => ({ row, index }))
  decorated.sort((left, right) => compareEntries(left, right, keys))
  return decorated.map((entry) => entry.row)
}

function compareEntries(left, right, keys) {
  for (const key of keys) {
    const compared = compareKey(left.row[key.field], right.row[key.field], key.dir === 'desc')
    if (compared !== 0) return compared
  }
  return left.index - right.index
}

function compareKey(left, right, descending) {
  const leftAbsent = left === undefined || left === null
  const rightAbsent = right === undefined || right === null
  if (leftAbsent || rightAbsent) {
    if (leftAbsent && rightAbsent) return 0
    return leftAbsent ? 1 : -1
  }
  const compared = compareValues(left, right)
  return descending ? -compared : compared
}
