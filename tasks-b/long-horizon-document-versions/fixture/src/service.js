/**
 * The service facade: documents, drafts, publishing and revert behind one
 * object. Nothing here keeps state of its own; it all lives in the store.
 */
import * as store from './store.js'
import { createDraft, saveDraft, deleteDraft, deleteVersion } from './drafts.js'
import { publishDraft } from './publish.js'
import { revertTo } from './revert.js'
import { result, CREATED, DOCUMENT_EXISTS, UNKNOWN_DOCUMENT } from './errors.js'

export function createDocumentService() {
  const state = store.createStore()

  const withDocument = (id, fn) => {
    const doc = store.getDocument(state, id)
    return doc === null ? result(UNKNOWN_DOCUMENT) : fn(doc)
  }

  return {
    createDocument({ id, title = '' } = {}) {
      if (store.getDocument(state, id) !== null) return result(DOCUMENT_EXISTS)
      const doc = store.addDocument(state, { id, title })
      return result(CREATED, { document: { id: doc.id, title: doc.title } })
    },

    createDraft: (id, options) => withDocument(id, (doc) => createDraft(doc, options)),
    saveDraft: (id, draftId, change) => withDocument(id, (doc) => saveDraft(doc, draftId, change)),
    publishDraft: (id, draftId) => withDocument(id, (doc) => publishDraft(doc, draftId)),
    revertTo: (id, version) => withDocument(id, (doc) => revertTo(doc, version)),
    deleteDraft: (id, draftId) => withDocument(id, (doc) => deleteDraft(doc, draftId)),
    deleteVersion: (id, version) => withDocument(id, (doc) => deleteVersion(doc, version)),

    getVersion(id, version) {
      const doc = store.getDocument(state, id)
      return doc === null ? null : store.readVersion(doc, version)
    },

    getDraft(id, draftId) {
      const doc = store.getDocument(state, id)
      return doc === null ? null : store.readDraft(doc, draftId)
    },

    publishedVersion(id) {
      const doc = store.getDocument(state, id)
      return doc === null ? null : doc.published
    },

    listVersions(id) {
      const doc = store.getDocument(state, id)
      return doc === null ? null : store.listVersions(doc)
    },
  }
}
