// Sub-problem 2: products never throws for input errors and collects every
// issue instead of stopping at the first bad field.
import test from 'node:test'
import assert from 'node:assert/strict'
import { validateProduct } from '../src/index.js'

test('several bad fields come back together, in documented field order', () => {
  assert.deepEqual(validateProduct({ sku: 'bad', title: '', price: -1 }), [
    { field: 'sku', code: 'format', message: 'is not a valid SKU' },
    { field: 'title', code: 'required', message: 'is required' },
    { field: 'price', code: 'min', message: 'must be at least 0' },
  ])
})

test('an input that is not an object at all is one root issue, not an exception', () => {
  assert.deepEqual(validateProduct(null), [
    { field: '', code: 'type', message: 'must be of type object' },
  ])
})

test('boundary values - zero price, zero stock, five tags - are valid', () => {
  assert.deepEqual(
    validateProduct({ sku: 'ABC-1234', title: 'Widget', price: 0, stock: 0, tags: ['a', 'b', 'c', 'd', 'e'] }),
    [],
  )
})

test('a sixth tag is a max issue on the array', () => {
  assert.deepEqual(
    validateProduct({ sku: 'ABC-1234', title: 'Widget', price: 1, tags: ['a', 'b', 'c', 'd', 'e', 'f'] }),
    [{ field: 'tags', code: 'max', message: 'must be at most 5' }],
  )
})
