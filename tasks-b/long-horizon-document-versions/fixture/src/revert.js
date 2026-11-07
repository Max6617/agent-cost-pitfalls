/**
 * Revert: going back to the content of an earlier published version.
 */
import { clone } from './util/clone.js'
import * as store from './store.js'
import { result, UNKNOWN_VERSION } from './errors.js'

/** Put the content of an earlier published version back on the document. */
export function revertTo(doc, version) {
  const target = store.readVersion(doc, version)
  if (!target) return result(UNKNOWN_VERSION)
  const current = store.readVersion(doc, doc.published)
  current.content = clone(target.content)
  return result('reverted', { version: doc.published })
}
