/**
 * The inverted index.
 *
 * `terms` maps a term to the documents that contain it, and each of those to
 * the positions the term occupies per field - that is what phrase matching and
 * term frequency both read. `byDoc` is the other direction, so a document can
 * be taken back out without walking the whole table.
 */

export function createPostings() {
  return { terms: new Map(), byDoc: new Map() }
}

/** Record the analysed terms of one document. */
export function indexDoc(postings, docId, analysis) {
  const terms = new Set()
  for (const [field, tokens] of analysis) {
    for (let position = 0; position < tokens.length; position += 1) {
      const term = tokens[position]
      let entry = postings.terms.get(term)
      if (!entry) {
        entry = new Map()
        postings.terms.set(term, entry)
      }
      let fields = entry.get(docId)
      if (!fields) {
        fields = new Map()
        entry.set(docId, fields)
      }
      let positions = fields.get(field)
      if (!positions) {
        positions = []
        fields.set(field, positions)
      }
      positions.push(position)
      terms.add(term)
    }
  }
  postings.byDoc.set(docId, terms)
}

/**
 * Drop a document from the index. A term the document was the last to mention
 * goes with it. Returns false when the document was not there.
 */
export function removeDoc(postings, docId) {
  const terms = postings.byDoc.get(docId)
  if (!terms) return false
  for (const term of terms) {
    const entry = postings.terms.get(term)
    if (!entry) continue
    entry.delete(docId)
    if (entry.size === 0) postings.terms.delete(term)
  }
  postings.byDoc.delete(docId)
  return true
}

/** How many live documents contain the term. */
export function documentFrequency(postings, term) {
  const entry = postings.terms.get(term)
  return entry ? entry.size : 0
}

/** The ids holding the term, in the order they were indexed. */
export function docsFor(postings, term) {
  const entry = postings.terms.get(term)
  return entry ? [...entry.keys()] : []
}

export function hasTerm(postings, term, docId) {
  const entry = postings.terms.get(term)
  return entry ? entry.has(docId) : false
}

/** The positions of a term in one field of one document. */
export function positionsFor(postings, term, docId, field) {
  const entry = postings.terms.get(term)
  if (!entry) return []
  const fields = entry.get(docId)
  if (!fields) return []
  return fields.get(field) ?? []
}

/** The fields of a document that hold the term, with their positions. */
export function fieldsFor(postings, term, docId) {
  const entry = postings.terms.get(term)
  if (!entry) return null
  return entry.get(docId) ?? null
}

export function termCount(postings) {
  return postings.terms.size
}
