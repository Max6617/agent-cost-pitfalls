/**
 * Ordering.
 *
 * The keys are applied one after another, each one settling what the one before
 * it left equal, so that a report asked for by region and then by amount reads
 * region by region and largest first inside each one. Two rows that no key can
 * separate come back in a fixed order rather than in whatever order the export
 * happened to hold them, so that two runs of the same report agree.
 */
import { compareValues } from './values.js'

export function orderRows(rows, keys) {
  if (!keys || keys.length === 0) return rows
  let ordered = rows
  for (const key of keys) {
    ordered = [...ordered].sort((left, right) => compareByKey(left, right, key))
  }
  return ordered
}

function compareByKey(left, right, key) {
  const compared = compareValues(left[key.field], right[key.field])
  if (compared !== 0) return key.dir === 'desc' ? -compared : compared

  const leftText = JSON.stringify(left)
  const rightText = JSON.stringify(right)
  return leftText < rightText ? -1 : leftText > rightText ? 1 : 0
}
