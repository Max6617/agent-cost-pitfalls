/**
 * Publishing: freezing a draft as the next version of the document.
 */
import * as store from './store.js'
import { result, PUBLISHED, UNKNOWN_DRAFT } from './errors.js'

/**
 * Publish a draft: the draft's content becomes the version it was numbered
 * for, that version becomes the published one, and the draft is consumed -
 * the version is what remains.
 */
export function publishDraft(doc, draftId) {
  const draft = store.readDraft(doc, draftId)
  if (!draft) return result(UNKNOWN_DRAFT)
  store.writeVersion(doc, { version: draft.version, base: draft.base, content: draft.content })
  doc.published = draft.version
  store.removeDraft(doc, draftId)
  return result(PUBLISHED, { version: draft.version })
}
