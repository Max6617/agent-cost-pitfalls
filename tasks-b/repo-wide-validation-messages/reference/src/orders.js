import { issue } from './registry.js'
import { isPlainObject } from './util/type.js'

const CUSTOMER = /^cus-\d+$/
const SKU = /^[A-Z]{3}-\d{4}$/
const COUPON = /^[A-Z0-9]{6}$/
const missing = (v) => v === undefined || v === null || v === ''

export function validateOrder(input) {
  if (!isPlainObject(input)) return [issue('', 'type', { type: 'object' })]
  const issues = []

  if (missing(input.customerId)) issues.push(issue('customerId', 'required'))
  else if (typeof input.customerId !== 'string') issues.push(issue('customerId', 'type', { type: 'string' }))
  else if (!CUSTOMER.test(input.customerId)) issues.push(issue('customerId', 'format', { kind: 'customer id' }))

  if (missing(input.lines)) issues.push(issue('lines', 'required'))
  else if (!Array.isArray(input.lines)) issues.push(issue('lines', 'type', { type: 'array' }))
  else if (input.lines.length < 1) issues.push(issue('lines', 'min', { min: 1 }))
  else {
    input.lines.forEach((line, i) => {
      const at = 'lines.' + i
      if (!isPlainObject(line)) {
        issues.push(issue(at, 'type', { type: 'object' }))
        return
      }
      if (missing(line.sku)) issues.push(issue(at + '.sku', 'required'))
      else if (typeof line.sku !== 'string') issues.push(issue(at + '.sku', 'type', { type: 'string' }))
      else if (!SKU.test(line.sku)) issues.push(issue(at + '.sku', 'format', { kind: 'SKU' }))
      if (missing(line.qty)) issues.push(issue(at + '.qty', 'required'))
      else if (typeof line.qty !== 'number') issues.push(issue(at + '.qty', 'type', { type: 'number' }))
      else if (!Number.isInteger(line.qty)) issues.push(issue(at + '.qty', 'integer'))
      else if (line.qty < 1) issues.push(issue(at + '.qty', 'min', { min: 1 }))
      else if (line.qty > 99) issues.push(issue(at + '.qty', 'max', { max: 99 }))
    })
  }

  if (!missing(input.coupon)) {
    if (typeof input.coupon !== 'string') issues.push(issue('coupon', 'type', { type: 'string' }))
    else if (!COUPON.test(input.coupon)) issues.push(issue('coupon', 'format', { kind: 'coupon code' }))
  }

  return issues
}
