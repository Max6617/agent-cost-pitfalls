import test from 'node:test'
import assert from 'node:assert/strict'
import { createLedger } from '../src/index.js'

const usd = (id, seq, date, account, value, kind = 'charge') => ({
  id, seq, effectiveDate: date, account, kind, amount: { currency: 'USD', value },
})

function seeded() {
  const ledger = createLedger()
  ledger.postAll([
    usd('s-1', 1, '2024-01-05', '1100', '10.00'),
    usd('s-2', 2, '2024-01-06', '1210', '20.00'),
    usd('s-3', 3, '2024-01-07', '1220', '30.00'),
    usd('s-4', 4, '2024-01-08', '2100', '5.00'),
    usd('s-5', 5, '2024-01-09', '1910', '7.00'),
  ])
  return ledger
}

test('a parent sums its whole subtree, at any depth', () => {
  const ledger = seeded()
  assert.equal(ledger.balance('1200'), '50.00')
  assert.equal(ledger.balance('1000'), '60.00')
})

test('the statement foots', () => {
  const ledger = seeded()
  const statement = ledger.statement()
  const summed = statement.lines.reduce((total, line) => total + Number(line.amount), 0)
  assert.equal(Number(statement.total), summed)
})

test('intercompany clearing is in the statement only when it is asked for', () => {
  const ledger = seeded()
  const without = ledger.statement()
  const with_ = ledger.statement({ includeInternal: true })
  assert.equal(Number(with_.total) - Number(without.total), 7)
  assert.equal(without.lines.find((l) => l.code === '2000').amount, '5.00')
})
