/**
 * The in-memory state of the service.
 *
 * One record per document: the version number that is currently published, the
 * published versions, the open drafts, and the draft id sequence. Everything
 * else - drafts, publishing, revert - is built on these accessors.
 */

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
  return doc.versions.get(version) ?? null
}

export function writeVersion(doc, record) {
  doc.versions.set(record.version, record)
  return record
}

export function readDraft(doc, draftId) {
  return doc.drafts.get(draftId) ?? null
}

export function writeDraft(doc, draft) {
  doc.drafts.set(draft.id, draft)
  return draft
}

export function updateDraft(doc, draftId, patch) {
  const draft = doc.drafts.get(draftId)
  if (!draft) return null
  Object.assign(draft, patch)
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
    entries.push({ kind: 'published', version: v.version, base: v.base, content: v.content })
  }
  for (const d of doc.drafts.values()) {
    entries.push({ kind: 'draft', id: d.id, version: d.version, base: d.base, content: d.content })
  }
  entries.sort((a, b) => a.version - b.version || (a.kind === b.kind ? 0 : a.kind === 'published' ? -1 : 1))
  return entries
}
