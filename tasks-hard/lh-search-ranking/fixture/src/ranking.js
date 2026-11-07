/**
 * Ranking: what a hit is worth, and in what order hits come back.
 *
 * A term is worth more in a boosted field, worth less in a long document, and
 * worth less the more documents mention it at all. Frequencies saturate: the
 * tenth mention of a word says much less than the second.
 */
import { boostOf } from './config.js'
import { fieldsFor } from './postings.js'

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
 * What one term is worth in one document: the field the term is strongest in
 * decides how much the hit is worth, and the length of the document scales the
 * whole contribution.
 */
export function termWeight(state, term, docId) {
  const fields = fieldsFor(state.postings, term, docId)
  if (!fields) return 0
  let occurrences = 0
  let strongest = null
  for (const [field, positions] of fields) {
    occurrences += positions.length
    if (strongest === null || positions.length > strongest.count) {
      strongest = { field, count: positions.length }
    }
  }
  if (strongest === null) return 0
  const boost = boostOf(state.fields, strongest.field)
  return (boost * saturate(occurrences, state.scoring.k1)) / lengthNorm(state, docId)
}

/** The score of one document for the parsed clauses of a query. */
export function scoreDocument(state, clauses, docId) {
  let total = 0
  for (const clause of clauses) {
    if (clause.negated) continue
    const terms = clause.kind === 'term' ? [clause.text] : clause.tokens
    for (const term of terms) {
      // How many documents mention the term at all.
      const df = state.documents.size()
      total += inverseDocumentFrequency(state.documents.size(), df) * termWeight(state, term, docId)
    }
  }
  return total
}

/**
 * Result order. Highest score first; documents that score the same are shown
 * alphabetically by title, which is what the interface asks for when a query is
 * ambiguous and two documents are equally good.
 */
export function rank(state, entries) {
  return [...entries].sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score
    const leftTitle = state.documents.get(left.id)?.title ?? ''
    const rightTitle = state.documents.get(right.id)?.title ?? ''
    if (leftTitle < rightTitle) return -1
    if (leftTitle > rightTitle) return 1
    return 0
  })
}
