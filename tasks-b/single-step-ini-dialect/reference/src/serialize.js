/** The canonical writer: parse(serialize(doc)) is the same document. */

export function serialize(doc) {
  const lines = []
  pushEntries(lines, doc.globals)
  for (const s of doc.sections) {
    if (lines.length) lines.push('')
    lines.push('[' + s.name + ']')
    pushEntries(lines, s.entries)
  }
  return lines.length ? lines.join('\n') + '\n' : ''
}

function pushEntries(lines, entries) {
  for (const [key, value] of Object.entries(entries)) {
    lines.push(key + ' = ' + emit(value))
  }
}

function emit(value) {
  return needsQuote(value) ? quote(value) : value
}

// The quoting predicate from docs/dialect.md §8: bare unless a re-read would
// change or lose the value.
function needsQuote(value) {
  if (value === '') return true
  if (/^[ \t]|[ \t]$/.test(value)) return true
  if (/["\n\t]/.test(value)) return true
  if (/[ \t][;#]/.test(value)) return true
  if (value.endsWith('\\')) return true
  return false
}

function quote(value) {
  return (
    '"' +
    value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t') +
    '"'
  )
}
