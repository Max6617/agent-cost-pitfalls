/**
 * Column names, and the mapping the pipeline applies to them.
 *
 * Suppliers name their columns whatever they like, and the loader wants the
 * names in config/import.config.json. The mapping between the two is a plain
 * object keyed by the supplier's name.
 *
 * A file that names two columns the same way - which happens as soon as a
 * supplier puts two "Ref" columns in one export - still has to survive: every
 * column keeps its own name, and the repeats are numbered.
 */
import { ParseError } from './errors.js'

/** The names a header record (or a supplied list) resolves to. */
export function buildColumns(names) {
  const taken = new Set()
  const columns = []
  for (let i = 0; i < names.length; i += 1) {
    const base = typeof names[i] === 'string' && names[i] !== '' ? names[i] : 'column_' + (i + 1)
    let name = base
    for (let n = 2; taken.has(name); n += 1) name = base + '_' + n
    taken.add(name)
    columns.push(name)
  }
  return columns
}

/**
 * The output name of each column, in file order: the name itself, or `null`
 * when the mapping drops the column. Values stay where they are in the record,
 * so dropping a column never shifts the fields beside it.
 */
export function mapColumns(columns, rename) {
  if (!rename) return columns.slice()
  const output = columns.slice()
  for (const [from, to] of Object.entries(rename)) {
    const at = columns.indexOf(from)
    if (at < 0) throw new ParseError('unknown-column')
    output[at] = to === undefined ? null : to
  }
  const seen = new Set()
  for (const name of output) {
    if (name === null) continue
    if (seen.has(name)) throw new ParseError('duplicate-column')
    seen.add(name)
  }
  return output
}

/** One object per record, keyed by the mapped column name. */
export function toRecord(values, mapping) {
  const row = {}
  for (let i = 0; i < mapping.length; i += 1) {
    const key = mapping[i]
    if (key === null) continue
    row[key] = values[i] === undefined ? null : values[i]
  }
  return row
}
