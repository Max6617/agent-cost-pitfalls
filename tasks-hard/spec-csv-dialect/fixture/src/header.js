/**
 * Column names, and the mapping the pipeline applies to them.
 *
 * Suppliers name their columns whatever they like, and the loader wants the
 * names in config/import.config.json. The mapping between the two is a plain
 * object keyed by the supplier's name.
 */
export function buildColumns(names, dialect) {
  const columns = names.slice()
  const rename = dialect.rename
  if (rename) {
    for (const [from, to] of Object.entries(rename)) {
      const at = columns.indexOf(from)
      if (at >= 0 && typeof to === 'string') columns[at] = to
    }
  }
  return columns
}

/** One object per record, keyed by column name. */
export function toRecord(values, columns) {
  const row = {}
  for (let i = 0; i < columns.length; i += 1) {
    row[columns[i]] = values[i] === undefined ? null : values[i]
  }
  return row
}
