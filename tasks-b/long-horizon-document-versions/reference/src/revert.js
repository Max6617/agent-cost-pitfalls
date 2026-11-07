/**
 * Revert: going back to the content of an earlier published version by
 * opening a new draft. The published history is never rewritten.
 */
import * as store from './store.js'
import { result, CREATED, UNKNOWN_VERSION } from './errors.js'

/**
 * Open an ordinary draft - numbered to become the next version, based on the
 * current published version - whose content is a copy of the named version's.
 */
export function revertTo(doc, version) {
  const target = store.readVersion(doc, version)
  if (!target) return result(UNKNOWN_VERSION)
  const draft = {
    id: store.nextDraftId(doc),
    document: doc.id,
    version: (doc.published ?? 0) + 1,
    base: doc.published,
    author: null,
    content: target.content,
  }
  store.writeDraft(doc, draft)
  return result(CREATED, { draft: store.readDraft(doc, draft.id) })
}
