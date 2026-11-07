/**
 * Grouping.
 *
 * One pass over the rows the previous stage produced; every row lands in the
 * group its key names, and the groups keep the order in which they were first
 * seen. A grouped row is an ordinary row - the `by` fields, then the aggregate
 * aliases - so `having`, `select` and `order` need to know nothing about
 * grouping at all.
 */
import { aggregate } from './aggregates.js'
import { valueClass } from './values.js'

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

  return groups.map((bucket) => {
    const grouped = {}
    by.forEach((field, index) => {
      const value = bucket.key[index]
      if (value !== undefined) grouped[field] = value
    })
    for (const alias of Object.keys(aggregates)) {
      grouped[alias] = aggregate(aggregates[alias], bucket.rows, `query.group.aggregates.${alias}`)
    }
    return grouped
  })
}

/**
 * A group key is compared with the equality of the specification, so the
 * signature has to keep classes apart and keep a missing field apart from a
 * null one.
 */
function canonical(value) {
  const kind = valueClass(value)
  if (kind === 'missing') return '~'
  if (kind === 'null') return '='
  if (kind === 'array') return `[${value.map(canonical).join(',')}]`
  if (kind === 'object') return `{${Object.keys(value).sort().map((key) => `${key}:${canonical(value[key])}`).join(',')}}`
  return `${kind}:${String(value)}`
}
