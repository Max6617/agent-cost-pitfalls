/**
 * Ranking: what a hit is worth, and in what order hits come back.
 *
 * A term is worth more in a boosted field, worth less in a long document, and
 * worth less the more documents mention it at all. Frequencies saturate: the
 * tenth mention of a word says much less than the second.
 */
import { boostOf } from './config.js'
import { documentFrequency, fieldsFor } from './postings.js'
import { compareIds } from './util/text.js'

export function saturate(frequency, k1) {
  return frequency / (frequency + k1)
}

export function inverseDocumentFrequency(collection, df) {
  return Math.log(1 + (collection - df + 0.5) / (df + 0.5))
}

/** The length normaliser of one document. */
export function lengthNorm(state, docId) {
  const average = state.documents.averageLength()
  if (!average) return 1
  const length = state.documents.lengthOf(docId)
  return 1 - state.scoring.b + state.scoring.b * (length / average)
}

/**
 * What one term is worth in one document: every field it occurs in contributes
 * its own boost, and the length of the document scales the sum.
 */
export function termWeight(state, term, docId) {
  const fields = fieldsFor(state.postings, term, docId)
  if (!fields) return 0
  let weighted = 0
  for (const [field, positions] of fields) {
    weighted += boostOf(state.fields, field) * saturate(positions.length, state.scoring.k1)
  }
  return weighted / lengthNorm(state, docId)
}

/** The score of one document for the parsed clauses of a query. */
export function scoreDocument(state, clauses, docId) {
  const collection = state.documents.size()
  let total = 0
  for (const clause of clauses) {
    if (clause.negated) continue
    const terms = clause.kind === 'term' ? [clause.text] : clause.tokens
    for (const term of terms) {
      // How many documents mention the term at all.
      const df = documentFrequency(state.postings, term)
      total += inverseDocumentFrequency(collection, df) * termWeight(state, term, docId)
    }
  }
  return total
}

/**
 * Result order. Highest score first; ties go to the lower id, so the answer
 * depends on the documents and the query and on nothing else.
 */
export function rank(state, entries) {
  return [...entries].sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score
    return compareIds(left.id, right.id)
  })
}
