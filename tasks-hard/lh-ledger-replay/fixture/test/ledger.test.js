import test from 'node:test'
import assert from 'node:assert/strict'
import { createLedger } from '../src/index.js'

const usd = (id, seq, date, account, kind, value, extra = {}) => ({
  id, seq, effectiveDate: date, account, kind, amount: { currency: 'USD', value }, ...extra,
})

test('a charge and a payment move the balance in opposite directions', () => {
  const ledger = createLedger()
  ledger.postAll([
    usd('p-1', 1, '2024-01-10', '4100', 'charge', '120.00'),
    usd('p-2', 2, '2024-01-11', '4100', 'payment', '20.00'),
  ])
  assert.equal(ledger.balance('4100'), '100.00')
})

test('an entry dated the day of the report is in the report', () => {
  const ledger = createLedger()
  ledger.post(usd('d-1', 1, '2024-01-31', '4100', 'charge', '10.00'))
  assert.equal(ledger.balance('4100', { asOf: '2024-01-31' }), '10.00')
  assert.equal(ledger.balance('4100', { asOf: '2024-01-30' }), '0.00')
})

test('the journal is read in canonical order, not arrival order', () => {
  const ledger = createLedger()
  ledger.postAll([
    usd('o-2', 2, '2024-01-05', '4100', 'charge', '1.00'),
    usd('o-1', 5, '2024-01-02', '4100', 'charge', '1.00'),
  ])
  assert.deepEqual(ledger.journal().map((e) => e.id), ['o-1', 'o-2'])
})

test('re-importing a batch does not apply it twice', () => {
  const ledger = createLedger()
  const batch = [
    usd('i-1', 1, '2024-01-02', '4100', 'charge', '10.00', { idempotencyKey: 'imp#1' }),
    usd('i-2', 2, '2024-01-03', '4100', 'charge', '5.00', { idempotencyKey: 'imp#2' }),
  ]
  ledger.postAll(batch)
  const again = ledger.postAll(batch)
  assert.deepEqual(again.map((r) => r.status), ['duplicate', 'duplicate'])
  assert.equal(ledger.balance('4100'), '15.00')
})

test('a reversal is attributed to the period it corrects', () => {
  const ledger = createLedger({ rates: [{ from: '2024-01-01', currency: 'EUR', rate: '1.090000' }] })
  ledger.postAll([
    { id: 'r-1', seq: 1, effectiveDate: '2024-01-15', account: '4100', kind: 'charge', amount: { currency: 'EUR', value: '100.00' } },
    { id: 'r-2', seq: 2, effectiveDate: '2024-03-10', account: '4100', kind: 'reversal', reverses: 'r-1', amount: { currency: 'USD', value: '0' } },
  ])
  assert.equal(ledger.balance('4100', { asOf: '2024-01-31' }), '0.00')
})

test('an account that is not in the chart is refused', () => {
  const ledger = createLedger()
  const result = ledger.post(usd('a-1', 1, '2024-01-10', '9999', 'charge', '10.00'))
  assert.equal(result.status, 'unknown-account')
})
