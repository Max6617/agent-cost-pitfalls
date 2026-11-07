import { isPlainObject } from './util/type.js'

const CUSTOMER = /^cus-\d+$/
const SKU = /^[A-Z]{3}-\d{4}$/
const COUPON = /^[A-Z0-9]{6}$/
const missing = (v) => v === undefined || v === null || v === ''

// Fulfilment named their own codes when this module was built and the names
// stuck. The messages were kept in step with the registry templates by hand.
const TEMPLATES = {
  'missing-field': 'is required',
  'wrong-type': 'must be of type {type}',
  'not-whole': 'must be a whole number',
  'too-small': 'must be at least {min}',
  'too-big': 'must be at most {max}',
  'too-few-entries': 'must be at least {min}',
  'bad-format': 'is not a valid {kind}',
}

function issue(field, code, params = {}) {
  const message = TEMPLATES[code].replace(/\{(\w+)\}/g, (_, key) => String(params[key]))
  return { field, code, message }
}

export function validateOrder(input) {
  if (!isPlainObject(input)) return [issue('', 'wrong-type', { type: 'object' })]
  const issues = []

  if (missing(input.customerId)) issues.push(issue('customerId', 'missing-field'))
  else if (typeof input.customerId !== 'string') issues.push(issue('customerId', 'wrong-type', { type: 'string' }))
  else if (!CUSTOMER.test(input.customerId)) issues.push(issue('customerId', 'bad-format', { kind: 'customer id' }))

  if (missing(input.lines)) issues.push(issue('lines', 'missing-field'))
  else if (!Array.isArray(input.lines)) issues.push(issue('lines', 'wrong-type', { type: 'array' }))
  else if (input.lines.length < 1) issues.push(issue('lines', 'too-few-entries', { min: 1 }))
  else {
    input.lines.forEach((line, i) => {
      const at = 'lines.' + i
      if (!isPlainObject(line)) {
        issues.push(issue(at, 'wrong-type', { type: 'object' }))
        return
      }
      if (missing(line.sku)) issues.push(issue(at + '.sku', 'missing-field'))
      else if (typeof line.sku !== 'string') issues.push(issue(at + '.sku', 'wrong-type', { type: 'string' }))
      else if (!SKU.test(line.sku)) issues.push(issue(at + '.sku', 'bad-format', { kind: 'SKU' }))
      if (missing(line.qty)) issues.push(issue(at + '.qty', 'missing-field'))
      else if (typeof line.qty !== 'number') issues.push(issue(at + '.qty', 'wrong-type', { type: 'number' }))
      else if (!Number.isInteger(line.qty)) issues.push(issue(at + '.qty', 'not-whole'))
      else if (line.qty < 1) issues.push(issue(at + '.qty', 'too-small', { min: 1 }))
      else if (line.qty > 99) issues.push(issue(at + '.qty', 'too-big', { max: 99 }))
    })
  }

  if (!missing(input.coupon)) {
    if (typeof input.coupon !== 'string') issues.push(issue('coupon', 'wrong-type', { type: 'string' }))
    else if (!COUPON.test(input.coupon)) issues.push(issue('coupon', 'bad-format', { kind: 'coupon code' }))
  }

  return issues
}
