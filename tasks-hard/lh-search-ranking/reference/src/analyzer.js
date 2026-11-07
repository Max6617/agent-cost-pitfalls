/**
 * Analysis: turning a string into the terms the index stores.
 *
 * Indexed text and query text travel the same road - fold, then split - so that
 * a term that went in can be found again. The stopword list is applied by the
 * query parser, not here: indexed text keeps its stopwords so that phrase
 * positions line up with what a query asks for.
 */
import { fold, isFoldedLetter } from './fold.js'

/**
 * What counts as a letter: the ASCII letters, the digits, and the accented
 * letters the folding table knows about - so `café` and `naïve` stay whole
 * while `3.5` splits into `3` and `5` and a dash is a separator.
 */
export function isWordCode(char) {
  const code = char.charCodeAt(0)
  if (code >= 48 && code <= 57) return true
  if (code >= 97 && code <= 122) return true
  if (code >= 65 && code <= 90) return true
  return isFoldedLetter(char)
}

/** Split a string into its raw terms, in the order they appear. */
export function splitTokens(text) {
  const tokens = []
  let current = ''
  for (const char of String(text ?? '')) {
    if (isWordCode(char)) {
      current += char
      continue
    }
    if (current) tokens.push(current)
    current = ''
  }
  if (current) tokens.push(current)
  return tokens
}

/** The analysed terms of one document field, in order. */
export function analyzeDocument(text) {
  const terms = []
  for (const token of splitTokens(fold(text))) terms.push(token)
  return terms
}

/**
 * The analysed terms of a query clause. Stopwords are dropped here unless the
 * clause is a phrase, which needs its terms to stay adjacent.
 */
export function analyzeQuery(text, stopwords, options = {}) {
  const dropped = stopwords ?? new Set()
  const keepStopwords = options.keepStopwords === true
  const terms = []
  for (const token of splitTokens(fold(text))) {
    if (!token) continue
    if (!keepStopwords && dropped.has(token)) continue
    terms.push(token)
  }
  return terms
}

/** The analysed terms of a field value, for tooling and diagnostics. */
export function tokenize(text) {
  return analyzeDocument(text)
}
