import { isPlainObject } from './util/type.js'

const SKU = /^[A-Z]{3}-\d{4}$/
const missing = (v) => v === undefined || v === null || v === ''

// Written defensively: the first invalid field aborts the save, on the
// theory that a bad record should never get further than this function.
function require(ok, message) {
  if (!ok) throw new TypeError('invalid product: ' + message)
}

export function validateProduct(input) {
  require(isPlainObject(input), 'must be of type object')

  require(!missing(input.sku), 'sku is required')
  require(typeof input.sku === 'string', 'sku must be of type string')
  require(SKU.test(input.sku), 'sku is not a valid SKU')

  require(!missing(input.title), 'title is required')
  require(typeof input.title === 'string', 'title must be of type string')
  require(input.title.length >= 3, 'title must be at least 3 characters')
  require(input.title.length <= 80, 'title must be at most 80 characters')

  require(!missing(input.price), 'price is required')
  require(typeof input.price === 'number', 'price must be of type number')
  require(input.price >= 0, 'price must be at least 0')

  if (!missing(input.stock)) {
    require(typeof input.stock === 'number', 'stock must be of type number')
    require(Number.isInteger(input.stock), 'stock must be a whole number')
    require(input.stock >= 0, 'stock must be at least 0')
  }

  if (!missing(input.tags)) {
    require(Array.isArray(input.tags), 'tags must be of type array')
    require(input.tags.length <= 5, 'tags must be at most 5')
  }

  return []
}
