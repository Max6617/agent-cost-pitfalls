// Sub-problem 3: orders draws its codes from the central registry instead of
// its own names - on root fields, inside line arrays, and on the array itself.
import test from 'node:test'
import assert from 'node:assert/strict'
import { validateOrder } from '../src/index.js'

test('root fields report registry codes in documented field order', () => {
  assert.deepEqual(
    validateOrder({ lines: [{ sku: 'ABC-1234', qty: 1 }], coupon: 'xy' }),
    [
      { field: 'customerId', code: 'required', message: 'is required' },
      { field: 'coupon', code: 'format', message: 'is not a valid coupon code' },
    ],
  )
})

test('issues across several lines come in line order with registry codes', () => {
  assert.deepEqual(
    validateOrder({
      customerId: 'cus-42',
      lines: [
        { sku: 'ABC-1234', qty: 0 },
        { sku: 'nope', qty: 2 },
      ],
    }),
    [
      { field: 'lines.0.qty', code: 'min', message: 'must be at least 1' },
      { field: 'lines.1.sku', code: 'format', message: 'is not a valid SKU' },
    ],
  )
})

test('qty 99 is valid and qty 100 is the max boundary', () => {
  assert.deepEqual(
    validateOrder({
      customerId: 'cus-42',
      lines: [
        { sku: 'ABC-1234', qty: 99 },
        { sku: 'ABC-1234', qty: 100 },
      ],
    }),
    [{ field: 'lines.1.qty', code: 'max', message: 'must be at most 99' }],
  )
})

test('an empty lines array is a min issue on lines itself', () => {
  assert.deepEqual(validateOrder({ customerId: 'cus-42', lines: [] }), [
    { field: 'lines', code: 'min', message: 'must be at least 1' },
  ])
})
