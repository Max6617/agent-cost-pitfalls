import { expandRun } from './tabs.js'

// Split one hard line into words and the gaps between them. Leading and
// trailing whitespace of the hard line is dropped. Each token is
//
//   { word, gap: null }                 the first word of the line
//   { word, gap: { text, raw } }        `text` is what the line shows,
//                                       `raw` the characters it came from
export function tokenize(line) {
  const tokens = []
  let pending = null
  let column = 0
  let i = 0
  const isBlank = (c) => c === ' ' || c === '\t'
  while (i < line.length) {
    if (isBlank(line[i])) {
      let j = i
      while (j < line.length && isBlank(line[j])) j++
      pending = line.slice(i, j)
      i = j
      continue
    }
    let j = i
    while (j < line.length && !isBlank(line[j])) j++
    const word = line.slice(i, j)
    let gap = null
    if (tokens.length > 0 && pending !== null) {
      const text = expandRun(pending, column)
      gap = { text, raw: pending }
      column += text.length
    }
    tokens.push({ word, gap })
    column += word.length
    pending = null
    i = j
  }
  return tokens
}

// A word longer than the line budget is hard-chunked, so that no emitted
// line ever exceeds the budget.
export function breakLong(word, limit) {
  if (word.length <= limit) return [word]
  const parts = []
  for (let i = 0; i < word.length; i += limit) parts.push(word.slice(i, i + limit))
  return parts
}
