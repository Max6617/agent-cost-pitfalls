/**
 * Projection.
 *
 * The projection decides what a row of the report looks like: the fields it
 * names, in the order it names them, under the names it gives them. A field the
 * source row does not have is not a value of the report and does not appear -
 * printing an empty column for it would make a missing value look like a value
 * somebody entered.
 *
 * The arithmetic here is the small expression language of the specification.
 * `*` and `/` bind tighter than `+` and `-`, both are left-associative, and a
 * field that is missing or null counts as zero.
 */
import { QueryError, ERROR_CODES, badShape } from './errors.js'

export function project(rows, specs) {
  const program = specs.map((spec, index) => compile(spec, `query.select.${index}`))
  return rows.map((row) => {
    const projected = {}
    for (const step of program) {
      if (step.kind === 'field') {
        const value = row[step.from]
        if (value !== undefined) projected[step.to] = value
      } else {
        projected[step.to] = evaluate(step.tree, row, step.path)
      }
    }
    return projected
  })
}

function compile(spec, path) {
  if (typeof spec === 'string') return { kind: 'field', from: spec, to: spec }
  if (spec.expr !== undefined) return { kind: 'expr', to: spec.as, tree: parseExpression(spec.expr, path), path }
  return { kind: 'field', from: spec.field, to: spec.as ?? spec.field }
}

/* ------------------------------------------------------------------ *
 * Expressions
 * ------------------------------------------------------------------ */

const NAME = /[A-Za-z_][A-Za-z0-9_]*/
const NUMBER = /\d+(?:\.\d+)?|\.\d+/

/** Parse an expression, or raise a bad-shape naming the spec that holds it. */
export function parseExpression(source, path) {
  let tokens
  try {
    tokens = tokenize(source)
  } catch (error) {
    throw badShape(path, `the expression ${JSON.stringify(source)} cannot be read: ${error.message}`)
  }
  let at = 0
  const peek = () => tokens[at]
  const take = () => tokens[at++]

  function expression() {
    let left = term()
    while (peek() === '+' || peek() === '-') {
      const operator = take()
      left = { operator, left, right: term() }
    }
    return left
  }

  function term() {
    let left = factor()
    while (peek() === '*' || peek() === '/') {
      const operator = take()
      left = { operator, left, right: factor() }
    }
    return left
  }

  function factor() {
    const token = take()
    if (token === undefined) throw new Error('the expression ends early')
    if (token === '-') return { operator: 'negate', operand: factor() }
    if (token === '(') {
      const inner = expression()
      if (take() !== ')') throw new Error('a bracket is never closed')
      return inner
    }
    if (typeof token === 'number') return { number: token }
    if (NAME.test(token) && !NUMBER.test(token)) return { field: token }
    throw new Error(`${JSON.stringify(token)} is not a number, a field or a bracket`)
  }

  let tree
  try {
    tree = expression()
    if (at !== tokens.length) throw new Error(`${JSON.stringify(tokens[at])} is left over`)
  } catch (error) {
    throw badShape(path, `the expression ${JSON.stringify(source)} cannot be read: ${error.message}`)
  }
  return tree
}

function tokenize(source) {
  const tokens = []
  let at = 0
  while (at < source.length) {
    const rest = source.slice(at)
    const space = /^\s+/.exec(rest)
    if (space) { at += space[0].length; continue }
    const number = /^(?:\d+(?:\.\d+)?|\.\d+)/.exec(rest)
    if (number) { tokens.push(Number(number[0])); at += number[0].length; continue }
    const name = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest)
    if (name) { tokens.push(name[0]); at += name[0].length; continue }
    const symbol = rest[0]
    if ('+-*/()'.includes(symbol)) { tokens.push(symbol); at += 1; continue }
    throw new Error(`${JSON.stringify(symbol)} is not part of an expression`)
  }
  return tokens
}

function evaluate(node, row, path) {
  if (node.number !== undefined) return node.number
  if (node.field !== undefined) {
    const value = row[node.field]
    if (value === undefined || value === null) return 0
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new QueryError(ERROR_CODES.NOT_A_NUMBER, path, `${node.field} holds ${JSON.stringify(value)}, which is not a number`)
    }
    return value
  }
  if (node.operator === 'negate') return -evaluate(node.operand, row, path)
  const left = evaluate(node.left, row, path)
  const right = evaluate(node.right, row, path)
  if (node.operator === '+') return left + right
  if (node.operator === '-') return left - right
  if (node.operator === '*') return left * right
  if (right === 0) throw new QueryError(ERROR_CODES.DIVISION_BY_ZERO, path, 'a computed field divides by zero')
  return left / right
}
