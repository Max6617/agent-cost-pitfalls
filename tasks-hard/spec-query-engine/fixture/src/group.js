/**
 * Grouping.
 *
 * One pass over the rows; every row lands in the group its key names, and the
 * groups come out in a settled order so that a report reads the same way twice.
 * A grouped row is an ordinary row - the `by` fields, then the aggregate
 * aliases - so `having`, `select` and `order` need to know nothing about
 * grouping at all.
 */
import { aggregate } from './aggregates.js'
import { compareValues } from './values.js'

export function groupRows(rows, group) {
  const by = group.by ?? []
  const aggregates = group.aggregates ?? {}

  const buckets = new Map()
  const groups = []
  for (const row of rows) {
    const key = by.map((field) => row[field])
    const signature = key.map(canonical).join('\u0000')
    let bucket = buckets.get(signature)
    if (bucket === undefined) {
      bucket = { key, rows: [] }
      buckets.set(signature, bucket)
      groups.push(bucket)
    }
    bucket.rows.push(row)
  }

  const grouped = groups.map((bucket) => {
    const out = {}
    by.forEach((field, index) => {
      const value = bucket.key[index]
      out[field] = value === undefined ? null : value
    })
    for (const alias of Object.keys(aggregates)) {
      out[alias] = aggregate(aggregates[alias], bucket.rows)
    }
    return out
  })

  return grouped.sort((left, right) => {
    for (const field of by) {
      const compared = compareValues(left[field], right[field])
      if (compared !== 0) return compared
    }
    return 0
  })
}

/**
 * A group key is compared with the equality of the specification, so the
 * signature has to keep classes apart and keep a missing field apart from a
 * null one.
 */
function canonical(value) {
  if (value === undefined) return '~'
  if (value === null) return '='
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${key}:${canonical(value[key])}`).join(',')}}`
  return `${typeof value}:${String(value)}`
}
