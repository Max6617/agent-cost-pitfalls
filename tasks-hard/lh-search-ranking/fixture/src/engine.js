/**
 * The index.
 *
 * One object owns the whole corpus: the documents, the postings, and the
 * settings they were built with. `search` picks the candidate documents out of
 * the postings, drops the ones the negated clauses exclude, scores what is
 * left, orders it and cuts the page out of it.
 */
import { foldCase } from './fold.js'
import { readField, resolveOptions } from './config.js'
import { createDocuments } from './documents.js'
import { paginate, resolveWindow } from './paging.js'
import { phraseMatches } from './phrase.js'
import {
  createPostings,
  docsFor,
  documentFrequency as documentFrequencyOf,
  termCount,
} from './postings.js'
import { parseQuery } from './query.js'
import { rank, scoreDocument } from './ranking.js'
import { removeDocument, writeDocument } from './reindex.js'
import { createStopwordSet } from './stopwords.js'

export function createIndex(options = {}) {
  const settings = resolveOptions(options)
  const state = {
    fields: settings.fields,
    scoring: settings.scoring,
    paging: settings.paging,
    stopwords: createStopwordSet(settings.stopwords),
    postings: createPostings(),
    documents: createDocuments(),
  }

  /** Store only the configured fields, as strings, with the id they came with. */
  function normalise(document) {
    if (!document || typeof document !== 'object') {
      throw new TypeError('a document must be an object')
    }
    if (typeof document.id !== 'string' || document.id === '') {
      throw new TypeError('a document needs a non-empty string id')
    }
    const stored = { id: document.id }
    for (const field of state.fields) stored[field.name] = readField(document, field.name)
    return stored
  }

  /** The documents a clause matches, before the scoring. */
  function matchClause(clause) {
    if (clause.kind === 'term') return docsFor(state.postings, clause.text)
    const first = clause.tokens[0]
    if (first === undefined) return []
    return docsFor(state.postings, first).filter((id) => phraseMatches(state, clause.tokens, id))
  }

  function matchAny(clauses) {
    const ids = new Set()
    for (const clause of clauses) {
      for (const id of matchClause(clause)) ids.add(id)
    }
    return ids
  }

  /** Whether a document matches a clause as written, negated or not. */
  function clauseMatchesDocument(id, clause) {
    const document = state.documents.get(id)
    const text = state.fields.map((field) => readField(document, field.name)).join(' ')
    if (clause.kind === 'phrase') return text.includes(clause.tokens.join(' '))
    return foldCase(text).includes(clause.text)
  }

  const index = {
    add(document) {
      const stored = normalise(document)
      writeDocument(state, stored)
      return stored.id
    },

    update(id, patch) {
      const current = state.documents.get(id)
      if (!current) return false
      writeDocument(state, normalise({ ...current, ...(patch ?? {}), id }))
      return true
    },

    remove(id) {
      return removeDocument(state, id)
    },

    get(id) {
      return state.documents.get(id)
    },

    all() {
      return state.documents.all()
    },

    stats() {
      return {
        documents: state.documents.size(),
        terms: termCount(state.postings),
        averageLength: state.documents.averageLength(),
      }
    },

    documentFrequency(term) {
      return documentFrequencyOf(state.postings, String(term))
    },

    search(query, options = {}) {
      const raw = String(query ?? '')
      const window = resolveWindow(state, options)
      const parsed = parseQuery(raw, { stopwords: state.stopwords })
      if (parsed.clauses.length === 0) {
        return { query: raw, total: 0, limit: window.limit, offset: window.offset, hits: [] }
      }

      const positives = parsed.clauses.filter((clause) => !clause.negated)
      const negatives = parsed.clauses.filter((clause) => clause.negated)

      const ids = positives.length ? matchAny(positives) : new Set()
      for (const clause of negatives) {
        for (const id of [...ids]) {
          if (clauseMatchesDocument(id, clause)) ids.delete(id)
        }
      }

      const entries = [...ids].map((id) => ({ id, score: scoreDocument(state, parsed.clauses, id) }))
      const ranked = rank(state, entries)
      return { query: raw, ...paginate(state, ranked, window) }
    },
  }

  for (const document of settings.documents) index.add(document)
  return index
}
