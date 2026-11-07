// Sub-problem 2: idempotency keys apply once, ever - including when what arrives
// twice is a reversal, and including which of two entries sharing a key wins.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createLedger } from '../src/index.js'

const entry = (id, seq, date, value, extra = {}) => ({
  id, seq, effectiveDate: date, account: '4100', kind: 'charge',
  amount: { currency: 'USD', value }, ...extra,
})
const reversal = (id, seq, date, reverses) => ({
  id, seq, effectiveDate: date, account: '4100', kind: 'reversal',
  reverses, amount: { currency: 'USD', value: '0' },
})

test('a repeated key is refused even with other entries in between', () => {
  const ledger = createLedger()
  const results = ledger.postAll([
    entry('m-1', 1, '2024-01-02', '10.00', { idempotencyKey: 'imp#1' }),
    entry('m-2', 2, '2024-01-03', '3.00', { idempotencyKey: 'imp#2' }),
    entry('m-3', 3, '2024-01-04', '999.00', { idempotencyKey: 'imp#1' }),
  ])
  assert.deepEqual(results.map((r) => r.status), ['applied', 'applied', 'duplicate'])
  assert.equal(ledger.balance('4100'), '13.00')
})

test('a key that arrives again in a later batch is refused', () => {
  const ledger = createLedger()
  ledger.postAll([
    entry('b-1', 1, '2024-01-02', '10.00', { idempotencyKey: 'imp#a' }),
    entry('b-2', 2, '2024-01-03', '20.00', { idempotencyKey: 'imp#b' }),
  ])
  const second = ledger.postAll([
    entry('b-3', 3, '2024-01-04', '5.00', { idempotencyKey: 'imp#c' }),
    entry('b-1-retry', 4, '2024-01-09', '10.00', { idempotencyKey: 'imp#a' }),
  ])
  assert.deepEqual(second.map((r) => r.status), ['applied', 'duplicate'])
  assert.equal(ledger.balance('4100'), '35.00')
})

test('when two entries share a key the canonically first one is the one applied', () => {
  const ledger = createLedger()
  ledger.postAll([
    entry('k-late', 1, '2024-01-20', '10.00', { idempotencyKey: 'imp#7' }),
    entry('k-early', 5, '2024-01-05', '99.00', { idempotencyKey: 'imp#7' }),
  ])
  assert.equal(ledger.statusOf('k-early'), 'applied')
  assert.equal(ledger.statusOf('k-late'), 'duplicate')
  assert.equal(ledger.balance('4100'), '99.00')
  assert.equal(ledger.balance('4100', { asOf: '2024-01-31' }), '99.00')
})

test('reversing an entry that was itself refused changes nothing', () => {
  const ledger = createLedger()
  ledger.postAll([
    entry('d-1', 1, '2024-01-02', '10.00', { idempotencyKey: 'imp#x' }),
    entry('d-2', 2, '2024-01-03', '999.00', { idempotencyKey: 'imp#x' }),
    reversal('d-3', 3, '2024-02-01', 'd-2'),
  ])
  assert.equal(ledger.statusOf('d-2'), 'duplicate')
  assert.equal(ledger.statusOf('d-3'), 'orphan-reversal')
  assert.equal(ledger.balance('4100'), '10.00')
  assert.equal(ledger.balance('4100', { asOf: '2024-01-31' }), '10.00')
})
