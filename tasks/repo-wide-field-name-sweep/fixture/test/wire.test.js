import test from 'node:test'
import assert from 'node:assert/strict'
import { toCamel, toSnake, renameKeys, toWire, fromWire, toWireShallow } from '../src/wire.js'
import { cartPayload, cartSummary, emptyCart } from '../src/carts.js'
import { invoicePayload, invoiceSummary, invoiceLine } from '../src/invoices.js'
import { customerPayload, customerSummary, customerOption } from '../src/customers.js'
import { productHit, searchResponse, facets } from '../src/search.js'

/** Does this object have any snake_case key anywhere? */
function hasSnakeKey(value) {
  if (Array.isArray(value)) return value.some(hasSnakeKey)
  if (value === null || typeof value !== 'object') return false
  return Object.entries(value).some(([key, nested]) => key.includes('_') || hasSnakeKey(nested))
}

const CART_ROW = {
  id: 'c1',
  customer_id: 'u1',
  line_total: 30.5,
  checked_out_at: null,
  lines: [{ sku: 'TEA-01', qty: 2, unit_price: 8.25 }],
}

const INVOICE_ROW = {
  id: 'i1',
  order_id: 'o1',
  issued_at: '2026-03-04T05:06:07.000Z',
  amount_due: 12.5,
  currency_code: 'USD',
  lines: [{ sku: 'TEA-01', qty: 1, unit_price: 12.5 }],
}

const CUSTOMER_ROW = {
  id: 'u1',
  email_address: 'ada@example.com',
  display_name: 'Ada',
  lifetime_spend: 1200,
  created_at: '2026-01-01T00:00:00.000Z',
  default_address: { line_one: '1 High Street', post_code: 'AB1 2CD', country_code: 'GB' },
}

test('a snake_case key becomes camelCase', () => {
  assert.equal(toCamel('line_total'), 'lineTotal')
  assert.equal(toCamel('LINE_TOTAL'), 'lineTotal')
  assert.equal(toCamel('line-total'), 'lineTotal')
  assert.equal(toCamel('id'), 'id')
})

test('a camelCase key becomes snake_case', () => {
  assert.equal(toSnake('lineTotal'), 'line_total')
  assert.equal(toSnake('id'), 'id')
  assert.equal(toSnake('amountDueInCents'), 'amount_due_in_cents')
})

test('renaming walks nested objects and arrays', () => {
  const renamed = renameKeys({ a_b: { c_d: 1 }, list: [{ e_f: 2 }] }, toCamel)
  assert.deepEqual(renamed, { aB: { cD: 1 }, list: [{ eF: 2 }] })
})

test('renaming leaves values alone', () => {
  const renamed = toWire({ created_at: 'x', nested_thing: [1, 2] })
  assert.deepEqual(renamed, { createdAt: 'x', nestedThing: [1, 2] })
})

test('the shallow form does not touch nested keys', () => {
  assert.deepEqual(toWireShallow({ created_at: 'x', nested: { a_b: 1 } }), { createdAt: 'x', nested: { a_b: 1 } })
})

test('a wire payload survives a round trip through storage naming', () => {
  const wire = toWire(CART_ROW)
  assert.deepEqual(fromWire(wire), CART_ROW)
})

test('the cart payload has no snake_case keys anywhere', () => {
  assert.equal(hasSnakeKey(cartPayload(CART_ROW)), false)
  assert.equal(hasSnakeKey(cartSummary(CART_ROW)), false)
  assert.equal(hasSnakeKey(emptyCart('c1')), false)
})

test('the cart payload keeps its values', () => {
  const payload = cartPayload(CART_ROW)
  assert.equal(payload.lineTotal, 30.5)
  assert.equal(payload.customerId, 'u1')
  assert.deepEqual(payload.lines, [{ sku: 'TEA-01', qty: 2, unitPrice: 8.25 }])
  assert.equal(payload.checkedOutAt, null)
})

test('the invoice payload is camelCase throughout', () => {
  assert.equal(hasSnakeKey(invoicePayload(INVOICE_ROW)), false)
  assert.equal(hasSnakeKey(invoiceSummary(INVOICE_ROW)), false)
  assert.equal(hasSnakeKey(invoiceLine(INVOICE_ROW.lines[0])), false)
})

test('the invoice line computes its own total', () => {
  assert.equal(invoiceLine({ sku: 'TEA-01', qty: 3, unit_price: 2 }).lineTotal, 6)
})

test('the customer payload renames the nested address too', () => {
  const payload = customerPayload(CUSTOMER_ROW)
  assert.equal(hasSnakeKey(payload), false)
  assert.deepEqual(payload.defaultAddress, { lineOne: '1 High Street', postCode: 'AB1 2CD', countryCode: 'GB' })
  assert.equal(payload.lifetimeSpend, 1200)
})

test('a customer without an address keeps the null', () => {
  assert.equal(customerPayload({ ...CUSTOMER_ROW, default_address: null }).defaultAddress, null)
})

test('every customer shape is camelCase', () => {
  assert.equal(hasSnakeKey(customerSummary(CUSTOMER_ROW)), false)
  assert.equal(hasSnakeKey(customerOption(CUSTOMER_ROW)), false)
})

test('the search response is camelCase, hits included', () => {
  const response = searchResponse([{ sku: 'TEA-01', display_name: 'Tea', unit_price: 8.25, in_stock: true }], 4)
  assert.equal(hasSnakeKey(response), false)
  assert.equal(response.totalHits, 1)
  assert.equal(response.tookMs, 4)
  assert.equal(response.hits[0].unitPrice, 8.25)
})

test('a search hit is camelCase on its own', () => {
  assert.equal(hasSnakeKey(productHit({ sku: 'a', display_name: 'b', unit_price: 1, in_stock: false })), false)
})

test('facets are camelCase', () => {
  assert.equal(hasSnakeKey(facets({ tea: 2 })), false)
})

test('every module in the app names its fields the same way', () => {
  const payloads = [
    cartPayload(CART_ROW),
    cartSummary(CART_ROW),
    emptyCart('c1'),
    invoicePayload(INVOICE_ROW),
    invoiceSummary(INVOICE_ROW),
    invoiceLine(INVOICE_ROW.lines[0]),
    customerPayload(CUSTOMER_ROW),
    customerSummary(CUSTOMER_ROW),
    customerOption(CUSTOMER_ROW),
    productHit({ sku: 'a', display_name: 'b', unit_price: 1, in_stock: false }),
    searchResponse([], 0),
  ]
  for (const payload of payloads) {
    assert.equal(hasSnakeKey(payload), false, JSON.stringify(payload))
  }
})
