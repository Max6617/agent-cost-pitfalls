/**
 * Phrase matching.
 *
 * A phrase is a clause whose terms all have to be in the document, so
 * `"release notes"` is a narrower query than `release notes`: the words have to
 * be there together rather than either of them being enough.
 */
import { hasTerm } from './postings.js'

export function phraseMatches(state, tokens, docId) {
  for (const token of tokens) {
    if (!hasTerm(state.postings, token, docId)) return false
  }
  return true
}
