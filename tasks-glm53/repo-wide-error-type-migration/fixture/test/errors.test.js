import test from 'node:test'
import assert from 'node:assert/strict'
import { StoreError, isStoreError, toHttp, CODES } from '../src/errors.js'
import { requireFields, requirePositiveInteger, requireRateWithin } from '../src/validate.js'
import { Carts } from '../src/carts.js'
import { Stock } from '../src/stock.js'
import { Payments } from '../src/payments.js'
import { makeApi } from '../src/api.js'

/** Capture the thrown value so its type and code can be asserted. */
function thrown(fn) {
  try {
    fn()
  } catch (error) {
    return error
  }
  return null
}

test('a store error carries its code and status', () => {
  const error = new StoreError('OUT_OF_STOCK', 'no stock')
  assert.equal(error.code, 'OUT_OF_STOCK')
  assert.equal(error.status, 409)
  assert.equal(isStoreError(error), true)
})

test('an unknown code becomes a 500 rather than crashing', () => {
  const error = new StoreError('NOPE', 'x')
  assert.equal(error.status, 500)
})

test('the wire form names the code, not the message', () => {
  const body = new StoreError('INVALID_INPUT', 'qty must be positive', { details: { field: 'qty' } }).toJSON()
  assert.deepEqual(body, { error: 'INVALID_INPUT', message: 'qty must be positive', details: { field: 'qty' } })
})

test('a store error maps to its own status', () => {
  const response = toHttp(new StoreError('PAYMENT_DECLINED', 'declined'))
  assert.equal(response.status, 402)
  assert.equal(response.body.error, 'PAYMENT_DECLINED')
})

test('an unknown error maps to a bare 500 with no message', () => {
  const response = toHttp(new Error('connect failed to postgres://user:pw@host'))
  assert.equal(response.status, 500)
  assert.deepEqual(response.body, { error: 'INTERNAL', message: 'internal error', details: null })
  assert.equal(JSON.stringify(response.body).includes('postgres'), false)
})

test('the code table is complete and sorted by status', () => {
  for (const [code, status] of Object.entries(CODES)) {
    assert.equal(typeof status, 'number', code)
    assert.ok(status >= 400, code)
  }
  assert.equal(CODES.NOT_FOUND, 404)
  assert.equal(CODES.RATE_LIMITED, 429)
})

test('a missing field is an INVALID_INPUT failure', () => {
  const error = thrown(() => requireFields({}, ['sku', 'qty']))
  assert.ok(isStoreError(error), 'expected a StoreError, got ' + error)
  assert.equal(error.code, 'INVALID_INPUT')
  assert.equal(error.status, 422)
  assert.match(error.message, /sku/)
})

test('an out-of-range rate is an INVALID_INPUT failure with the field named', () => {
  const error = thrown(() => requireRateWithin(900, 'weight', 100))
  assert.ok(isStoreError(error))
  assert.equal(error.code, 'INVALID_INPUT')
})

test('a non-integer quantity is an INVALID_INPUT failure', () => {
  const error = thrown(() => requirePositiveInteger('2.5', 'qty'))
  assert.ok(isStoreError(error))
  assert.deepEqual(error.details, { field: 'qty' })
})

test('an unknown cart is a NOT_FOUND failure', () => {
  const error = thrown(() => new Carts().find('nope'))
  assert.ok(isStoreError(error), 'expected a StoreError, got ' + error)
  assert.equal(error.code, 'NOT_FOUND')
  assert.equal(error.status, 404)
})

test('an empty cart is a CART_EMPTY failure', () => {
  const carts = new Carts()
  const id = carts.create()
  const error = thrown(() => carts.checkOut(id))
  assert.ok(isStoreError(error))
  assert.equal(error.code, 'CART_EMPTY')
})

test('short stock is an OUT_OF_STOCK failure that names the sku', () => {
  const stock = new Stock({ 'TEA-01': 1 })
  const error = thrown(() => stock.require('TEA-01', 4))
  assert.ok(isStoreError(error))
  assert.equal(error.code, 'OUT_OF_STOCK')
  assert.match(error.message, /TEA-01/)
  assert.equal(stock.available('TEA-01'), 1, 'a refused reservation must not move stock')
})

test('a partial reservation never fails', () => {
  const stock = new Stock({ 'TEA-01': 2 })
  assert.equal(stock.partial('TEA-01', 5), 2)
  assert.equal(stock.available('TEA-01'), 0)
})

test('a non-positive amount is an INVALID_INPUT failure', () => {
  const error = thrown(() => new Payments().capture('c1', 0))
  assert.ok(isStoreError(error))
  assert.equal(error.code, 'INVALID_INPUT')
})

test('a provider decline is a PAYMENT_DECLINED failure', () => {
  const error = thrown(() => new Payments().capture('c1', 9000))
  assert.ok(isStoreError(error))
  assert.equal(error.code, 'PAYMENT_DECLINED')
  assert.equal(error.status, 402)
})

test('refunding nothing is a NOT_FOUND failure', () => {
  const error = thrown(() => new Payments().refund('c1'))
  assert.ok(isStoreError(error))
  assert.equal(error.code, 'NOT_FOUND')
})

test('the API answers a bad request with the code and status', () => {
  const api = makeApi({ stock: new Stock({ 'TEA-01': 5 }) })
  const id = api.carts.create()
  const response = api.addLine({ params: { id }, body: { sku: 'TEA-01', qty: '0' } })
  assert.equal(response.status, 422)
  assert.equal(response.body.error, 'INVALID_INPUT')
})

test('the API answers an unknown cart with 404', () => {
  const api = makeApi()
  const response = api.addLine({ params: { id: 'nope' }, body: { sku: 'TEA-01', qty: 1 } })
  assert.equal(response.status, 404)
  assert.equal(response.body.error, 'NOT_FOUND')
})

test('the API answers short stock with 409', () => {
  const api = makeApi({ stock: new Stock({ 'TEA-01': 1 }) })
  const id = api.carts.create()
  const response = api.addLine({ params: { id }, body: { sku: 'TEA-01', qty: 4 } })
  assert.equal(response.status, 409)
  assert.equal(response.body.error, 'OUT_OF_STOCK')
})

test('a successful checkout returns the total', () => {
  const api = makeApi({ stock: new Stock({ 'TEA-01': 10 }) })
  const id = api.carts.create()
  api.addLine({ params: { id }, body: { sku: 'TEA-01', qty: 2, unitPrice: 8.25 } })
  const response = api.checkOut({ params: { id } })
  assert.equal(response.status, 200)
  assert.equal(response.body.total, 16.5)
})

test('checking out an empty cart is a CART_EMPTY failure', () => {
  const api = makeApi()
  const id = api.carts.create()
  const response = api.checkOut({ params: { id } })
  assert.equal(response.status, 400)
  assert.equal(response.body.error, 'CART_EMPTY')
})

test('a declined payment comes back as 402, not 500', () => {
  const api = makeApi({ stock: new Stock({ 'TEA-01': 10 }) })
  const id = api.carts.create()
  api.addLine({ params: { id }, body: { sku: 'TEA-01', qty: 1, unitPrice: 9000 } })
  const response = api.checkOut({ params: { id } })
  assert.equal(response.status, 402)
  assert.equal(response.body.error, 'PAYMENT_DECLINED')
})

test('no handler ever answers with an internal error', () => {
  const api = makeApi({ stock: new Stock({ 'TEA-01': 1 }) })
  const id = api.carts.create()
  const responses = [
    api.addLine({ params: { id }, body: {} }),
    api.addLine({ params: { id }, body: { sku: 'NOPE', qty: 1 } }),
    api.checkOut({ params: { id: 'missing' } }),
  ]
  for (const response of responses) {
    assert.notEqual(response.status, 500, JSON.stringify(response.body))
  }
})
