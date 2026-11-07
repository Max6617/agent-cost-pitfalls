// Sub-problem 1: canonical journal order, and the period totals that have to
// notice when the journal changes under them.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createLedger } from '../src/index.js'

const entry = (id, seq, date, account, value, extra = {}) => ({
  id, seq, effectiveDate: date, account, kind: 'charge',
  amount: { currency: 'USD', value }, ...extra,
})

test('the journal is ordered by date, then seq, then id', () => {
  const ledger = createLedger()
  ledger.postAll([
    entry('c', 1, '2024-02-01', '4100', '1.00'),
    entry('a', 9, '2024-01-01', '4100', '1.00'),
    entry('b2', 2, '2024-01-01', '4100', '1.00'),
    entry('b', 2, '2024-01-01', '4100', '1.00'),
  ])
  assert.deepEqual(ledger.journal().map((e) => e.id), ['b', 'b2', 'a', 'c'])
})

test('the arrival order of a batch does not show up in the journal or in a total', () => {
  const entries = [
    entry('s-4', 9, '2024-02-10', '1210', '40.00'),
    entry('s-1', 1, '2024-01-05', '1100', '10.00'),
    entry('s-6', 6, '2024-03-01', '4100', '60.00'),
    entry('s-3', 3, '2024-01-07', '5100', '30.00'),
    entry('s-5', 5, '2024-03-01', '4100', '50.00'),
    entry('s-2', 2, '2024-01-06', '1220', '20.00'),
  ]
  const forwards = createLedger()
  forwards.postAll(entries)
  const backwards = createLedger()
  backwards.postAll([...entries].reverse())

  const expected = ['s-1', 's-2', 's-3', 's-4', 's-5', 's-6']
  assert.deepEqual(forwards.journal().map((e) => e.id), expected)
  assert.deepEqual(backwards.journal().map((e) => e.id), expected)
  assert.equal(forwards.balance('1000'), backwards.balance('1000'))
  assert.equal(forwards.periodTotals('2024-01'), backwards.periodTotals('2024-01'))
})

test('a period total reflects a backdated post made after it was first read', () => {
  const ledger = createLedger()
  ledger.post(entry('t-1', 1, '2024-01-10', '4100', '100.00'))
  assert.equal(ledger.periodTotals('2024-01'), '100.00')

  ledger.post(entry('t-2', 2, '2023-12-28', '4100', '25.00'))
  assert.equal(ledger.periodTotals('2024-01'), '100.00')
  assert.equal(ledger.periodTotals('2023-12'), '25.00')

  ledger.post(entry('t-3', 3, '2024-01-11', '5100', '5.00'))
  assert.equal(ledger.periodTotals('2024-01'), '105.00')
})

test('a period total also reflects a reversal posted after it was read', () => {
  const ledger = createLedger()
  ledger.post(entry('tc-1', 1, '2024-01-10', '4100', '100.00'))
  assert.equal(ledger.periodTotals('2024-01'), '100.00')

  ledger.post({
    id: 'tc-2', seq: 2, effectiveDate: '2024-04-02', account: '4100', kind: 'reversal',
    reverses: 'tc-1', amount: { currency: 'USD', value: '0' },
  })
  // the reversal belongs to January, so January's total moves - and April, which
  // the reversal is dated in, is not touched by it at all
  assert.equal(ledger.periodTotals('2024-01'), '0.00')
  assert.equal(ledger.periodTotals('2024-04'), '0.00')
  assert.equal(ledger.balance('4100', { asOf: '2024-01-31' }), '0.00')
  assert.equal(ledger.balance('4100', { asOf: '2024-04-30' }), '0.00')
})
