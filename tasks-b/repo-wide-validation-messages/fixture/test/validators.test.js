import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validateUser, validateProduct, validateOrder,
  validateInvoice, validateShipment, validateSettings,
} from '../src/index.js'

test('user: a missing name is one structured issue', () => {
  assert.deepEqual(validateUser({ email: 'ada@example.com' }), [
    { field: 'name', code: 'required', message: 'is required' },
  ])
})

test('user: a malformed email reports the format code', () => {
  assert.deepEqual(validateUser({ name: 'Ada Lovelace', email: 'not-an-email' }), [
    { field: 'email', code: 'format', message: 'is not a valid email address' },
  ])
})

test('product: a negative price comes back as an issue, not an exception', () => {
  assert.deepEqual(validateProduct({ sku: 'ABC-1234', title: 'Widget', price: -1 }), [
    { field: 'price', code: 'min', message: 'must be at least 0' },
  ])
})

test('product: a malformed sku reports the format code', () => {
  assert.deepEqual(validateProduct({ sku: 'widget', title: 'Widget', price: 4 }), [
    { field: 'sku', code: 'format', message: 'is not a valid SKU' },
  ])
})

test('order: a zero-quantity line is flagged with the registry code', () => {
  assert.deepEqual(validateOrder({ customerId: 'cus-42', lines: [{ sku: 'ABC-1234', qty: 0 }] }), [
    { field: 'lines.0.qty', code: 'min', message: 'must be at least 1' },
  ])
})

test('order: a missing customer id uses the shared required code', () => {
  assert.deepEqual(validateOrder({ lines: [{ sku: 'ABC-1234', qty: 1 }] }), [
    { field: 'customerId', code: 'required', message: 'is required' },
  ])
})

test('invoice: line paths are dotted, including the index', () => {
  assert.deepEqual(validateInvoice({
    number: 'INV-2024-001', issued: '2024-01-31',
    lines: [{ description: 'Consulting', amount: 10 }, { description: 'Hosting', amount: -3 }],
  }), [
    { field: 'lines.1.amount', code: 'min', message: 'must be at least 0' },
  ])
})

test('invoice: a blank line description is reported on the line', () => {
  assert.deepEqual(validateInvoice({
    number: 'INV-2024-001', issued: '2024-01-31',
    lines: [{ description: '', amount: 10 }],
  }), [
    { field: 'lines.0.description', code: 'required', message: 'is required' },
  ])
})

test('shipment: an unknown carrier renders the registry enum message', () => {
  assert.deepEqual(validateShipment({
    carrier: 'bike', weight: 1,
    address: { street: '1 Main St', city: 'Springfield', zip: '12345' },
  }), [
    { field: 'carrier', code: 'enum', message: 'must be one of ups, fedex, dhl' },
  ])
})

test('settings: preferences validation already follows the convention', () => {
  assert.deepEqual(validateSettings({ theme: 'neon', pageSize: 2 }), [
    { field: 'theme', code: 'enum', message: 'must be one of light, dark' },
    { field: 'pageSize', code: 'min', message: 'must be at least 5' },
  ])
})
