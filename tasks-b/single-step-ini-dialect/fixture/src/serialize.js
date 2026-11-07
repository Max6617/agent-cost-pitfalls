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

// Quote a value when it carries a comment marker.
function emit(value) {
  if (value.includes(';') || value.includes('#')) return quote(value)
  return value
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
