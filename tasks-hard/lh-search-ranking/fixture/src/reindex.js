/**
 * The write path: documents in, postings out.
 *
 * Everything the index derives - postings, field positions, document lengths -
 * is rebuilt from the document that was just written, so a write never has to
 * know what the document looked like before.
 */
import { analyzeDocument } from './analyzer.js'
import { readField } from './config.js'
import { indexDoc, removeDoc } from './postings.js'

/** The analysed terms of every configured field, in field order. */
export function analyzeFields(state, document) {
  const analysis = new Map()
  for (const field of state.fields) {
    analysis.set(field.name, analyzeDocument(readField(document, field.name)))
  }
  return analysis
}

/** Add one document's terms to the postings and record its length. */
export function indexDocument(state, document) {
  const analysis = analyzeFields(state, document)
  let length = 0
  for (const tokens of analysis.values()) length += tokens.length
  indexDoc(state.postings, document.id, analysis)
  state.documents.setLength(document.id, length)
}

/**
 * Write a document into the index. The store is keyed by id, so writing an id
 * that is already there replaces its fields; the postings are built from the
 * document that was just written.
 */
export function writeDocument(state, document) {
  state.documents.put(document.id, document)
  indexDocument(state, document)
}

/** Take a document out of the index. Returns false when it was not there. */
export function removeDocument(state, id) {
  const removed = state.documents.drop(id)
  removeDoc(state.postings, id)
  return removed
}
