/**
 * The one error type this engine raises.
 *
 * Everything a query gets wrong - an operator nobody defined, a limit that is
 * not a whole number, a sum over a column of text - comes back as a QueryError
 * carrying the `code` from the specification's table and the `path` of the part
 * of the document that is wrong. Callers report the path straight to the user,
 * so it has to point at the offending node and not at the query as a whole.
 */
export const ERROR_CODES = Object.freeze({
  UNKNOWN_KEY: 'unknown-key',
  BAD_SHAPE: 'bad-shape',
  UNKNOWN_OPERATOR: 'unknown-operator',
  UNKNOWN_AGGREGATE: 'unknown-aggregate',
  BAD_DIRECTION: 'bad-direction',
  BAD_INTEGER: 'bad-integer',
  NOT_A_NUMBER: 'not-a-number',
  DIVISION_BY_ZERO: 'division-by-zero',
})

export class QueryError extends Error {
  constructor(code, path, message) {
    super(message)
    this.name = 'QueryError'
    this.code = code
    this.path = path
  }
}

export function unknownKey(path, key) {
  return new QueryError(ERROR_CODES.UNKNOWN_KEY, path, `${key} is not a key of this document`)
}

export function badShape(path, message) {
  return new QueryError(ERROR_CODES.BAD_SHAPE, path, message)
}
