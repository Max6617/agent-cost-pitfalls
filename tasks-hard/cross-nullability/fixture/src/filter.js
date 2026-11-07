/**
 * Filter expressions for customer search.
 *
 * A filter is a list of conditions, compiled into one predicate:
 *
 *   { field: 'city', op: '=', value: 'Berlin' }
 *   { field: 'phone', op: 'is missing' }
 *   { field: 'notes', op: 'is present' }
 *   { field: 'creditLimit', op: '>', value: 500 }
 *   { field: 'notes', op: 'no value' }
 *
 * A condition is about the field, and the three states of a field are not the
 * same answer: a field that was never filled in is not the same row as a field a
 * customer asked us to clear. See docs/field-policy.md for the truth table.
 */
import { fieldState, hasField, isPlainObject } from './core.js'

const COMPARATORS = ['=', '!=', '<', '<=', '>', '>=']
const UNARY = ['is missing', 'is present', 'no value']

export function makeCondition(field, op, value) {
  if (!COMPARATORS.includes(op) && !UNARY.includes(op)) {
    throw new Error('unknown filter operator: ' + op)
  }
  return { field, op, value }
}

export function compileFilter(conditions = []) {
  const list = conditions.map((condition) => {
    if (condition === null || condition === undefined) return () => true
    if (typeof condition === 'function') return condition
    if (!isPlainObject(condition)) throw new Error('a filter condition must be an object')
    const op = condition.op ?? '='
    if (!COMPARATORS.includes(op) && !UNARY.includes(op)) {
      throw new Error('unknown filter operator: ' + op)
    }
    return predicateFor(condition.field, op, condition.value)
  })
  return (record) => list.every((predicate) => predicate(record))
}

function predicateFor(field, op, value) {
  if (op === 'no value') {
    return (record) => !hasValue(record, field)
  }
  if (op === 'is missing') {
    return (record) => fieldState(record, field) === 'missing'
  }
  if (op === 'is present') {
    return (record) => hasField(record, field)
  }
  return (record) => compare(record === null || record === undefined ? undefined : record[field], op, value)
}

/**
 * Whether a field carries a value at all. An empty string, an empty list and a
 * zero are values - they are not the absence of one.
 */
function hasValue(record, field) {
  if (!hasField(record, field)) return false
  const value = record[field]
  if (value === null || value === undefined) return false
  if (value === '') return false
  if (Array.isArray(value) && value.length === 0) return false
  if (isPlainObject(value) && Object.keys(value).length === 0) return false
  return true
}

function compare(actual, op, expected) {
  switch (op) {
    case '=':
      return looseEquals(actual, expected)
    case '!=':
      return !looseEquals(actual, expected)
    case '<':
      return actual < expected
    case '<=':
      return actual <= expected
    case '>':
      return actual > expected
    case '>=':
      return actual >= expected
    default:
      throw new Error('unknown filter operator: ' + op)
  }
}

function looseEquals(actual, expected) {
  if (actual === expected) return true
  if (actual === undefined || actual === null) return expected === undefined || expected === null
  return String(actual) === String(expected)
}

/** Parse a filter in the search box's `field op value` syntax. */
export function parseFilter(text) {
  if (typeof text !== 'string') throw new TypeError('parseFilter expects a string')
  const trimmed = text.trim()
  if (trimmed === '') return []
  const conditions = []
  for (const clause of trimmed.split(/\s+and\s+/i)) {
    const part = clause.trim()
    if (part === '') continue
    const missing = part.match(/^(\w+)\s+is\s+missing$/i)
    if (missing) {
      conditions.push(makeCondition(missing[1], 'is missing'))
      continue
    }
    const present = part.match(/^(\w+)\s+is\s+present$/i)
    if (present) {
      conditions.push(makeCondition(present[1], 'is present'))
      continue
    }
    const novalue = part.match(/^(\w+)\s+has\s+no\s+value$/i)
    if (novalue) {
      conditions.push(makeCondition(novalue[1], 'no value'))
      continue
    }
    const comparison = part.match(/^(\w+)\s*(<=|>=|!=|=|<|>)\s*(.*)$/)
    if (!comparison) throw new Error('cannot parse filter clause: ' + part)
    const [, field, op, rawValue] = comparison
    conditions.push(makeCondition(field, op, literal(rawValue.trim())))
  }
  return conditions
}

function literal(text) {
  if (text === '') return ''
  if (text === 'null') return null
  if (text === 'true') return true
  if (text === 'false') return false
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text)
  const quoted = text.match(/^'(.*)'$/) ?? text.match(/^"(.*)"$/)
  if (quoted) return quoted[1]
  return text
}

/** Run a compiled filter over rows. */
export function search(rows, conditions) {
  const predicate = typeof conditions === 'function' ? conditions : compileFilter(conditions)
  return (rows ?? []).filter((row) => predicate(row))
}
