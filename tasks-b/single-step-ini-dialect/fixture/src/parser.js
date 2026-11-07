import { IniParseError } from './errors.js'
import { logicalLines } from './lines.js'
import { parseValue } from './values.js'
import { DocBuilder } from './model.js'

/** Parse config text into the document shape described in docs/dialect.md. */
export function parse(text) {
  const builder = new DocBuilder()
  let current = null // null while still in the global block
  for (const { text: line, line: lineNo } of logicalLines(text)) {
    if (line.startsWith('[')) {
      if (!line.endsWith(']')) throw new IniParseError('malformed section header', lineNo)
      const name = line.slice(1, -1).trim()
      if (name === '') throw new IniParseError('empty section name', lineNo)
      current = builder.section(name).entries
      continue
    }
    const eq = line.indexOf('=')
    if (eq < 0) throw new IniParseError('expected key = value', lineNo)
    const key = line.slice(0, eq).trim()
    if (key === '') throw new IniParseError('empty key', lineNo)
    builder.put(current ?? builder.doc.globals, key, parseValue(line.slice(eq + 1), lineNo))
  }
  return builder.doc
}
