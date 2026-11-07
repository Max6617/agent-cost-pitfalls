/**
 * The in-memory state of the service.
 *
 * One record per document: the version number that is currently published, the
 * published versions, the open drafts, and the draft id sequence. Everything
 * else - drafts, publishing, revert - is built on these accessors.
 *
 * Content crosses this boundary as copies in both directions: what is written
 * is cloned before it is stored, and what is read is cloned before it is
 * handed out, so the service and its callers never share a reference. That is
 * what keeps a published version frozen once it lands here.
 */
import { clone } from './util/clone.js'

export function createStore() {
  return { documents: new Map() }
}

export function addDocument(store, { id, title }) {
  const doc = { id, title, published: null, versions: new Map(), drafts: new Map(), draftSeq: 0 }
  store.documents.set(id, doc)
  return doc
}

export function getDocument(store, id) {
  return store.documents.get(id) ?? null
}

/** The next draft id for the document. Ids are never reused. */
export function nextDraftId(doc) {
  doc.draftSeq += 1
  return doc.id + '#' + doc.draftSeq
}

export function readVersion(doc, version) {
  const record = doc.versions.get(version) ?? null
  return record === null ? null : { ...record, content: clone(record.content) }
}

export function writeVersion(doc, record) {
  const stored = { ...record, content: clone(record.content) }
  doc.versions.set(stored.version, stored)
  return stored
}

export function readDraft(doc, draftId) {
  const draft = doc.drafts.get(draftId) ?? null
  return draft === null ? null : { ...draft, content: clone(draft.content) }
}

export function writeDraft(doc, draft) {
  const stored = { ...draft, content: clone(draft.content) }
  doc.drafts.set(stored.id, stored)
  return stored
}

export function updateDraft(doc, draftId, patch) {
  const draft = doc.drafts.get(draftId)
  if (!draft) return null
  const { content, ...rest } = patch
  Object.assign(draft, rest)
  if (content !== undefined) draft.content = clone(content)
  return draft
}

export function removeDraft(doc, draftId) {
  return doc.drafts.delete(draftId)
}

/**
 * Every published version and open draft, in the pinned order: ascending
 * version number; a published entry ahead of drafts carrying the same number;
 * drafts among themselves in the order they were opened (the Maps already hold
 * them that way, and the sort is stable).
 */
export function listVersions(doc) {
  const entries = []
  for (const v of doc.versions.values()) {
    entries.push({ kind: 'published', version: v.version, base: v.base, content: clone(v.content) })
  }
  for (const d of doc.drafts.values()) {
    entries.push({ kind: 'draft', id: d.id, version: d.version, base: d.base, content: clone(d.content) })
  }
  entries.sort((a, b) => a.version - b.version || (a.kind === b.kind ? 0 : a.kind === 'published' ? -1 : 1))
  return entries
}
