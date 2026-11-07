/**
 * Grammar validation.
 *
 * A query is read once, in full, before a single row is touched, so a malformed
 * document raises on an empty table exactly as it does on a full one. This pass
 * is about the shape of the document - the parts the stages below would
 * otherwise walk into - and the error names the part at fault so the report
 * builder can point at the line the user wrote.
 */
import { badShape } from './errors.js'

export const ROOT = 'query'

export function validateQuery(query) {
  if (!isObject(query) || Array.isArray(query)) throw badShape(ROOT, 'a query is an object')

  if (query.where !== undefined) validateCondition(query.where, `${ROOT}.where`)
  if (query.having !== undefined) validateCondition(query.having, `${ROOT}.having`)
  if (query.select !== undefined && !Array.isArray(query.select)) {
    throw badShape(`${ROOT}.select`, 'select is a list of field specs')
  }
  if (query.order !== undefined && !Array.isArray(query.order)) {
    throw badShape(`${ROOT}.order`, 'order is a list of keys')
  }

  return query
}

function validateCondition(node, path) {
  if (!isObject(node) || Array.isArray(node)) throw badShape(path, 'a condition is an object')

  if (Array.isArray(node.and)) {
    node.and.forEach((child, index) => validateCondition(child, `${path}.and.${index}`))
    return
  }
  if (Array.isArray(node.or)) {
    node.or.forEach((child, index) => validateCondition(child, `${path}.or.${index}`))
    return
  }
  if (node.not !== undefined) {
    validateCondition(node.not, `${path}.not`)
    return
  }
  if (typeof node.field !== 'string' || typeof node.op !== 'string') {
    throw badShape(path, 'a condition asks about a field with an operator')
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object'
}
