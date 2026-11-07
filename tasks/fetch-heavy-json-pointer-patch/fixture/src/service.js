/**
 * The config API's request path.
 *
 * A PATCH request carries a list of operations; the service reads the current
 * document, applies them to a copy and only stores the result when every
 * operation succeeded. A failed patch leaves the stored document alone.
 */
import { get, parsePointer, decodeFragment } from './pointer.js'
import { applyPatch, PatchError } from './patch.js'

export class ConfigService {
  constructor(document) {
    this.document = document
    this.revision = 1
    this.history = []
  }

  read(pointer = '') {
    return get(this.document, pointer)
  }

  readFragment(fragment) {
    return get(this.document, decodeFragment(fragment).join('/'))
  }

  /**
   * Apply a patch.
   *
   * @param {object[]} operations
   * @returns {{ ok: true, revision: number } | { ok: false, error: string, op?: object }}
   */
  patch(operations) {
    try {
      const next = applyPatch(this.document, operations)
      this.document = next
      this.revision += 1
      this.history.push({ revision: this.revision, operations })
      return { ok: true, revision: this.revision }
    } catch (error) {
      if (error instanceof PatchError) return { ok: false, error: error.message, op: error.op }
      return { ok: false, error: String(error?.message ?? error) }
    }
  }

  /** Does the document have anything at this pointer? */
  exists(pointer) {
    return this.read(pointer) !== undefined
  }

  /** The keys directly under a pointer, for the tree view. */
  childKeys(pointer = '') {
    const node = this.read(pointer)
    if (node === null || typeof node !== 'object') return []
    return Array.isArray(node) ? node.map((_, i) => String(i)) : Object.keys(node)
  }

  /** Parsed tokens, exposed for the audit log. */
  tokens(pointer) {
    return parsePointer(pointer)
  }
}
