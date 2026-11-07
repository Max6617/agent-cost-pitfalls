/**
 * Publishing: freezing a draft as the next version of the document.
 */
import * as store from './store.js'
import { result, PUBLISHED, STALE_BASE, UNKNOWN_DRAFT } from './errors.js'

/**
 * Publish a draft: the draft's content becomes the version it was numbered
 * for, that version becomes the published one, and the draft is consumed -
 * the version is what remains.
 *
 * Concurrent publish is first-wins: only a draft whose base is still the
 * current published version may publish. A draft that has been left behind
 * conflicts and changes nothing; it can be re-based by saving.
 */
export function publishDraft(doc, draftId) {
  const draft = store.readDraft(doc, draftId)
  if (!draft) return result(UNKNOWN_DRAFT)
  if (draft.base !== doc.published) return result(STALE_BASE, { current: doc.published })
  store.writeVersion(doc, { version: draft.version, base: draft.base, content: draft.content })
  doc.published = draft.version
  store.removeDraft(doc, draftId)
  return result(PUBLISHED, { version: draft.version })
}
