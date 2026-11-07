// The central registry every validator draws its codes and messages from.
// The key order of CODES is the check order: when several checks fail on one
// field, the first one in this order is the one that gets reported.
export const CODES = Object.freeze({
  required: 'is required',
  type: 'must be of type {type}',
  integer: 'must be a whole number',
  min: 'must be at least {min}',
  max: 'must be at most {max}',
  'min-length': 'must be at least {min} characters',
  'max-length': 'must be at most {max} characters',
  format: 'is not a valid {kind}',
  enum: 'must be one of {values}',
})

// Renders the template registered for `code`. An array-valued placeholder is
// joined with ', '. An unknown code is a programming error, not an input
// error, so it throws.
export function messageFor(code, params = {}) {
  const template = CODES[code]
  if (template === undefined) throw new RangeError('unknown validation code: ' + code)
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = Array.isArray(params[key]) ? params[key].join(', ') : params[key]
    return String(value)
  })
}

// One issue, in the shape every validator returns.
export function issue(field, code, params) {
  return { field, code, message: messageFor(code, params) }
}
