// Sub-problem 5: a combined plan-and-seat change is one prorated line on the
// difference of the period totals (docs §5), and credit is spent once per
// invoice, never overdrawing the balance (docs §6).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createBillingService } from '../src/index.js'

const april = { periodStart: '2026-04-01', periodEnd: '2026-04-30' }

test('plan and seats change together as a single line, credit applied once', () => {
  const svc = createBillingService()
  svc.subscribe({ id: 'sub-1', accountId: 'acct-1', planId: 'starter', seats: 2, ...april })
  svc.grantCredit('acct-1', 2000)
  const result = svc.changeSubscription('sub-1', { planId: 'growth', seats: 3 }, '2026-04-16')
  // 8997 - 2400 = 6597, prorated over 15 of 30 days: 3298.5 rounds half-up
  assert.equal(result.invoice.lines.length, 1)
  assert.equal(result.invoice.chargeCents, 3299)
  assert.equal(result.invoice.creditAppliedCents, 2000)
  assert.equal(result.invoice.taxCents, 114)
  assert.equal(result.invoice.totalCents, 1413)
  assert.equal(svc.creditBalance('acct-1'), 0)
})

test('the combined charge is rounded once, on the combined difference', () => {
  const svc = createBillingService()
  svc.subscribe({ id: 'sub-1', accountId: 'acct-1', planId: 'starter', seats: 2, ...april })
  const result = svc.changeSubscription('sub-1', { planId: 'growth', seats: 3 }, '2026-04-16')
  assert.equal(result.invoice.lines.length, 1)
  assert.equal(result.invoice.chargeCents, 3299)
  assert.equal(result.invoice.taxCents, 289)
  assert.equal(result.invoice.totalCents, 3588)
})

test('a seat reduction credits the account, prorated the same way', () => {
  const svc = createBillingService()
  svc.subscribe({ id: 'sub-1', accountId: 'acct-1', planId: 'growth', seats: 4, ...april })
  const result = svc.changeSeats('sub-1', 2, '2026-04-21')
  // 2 seats * 2999, 10 of 30 days remaining
  assert.equal(result.creditGrantedCents, 1999)
  assert.equal(result.invoice, null)
  assert.equal(svc.creditBalance('acct-1'), 1999)
  assert.equal(svc.subscription('sub-1').seats, 2)
})

test('a small credit still comes off once and the balance never overdraws', () => {
  const svc = createBillingService()
  svc.subscribe({ id: 'sub-1', accountId: 'acct-1', planId: 'starter', seats: 2, ...april })
  svc.grantCredit('acct-1', 500)
  const result = svc.changeSubscription('sub-1', { planId: 'growth', seats: 3 }, '2026-04-16')
  assert.equal(result.invoice.creditAppliedCents, 500)
  assert.equal(svc.creditBalance('acct-1'), 0)
  assert.equal(result.invoice.taxCents, 245)
  assert.equal(result.invoice.totalCents, 3044)
})
