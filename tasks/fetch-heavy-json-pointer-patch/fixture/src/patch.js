import { parsePointer, arrayIndex, escapeToken } from './pointer.js'

/**
 * JSON Patch.
 *
 * An ordered list of operations applied to a document, producing a new
 * document. The six operations are add, remove, replace, move, copy and test;
 * their exact semantics — especially where "add" inserts inside an array and
 * what "move" does when the destination is inside the source — are the whole
 * difficulty.
 *
 * Nothing is mutated: a patch that fails half way must leave the input alone.
 */

export class PatchError extends Error {
  constructor(message, op) {
    super(message)
    this.name = 'PatchError'
    this.op = op
  }
}

/** A structural clone, good enough for the JSON data model. */
function clone(value) {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(clone)
  const out = {}
  for (const [k, v] of Object.entries(value)) out[k] = clone(v)
  return out
}

const MISSING = Symbol('missing')

/** Walk to the parent of the pointer, returning it and the final token. */
function locate(document, pointer, op) {
  const tokens = parsePointer(pointer)
  if (!tokens.length) throw new PatchError('cannot operate on the whole document', op)

  let node = document
  for (const token of tokens.slice(0, -1)) {
    if (Array.isArray(node)) {
      const index = arrayIndex(token)
      if (index === null || index >= node.length) throw new PatchError('no such element: ' + pointer, op)
      node = node[index]
      continue
    }
    if (node === null || typeof node !== 'object' || !Object.prototype.hasOwnProperty.call(node, token)) {
      throw new PatchError('no such path: ' + pointer, op)
    }
    node = node[token]
  }
  return { parent: node, token: tokens[tokens.length - 1], tokens }
}

/** Read the value at a pointer, or MISSING. */
function readAt(document, pointer, op) {
  if (pointer === '') return document
  const { parent, token } = locate(document, pointer, op)
  if (Array.isArray(parent)) {
    const index = arrayIndex(token)
    if (index === null || index >= parent.length) return MISSING
    return parent[index]
  }
  if (parent === null || typeof parent !== 'object') return MISSING
  return Object.prototype.hasOwnProperty.call(parent, token) ? parent[token] : MISSING
}

function writeAt(document, pointer, value, op) {
  const { parent, token } = locate(document, pointer, op)
  if (Array.isArray(parent)) {
    const index = arrayIndex(token)
    if (index === null || index >= parent.length) throw new PatchError('bad array index: ' + token, op)
    parent.splice(index, 1, value)
    return
  }
  if (parent === null || typeof parent !== 'object') throw new PatchError('cannot add to a leaf: ' + pointer, op)
  parent[token] = value
}

function removeAt(document, pointer, op) {
  const { parent, token } = locate(document, pointer, op)
  if (Array.isArray(parent)) {
    const index = arrayIndex(token)
    if (index === null || index >= parent.length) throw new PatchError('no such element: ' + pointer, op)
    parent.splice(index, 1)
    return
  }
  if (parent === null || typeof parent !== 'object' || !Object.prototype.hasOwnProperty.call(parent, token)) {
    throw new PatchError('no such member: ' + pointer, op)
  }
  delete parent[token]
}

/** Apply one operation in place against a working copy. */
function applyOne(document, op) {
  if (!op || typeof op !== 'object' || typeof op.op !== 'string') throw new PatchError('operation is not an object')
  const path = op.path

  switch (op.op) {
    case 'add': {
      if (!('value' in op)) throw new PatchError('add needs a value', op)
      if (path === '') return clone(op.value)
      writeAt(document, path, clone(op.value), op)
      return document
    }
    case 'remove': {
      if (path === '') return undefined
      removeAt(document, path, op)
      return document
    }
    case 'replace': {
      if (!('value' in op)) throw new PatchError('replace needs a value', op)
      if (path === '') return clone(op.value)
      const current = readAt(document, path, op)
      if (current === MISSING) throw new PatchError('replace target is missing: ' + path, op)
      removeAt(document, path, op)
      writeAt(document, path, clone(op.value), op)
      return document
    }
    case 'test': {
      const current = readAt(document, path, op)
      const same = current !== MISSING && JSON.stringify(current) === JSON.stringify(op.value)
      if (!same) throw new PatchError('test failed at ' + path, op)
      return document
    }
    case 'move': {
      const value = readAt(document, op.from, op)
      if (value === MISSING) throw new PatchError('move source is missing: ' + op.from, op)
      writeAt(document, path, value, op)
      if (op.from !== path) removeAt(document, op.from, op)
      return document
    }
    case 'copy': {
      const value = readAt(document, op.from, op)
      if (value === MISSING) throw new PatchError('copy source is missing: ' + op.from, op)
      writeAt(document, path, value, op)
      return document
    }
    default:
      throw new PatchError('unknown operation: ' + op.op, op)
  }
}

/**
 * Apply a patch to a document.
 *
 * @param {unknown} document
 * @param {object[]} patch
 * @returns {unknown} a new document; the input is never modified
 */
export function applyPatch(document, patch) {
  if (!Array.isArray(patch)) throw new PatchError('a patch is a list of operations')
  let working = clone(document)
  for (const op of patch) working = applyOne(working, op)
  return working
}

export { escapeToken }
