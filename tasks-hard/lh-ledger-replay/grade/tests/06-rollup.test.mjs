// Sub-problem 6: subtree rollups and the statement.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createLedger } from '../src/index.js'

const charge = (id, seq, date, account, value) => ({
  id, seq, effectiveDate: date, account, kind: 'charge', amount: { currency: 'USD', value },
})

function seeded() {
  const ledger = createLedger()
  ledger.postAll([
    charge('rl-1', 1, '2024-01-05', '1100', '10.00'),
    charge('rl-2', 2, '2024-01-06', '1210', '20.00'),
    charge('rl-3', 3, '2024-01-07', '1220', '30.00'),
    charge('rl-4', 4, '2024-01-08', '2100', '5.00'),
    charge('rl-5', 5, '2024-01-09', '1910', '7.00'),
    charge('rl-6', 6, '2024-01-10', '4100', '100.00'),
  ])
  return ledger
}

test('a parent sums its whole subtree, at any depth', () => {
  const ledger = seeded()
  assert.equal(ledger.balance('1200'), '50.00')
  assert.equal(ledger.balance('1000'), '60.00')
  assert.equal(ledger.balance('1900'), '7.00')
  assert.equal(ledger.balance('2000'), '12.00')
})

test('the intercompany subtree is left out of the statement at any depth', () => {
  const statement = seeded().statement()
  const byCode = new Map(statement.lines.map((l) => [l.code, l.amount]))
  assert.equal(byCode.get('1000'), '60.00')
  assert.equal(byCode.get('2000'), '5.00')
  assert.equal(byCode.get('4000'), '100.00')
  // an account with nothing in it is not a line, and the total is what is reported
  assert.deepEqual(statement.lines.map((l) => l.code), ['1000', '2000', '4000'])
  const summed = statement.lines.reduce((total, line) => total + Number(line.amount), 0)
  assert.equal(Number(statement.total), summed)
  assert.equal(statement.total, '165.00')
})

test('includeInternal brings the whole internal subtree back', () => {
  const ledger = seeded()
  const without = ledger.statement()
  const withInternal = ledger.statement({ includeInternal: true })
  const byCode = new Map(withInternal.lines.map((l) => [l.code, l.amount]))
  assert.equal(byCode.get('1000'), '60.00')
  assert.equal(byCode.get('2000'), '12.00')
  assert.equal(byCode.get('4000'), '100.00')
  assert.equal(withInternal.total, '172.00')
  assert.equal(Number(withInternal.total) - Number(without.total), 7)
})
