/**
 * Grammar validation.
 *
 * A query is read once, in full, before a single row is touched: a malformed
 * document raises on an empty table exactly as it does on a full one, and the
 * error names the part of the document at fault so the report builder can point
 * at the line the user wrote. An operator this engine does not have is never a
 * quiet no-op - a filter that silently matches everything is worse than one that
 * refuses to run.
 *
 * The sections are checked in the order the specification lists them, and
 * within a section from left to right, parents before children.
 */
import { QueryError, ERROR_CODES, unknownKey, badShape } from './errors.js'
import { OPERATORS, ARRAY_OPERATORS, NO_VALUE_OPERATORS, COMBINATORS } from './condition.js'
import { AGGREGATE_OPS, FIELD_AGGREGATES } from './aggregates.js'
import { parseExpression } from './project.js'

export const ROOT = 'query'

const TOP_KEYS = ['where', 'group', 'having', 'select', 'order', 'offset', 'limit']
const GROUP_KEYS = ['by', 'aggregates']
const AGGREGATE_KEYS = ['op', 'field']
const SPEC_KEYS = ['field', 'expr', 'as']
const ORDER_KEYS = ['field', 'dir']
const LEAF_KEYS = ['field', 'op', 'value']

export function validateQuery(query) {
  if (!isObject(query) || Array.isArray(query)) throw badShape(ROOT, 'a query is an object')

  for (const key of Object.keys(query)) {
    if (!TOP_KEYS.includes(key)) throw unknownKey(`${ROOT}.${key}`, key)
  }

  if (query.where !== undefined) validateCondition(query.where, `${ROOT}.where`)
  if (query.group !== undefined) validateGroup(query.group, `${ROOT}.group`)
  if (query.having !== undefined) validateCondition(query.having, `${ROOT}.having`)
  if (query.select !== undefined) validateSelect(query.select, `${ROOT}.select`)
  if (query.order !== undefined) validateOrder(query.order, `${ROOT}.order`)
  if (query.offset !== undefined) validateInteger(query.offset, `${ROOT}.offset`)
  if (query.limit !== undefined) validateLimit(query.limit, `${ROOT}.limit`)

  return query
}

function validateCondition(node, path) {
  if (!isObject(node) || Array.isArray(node)) throw badShape(path, 'a condition is an object')

  const keys = Object.keys(node)
  const combinator = COMBINATORS.find((name) => keys.includes(name))

  if (combinator !== undefined) {
    for (const key of keys) {
      if (key !== combinator) throw unknownKey(`${path}.${key}`, key)
    }
    const children = node[combinator]
    if (combinator === 'not') {
      validateCondition(children, `${path}.not`)
      return
    }
    if (!Array.isArray(children)) throw badShape(`${path}.${combinator}`, `${combinator} takes a list of conditions`)
    children.forEach((child, index) => validateCondition(child, `${path}.${combinator}.${index}`))
    return
  }

  if (!('field' in node)) throw badShape(path, 'a condition is a leaf or a combination of conditions')
  for (const key of keys) {
    if (!LEAF_KEYS.includes(key)) throw unknownKey(`${path}.${key}`, key)
  }
  if (typeof node.field !== 'string' || node.field === '') throw badShape(`${path}.field`, 'a leaf names the field it asks about')
  if (typeof node.op !== 'string') throw badShape(`${path}.op`, 'a leaf names the operator it asks with')
  if (!OPERATORS.includes(node.op)) {
    throw new QueryError(ERROR_CODES.UNKNOWN_OPERATOR, `${path}.op`, `${JSON.stringify(node.op)} is not an operator of this language`)
  }
  if (NO_VALUE_OPERATORS.includes(node.op)) {
    if ('value' in node) throw badShape(path, `${node.op} compares against nothing and takes no value`)
    return
  }
  if (!('value' in node)) throw badShape(path, `${node.op} needs a value to compare against`)
  if (ARRAY_OPERATORS.includes(node.op) && !Array.isArray(node.value)) {
    throw badShape(`${path}.value`, `${node.op} takes a list of values`)
  }
}

function validateGroup(group, path) {
  if (!isObject(group) || Array.isArray(group)) throw badShape(path, 'group is an object')
  for (const key of Object.keys(group)) {
    if (!GROUP_KEYS.includes(key)) throw unknownKey(`${path}.${key}`, key)
  }

  const by = group.by === undefined ? [] : group.by
  if (!Array.isArray(by)) throw badShape(`${path}.by`, 'by is a list of field names')
  by.forEach((field, index) => {
    if (typeof field !== 'string' || field === '') throw badShape(`${path}.by.${index}`, 'a group key is a field name')
  })

  const aggregates = group.aggregates === undefined ? {} : group.aggregates
  if (!isObject(aggregates) || Array.isArray(aggregates)) throw badShape(`${path}.aggregates`, 'aggregates is an object of aliases')
  for (const alias of Object.keys(aggregates)) {
    const aliasPath = `${path}.aggregates.${alias}`
    const spec = aggregates[alias]
    if (!isObject(spec) || Array.isArray(spec)) throw badShape(aliasPath, 'an aggregate is an object')
    for (const key of Object.keys(spec)) {
      if (!AGGREGATE_KEYS.includes(key)) throw unknownKey(`${aliasPath}.${key}`, key)
    }
    if (typeof spec.op !== 'string') throw badShape(`${aliasPath}.op`, 'an aggregate names its operator')
    if (!AGGREGATE_OPS.includes(spec.op)) {
      throw new QueryError(ERROR_CODES.UNKNOWN_AGGREGATE, `${aliasPath}.op`, `${JSON.stringify(spec.op)} is not an aggregate of this language`)
    }
    if (spec.field !== undefined && (typeof spec.field !== 'string' || spec.field === '')) {
      throw badShape(`${aliasPath}.field`, 'an aggregate reads one field')
    }
    if (spec.field === undefined && FIELD_AGGREGATES.includes(spec.op)) {
      throw badShape(aliasPath, `${spec.op} needs a field to read`)
    }
  }
}

function validateSelect(select, path) {
  if (!Array.isArray(select)) throw badShape(path, 'select is a list of field specs')
  const written = new Set()

  select.forEach((spec, index) => {
    const specPath = `${path}.${index}`
    let output

    if (typeof spec === 'string') {
      if (spec === '') throw badShape(specPath, 'a projected field is named')
      output = spec
    } else {
      if (!isObject(spec)) throw badShape(specPath, 'a field spec is a name or an object')
      for (const key of Object.keys(spec)) {
        if (!SPEC_KEYS.includes(key)) throw unknownKey(`${specPath}.${key}`, key)
      }
      const readsField = spec.field !== undefined
      const computes = spec.expr !== undefined
      if (readsField && computes) throw badShape(specPath, 'a spec reads a field or computes one, not both')
      if (!readsField && !computes) throw badShape(specPath, 'a spec reads a field or computes one')
      if (spec.as !== undefined && (typeof spec.as !== 'string' || spec.as === '')) {
        throw badShape(`${specPath}.as`, 'the name a spec writes is a string')
      }
      if (readsField) {
        if (typeof spec.field !== 'string' || spec.field === '') throw badShape(`${specPath}.field`, 'a projected field is named')
        output = spec.as ?? spec.field
      } else {
        if (typeof spec.expr !== 'string' || spec.expr === '') throw badShape(`${specPath}.expr`, 'a computed field carries an expression')
        if (spec.as === undefined) throw badShape(specPath, 'a computed field needs the name to write it under')
        parseExpression(spec.expr, specPath)
        output = spec.as
      }
    }

    if (written.has(output)) throw badShape(specPath, `two specs would both write ${JSON.stringify(output)}`)
    written.add(output)
  })
}

function validateOrder(order, path) {
  if (!Array.isArray(order)) throw badShape(path, 'order is a list of keys')
  order.forEach((key, index) => {
    const keyPath = `${path}.${index}`
    if (!isObject(key)) throw badShape(keyPath, 'an order key is an object')
    for (const name of Object.keys(key)) {
      if (!ORDER_KEYS.includes(name)) throw unknownKey(`${keyPath}.${name}`, name)
    }
    if (typeof key.field !== 'string' || key.field === '') throw badShape(`${keyPath}.field`, 'an order key names the field it sorts by')
    if (key.dir !== undefined) {
      if (key.dir !== 'asc' && key.dir !== 'desc') {
        throw new QueryError(ERROR_CODES.BAD_DIRECTION, `${keyPath}.dir`, `${JSON.stringify(key.dir)} is neither 'asc' nor 'desc'`)
      }
    }
  })
}

function validateInteger(value, path) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new QueryError(ERROR_CODES.BAD_INTEGER, path, `${path.slice(ROOT.length + 1)} is a whole number of rows, zero or more`)
  }
}

function validateLimit(value, path) {
  if (value === null) return
  validateInteger(value, path)
}

function isObject(value) {
  return value !== null && typeof value === 'object'
}
