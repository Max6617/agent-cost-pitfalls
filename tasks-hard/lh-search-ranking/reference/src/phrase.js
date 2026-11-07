/**
 * Phrase matching.
 *
 * A phrase is a clause whose terms all have to be in the document, so
 * `"release notes"` is a narrower query than `release notes`: the words have to
 * be there together rather than either of them being enough. Together means
 * consecutive positions inside one field, in the order they were written.
 */
import { fieldsFor } from './postings.js'

export function phraseMatches(state, tokens, docId) {
  if (tokens.length === 0) return false
  const firstFields = fieldsFor(state.postings, tokens[0], docId)
  if (!firstFields) return false
  for (const [field, positions] of firstFields) {
    for (const start of positions) {
      let matched = true
      for (let offset = 1; offset < tokens.length; offset += 1) {
        const found = fieldsFor(state.postings, tokens[offset], docId)?.get(field)
        if (!found || !found.includes(start + offset)) {
          matched = false
          break
        }
      }
      if (matched) return true
    }
  }
  return false
}
