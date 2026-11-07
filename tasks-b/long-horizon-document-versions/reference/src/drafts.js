/**
 * Drafts: the working copies that sit between one published version and the
 * next. A draft is opened off the published version, saved into, and either
 * published or deleted.
 */
import { clone } from './util/clone.js'
import * as store from './store.js'
import {
  result, CREATED, SAVED, STALE_BASE, DELETED, UNKNOWN_DRAFT, UNKNOWN_VERSION, NOT_A_DRAFT,
} from './errors.js'

/**
 * Open a new draft. It starts as a copy of the published version's content -
 * an empty document for the very first draft - numbered to become the next
 * version, and based on the published version it copied.
 */
export function createDraft(doc, { author = null } = {}) {
  const current = store.readVersion(doc, doc.published)
  const draft = {
    id: store.nextDraftId(doc),
    document: doc.id,
    version: (doc.published ?? 0) + 1,
    base: doc.published,
    author,
    content: clone(current === null ? {} : current.content),
  }
  store.writeDraft(doc, draft)
  return result(CREATED, { draft })
}

/**
 * Save new content into a draft. The caller states the base it is working
 * from, and that base must be the version that is currently published: a save
 * that builds on anything else is a conflict and leaves the draft untouched.
 * Saving against a newer base than the draft's own re-bases the draft, which
 * moves its number to the next version off that base.
 */
export function saveDraft(doc, draftId, { content, base = null } = {}) {
  const draft = store.readDraft(doc, draftId)
  if (!draft) return result(UNKNOWN_DRAFT)
  if (base !== doc.published) return result(STALE_BASE, { current: doc.published })
  store.updateDraft(doc, draftId, { content, base, version: (doc.published ?? 0) + 1 })
  return result(SAVED, { draft: store.readDraft(doc, draftId) })
}

/** Only drafts can be deleted. */
export function deleteDraft(doc, draftId) {
  if (!store.removeDraft(doc, draftId)) return result(UNKNOWN_DRAFT)
  return result(DELETED)
}

/** Published versions are immutable: there is nothing to delete. */
export function deleteVersion(doc, version) {
  if (store.readVersion(doc, version) === null) return result(UNKNOWN_VERSION)
  return result(NOT_A_DRAFT)
}
