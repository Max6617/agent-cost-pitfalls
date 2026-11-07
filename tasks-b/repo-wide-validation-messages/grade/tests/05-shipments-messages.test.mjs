// Sub-problem 5: shipments renders its messages from the registry templates
// instead of its own wording - codes and paths already follow the convention.
import test from 'node:test'
import assert from 'node:assert/strict'
import { validateShipment } from '../src/index.js'

const ADDRESS = { street: '1 Main St', city: 'Springfield', zip: '12345' }

test('an over-weight parcel renders the registry max message', () => {
  assert.deepEqual(
    validateShipment({ carrier: 'ups', weight: 71, address: ADDRESS }),
    [{ field: 'weight', code: 'max', message: 'must be at most 70' }],
  )
})

test('a short tracking number renders the registry min-length message', () => {
  assert.deepEqual(
    validateShipment({ carrier: 'ups', tracking: 'AB12', weight: 1, address: ADDRESS }),
    [{ field: 'tracking', code: 'min-length', message: 'must be at least 8 characters' }],
  )
})

test('a bad zip inside the nested address renders the registry format message', () => {
  assert.deepEqual(
    validateShipment({ carrier: 'ups', weight: 1, address: { street: '1 Main St', city: 'Springfield', zip: '1234' } }),
    [{ field: 'address.zip', code: 'format', message: 'is not a valid zip code' }],
  )
})

test('several bad fields come in documented order with rendered messages', () => {
  assert.deepEqual(
    validateShipment({ carrier: 'DHL', weight: -2, address: { street: '', city: 'X', zip: '12345' } }),
    [
      { field: 'carrier', code: 'enum', message: 'must be one of ups, fedex, dhl' },
      { field: 'weight', code: 'min', message: 'must be at least 0' },
      { field: 'address.street', code: 'required', message: 'is required' },
    ],
  )
})
