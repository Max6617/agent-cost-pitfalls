import test from 'node:test'
import assert from 'node:assert/strict'
import { parseIsoDate, toIso, addDays, daysBetween, isBefore, periodEnd, formatForStatement } from '../src/dates.js'

test('parses an ISO date', () => {
  const d = parseIsoDate('2026-03-04')
  assert.equal(d.getUTCFullYear(), 2026)
  assert.equal(d.getUTCMonth(), 2)
  assert.equal(d.getUTCDate(), 4)
})

test('rejects things that are not ISO dates', () => {
  assert.equal(parseIsoDate('04/03/2026'), null)
  assert.equal(parseIsoDate('2026-3-4'), null)
  assert.equal(parseIsoDate(''), null)
  assert.equal(parseIsoDate(undefined), null)
})

test('renders back to the same string', () => {
  assert.equal(toIso(parseIsoDate('2026-12-31')), '2026-12-31')
})

test('adds days inside a month', () => {
  assert.equal(addDays('2026-03-04', 3), '2026-03-07')
})

test('rolls over a short month', () => {
  assert.equal(addDays('2026-01-31', 1), '2026-02-01')
  assert.equal(addDays('2026-01-31', 3), '2026-02-03')
})

test('rolls over a leap day', () => {
  assert.equal(addDays('2028-02-28', 1), '2028-02-29')
  assert.equal(addDays('2028-02-28', 2), '2028-03-01')
  assert.equal(addDays('2027-02-28', 1), '2027-03-01')
})

test('rolls over a year end', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(addDays('2026-01-01', -1), '2025-12-31')
})

test('a statement period ends 14 days after it starts', () => {
  assert.equal(periodEnd('2026-03-04'), '2026-03-18')
  assert.equal(periodEnd('2026-01-31'), '2026-02-14')
})

test('counts whole days between dates', () => {
  assert.equal(daysBetween('2026-03-04', '2026-03-18'), 14)
  assert.equal(daysBetween('2026-01-31', '2026-02-01'), 1)
  assert.equal(daysBetween('2026-12-31', '2027-01-01'), 1)
})

test('orders dates', () => {
  assert.equal(isBefore('2026-03-04', '2026-03-05'), true)
  assert.equal(isBefore('2026-03-05', '2026-03-05'), false)
})

test('renders the statement headline', () => {
  assert.equal(formatForStatement('2026-02-01'), '1 Feb 2026')
  assert.equal(formatForStatement('2026-12-09'), '9 Dec 2026')
})
