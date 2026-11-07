// Cross-cutting: the convention holds across every module at once - the
// compliant settings module stays compliant, valid input passes everywhere,
// and every issue any validator emits is a three-key object with a registry
// code.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CODES, validateUser, validateProduct, validateOrder,
  validateInvoice, validateShipment, validateSettings,
} from '../src/index.js'

test('settings reports theme, pageSize and nested notifications per the convention', () => {
  assert.deepEqual(
    validateSettings({ theme: 'neon', pageSize: 2, notifications: { email: 'yes' } }),
    [
      { field: 'theme', code: 'enum', message: 'must be one of light, dark' },
      { field: 'pageSize', code: 'min', message: 'must be at least 5' },
      { field: 'notifications.email', code: 'type', message: 'must be of type boolean' },
    ],
  )
})

test('a fully valid record of every kind validates to no issues', () => {
  assert.deepEqual(validateUser({ name: 'Ada Lovelace', email: 'ada@example.com', age: 36, address: { city: 'London', zip: '12345' } }), [])
  assert.deepEqual(validateProduct({ sku: 'ABC-1234', title: 'Widget', price: 9.99, stock: 3, tags: ['new'] }), [])
  assert.deepEqual(validateOrder({ customerId: 'cus-42', lines: [{ sku: 'ABC-1234', qty: 2 }], coupon: 'SAVE10' }), [])
  assert.deepEqual(validateInvoice({ number: 'INV-2024-001', issued: '2024-01-31', due: '2024-02-29', lines: [{ description: 'Consulting', amount: 100 }] }), [])
  assert.deepEqual(validateShipment({ carrier: 'ups', tracking: '1Z999AA10123456784', weight: 2.5, address: { street: '1 Main St', city: 'Springfield', zip: '12345' } }), [])
  assert.deepEqual(validateSettings({ theme: 'dark', pageSize: 20, notifications: { email: true, sms: false } }), [])
})

test('every issue every validator emits is a three-key object with a registry code', () => {
  const badInputs = {
    user: [validateUser, { name: 'A', email: 'bad' }],
    product: [validateProduct, { sku: 'bad', title: 'W', price: -1 }],
    order: [validateOrder, { customerId: 'x', lines: [{ sku: 'bad', qty: 0 }] }],
    invoice: [validateInvoice, { number: 'x', issued: 'bad', lines: [] }],
    shipment: [validateShipment, { carrier: 'x', weight: -1, address: { street: '', city: '', zip: 'bad' } }],
    settings: [validateSettings, { theme: 'x', pageSize: 1, notifications: { email: 'y' } }],
  }
  for (const [name, [validate, input]] of Object.entries(badInputs)) {
    const issues = validate(input)
    assert.ok(Array.isArray(issues) && issues.length > 0, name + ' should report issues')
    for (const it of issues) {
      assert.ok(it !== null && typeof it === 'object' && !Array.isArray(it), name + ' issue is an object')
      assert.deepEqual(Object.keys(it).sort(), ['code', 'field', 'message'], name + ' issue keys')
      assert.ok(Object.hasOwn(CODES, it.code), name + ' code ' + it.code + ' is in the registry')
      assert.equal(typeof it.field, 'string', name + ' field is a string')
      assert.equal(typeof it.message, 'string', name + ' message is a string')
      assert.ok(it.message.length > 0, name + ' message is not empty')
    }
  }
})
