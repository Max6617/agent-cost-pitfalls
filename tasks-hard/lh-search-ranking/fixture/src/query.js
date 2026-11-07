/**
 * The query parser.
 *
 * A query is a flat list of clauses; the engine decides what to do with them.
 * Clause text is analysed here, so the rest of the pipeline only ever sees
 * folded terms.
 */
import { analyzeQuery, isWordCode } from './analyzer.js'
import { createStopwordSet } from './stopwords.js'

export function parseQuery(input, options = {}) {
  const stopwords = options.stopwords ?? createStopwordSet()
  const text = String(input ?? '')
  const byKey = new Map()
  let negatedPending = false
  let cursor = 0

  function add(clause) {
    const negated = negatedPending
    negatedPending = false
    if (clause.kind === 'term') {
      if (!clause.text) return
    } else if (clause.tokens.length === 0) {
      return
    }
    const key = clause.kind === 'term'
      ? 'term:' + clause.text
      : 'phrase:' + clause.tokens.join(' ')
    const existing = byKey.get(key)
    // A term written both ways is one negated clause.
    if (existing && !(negated && !existing.negated)) return
    byKey.set(key, { kind: clause.kind, negated, ...clause })
  }

  while (cursor < text.length) {
    const char = text[cursor]
    const next = text[cursor + 1]
    const atClauseStart = cursor === 0 || !isWordCode(text[cursor - 1])

    if (char === '-' && atClauseStart) {
      if (next !== undefined && (next === '"' || isWordCode(next))) {
        negatedPending = true
        cursor += 1
        continue
      }
      cursor += 1
      continue
    }

    if (char === '"') {
      const close = text.indexOf('"', cursor + 1)
      const inner = close === -1 ? text.slice(cursor + 1) : text.slice(cursor + 1, close)
      cursor = close === -1 ? text.length : close + 1
      add({ kind: 'phrase', tokens: analyzeQuery(inner, stopwords, { keepStopwords: true }) })
      continue
    }

    if (isWordCode(char)) {
      let end = cursor
      while (end < text.length && isWordCode(text[end])) end += 1
      const terms = analyzeQuery(text.slice(cursor, end), stopwords)
      cursor = end
      add({ kind: 'term', text: terms[0] ?? '' })
      continue
    }

    cursor += 1
  }

  return { clauses: [...byKey.values()] }
}
