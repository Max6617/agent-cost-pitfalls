/**
 * The error type this package throws.
 *
 * `code` is the machine-readable half: callers switch on it and the gateway
 * turns it into a 4xx without parsing the message. `details` are copied onto
 * the error so a caller can read them directly.
 */
export class AuthzError extends Error {
  constructor(code, message, details = {}) {
    super(message)
    this.name = 'AuthzError'
    this.code = code
    Object.assign(this, details)
  }
}

export function cycleError(cycle) {
  return new AuthzError('cycle', 'policy graph contains a cycle: ' + cycle.join(' -> '), { cycle })
}

export function unknownSubject(subjectId) {
  return new AuthzError('unknown-subject', 'no subject with id ' + JSON.stringify(subjectId))
}

export function badRule(rule) {
  return new AuthzError('bad-rule', 'a rule needs an id and a role: ' + JSON.stringify(rule))
}
