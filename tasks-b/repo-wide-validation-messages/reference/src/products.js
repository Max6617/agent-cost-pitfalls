import { issue } from './registry.js'
import { isPlainObject } from './util/type.js'

const SKU = /^[A-Z]{3}-\d{4}$/
const missing = (v) => v === undefined || v === null || v === ''

export function validateProduct(input) {
  if (!isPlainObject(input)) return [issue('', 'type', { type: 'object' })]
  const issues = []

  if (missing(input.sku)) issues.push(issue('sku', 'required'))
  else if (typeof input.sku !== 'string') issues.push(issue('sku', 'type', { type: 'string' }))
  else if (!SKU.test(input.sku)) issues.push(issue('sku', 'format', { kind: 'SKU' }))

  if (missing(input.title)) issues.push(issue('title', 'required'))
  else if (typeof input.title !== 'string') issues.push(issue('title', 'type', { type: 'string' }))
  else if (input.title.length < 3) issues.push(issue('title', 'min-length', { min: 3 }))
  else if (input.title.length > 80) issues.push(issue('title', 'max-length', { max: 80 }))

  if (missing(input.price)) issues.push(issue('price', 'required'))
  else if (typeof input.price !== 'number') issues.push(issue('price', 'type', { type: 'number' }))
  else if (input.price < 0) issues.push(issue('price', 'min', { min: 0 }))

  if (!missing(input.stock)) {
    if (typeof input.stock !== 'number') issues.push(issue('stock', 'type', { type: 'number' }))
    else if (!Number.isInteger(input.stock)) issues.push(issue('stock', 'integer'))
    else if (input.stock < 0) issues.push(issue('stock', 'min', { min: 0 }))
  }

  if (!missing(input.tags)) {
    if (!Array.isArray(input.tags)) issues.push(issue('tags', 'type', { type: 'array' }))
    else if (input.tags.length > 5) issues.push(issue('tags', 'max', { max: 5 }))
  }

  return issues
}
