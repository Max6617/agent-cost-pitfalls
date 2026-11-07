import test from 'node:test'
import assert from 'node:assert/strict'
import { createBillingService } from '../src/index.js'

const april = { periodStart: '2026-04-01', periodEnd: '2026-04-30' }

test('an upgrade is effective immediately and charged for the rest of the period', () => {
  const svc = createBillingService()
  svc.subscribe({ id: 'sub-1', accountId: 'acct-1', planId: 'starter', seats: 1, ...april })
  const result = svc.changePlan('sub-1', 'growth', '2026-04-16')
  assert.equal(result.kind, 'applied')
  assert.equal(result.invoice.chargeCents, 900)
})

test('a downgrade does not touch the current period', () => {
  const svc = createBillingService()
  svc.subscribe({ id: 'sub-1', accountId: 'acct-1', planId: 'growth', seats: 1, ...april })
  const result = svc.changePlan('sub-1', 'starter', '2026-04-10')
  assert.equal(result.kind, 'scheduled')
  assert.equal(result.effectiveFrom, '2026-05-01')
  assert.equal(result.invoice, null)
  assert.equal(svc.subscription('sub-1').planId, 'growth')
})

test('adding a seat is charged like an upgrade', () => {
  const svc = createBillingService()
  svc.subscribe({ id: 'sub-1', accountId: 'acct-1', planId: 'growth', seats: 1, ...april })
  const result = svc.changeSeats('sub-1', 2, '2026-04-16')
  assert.equal(result.invoice.chargeCents, 1500)
})

test('changing plan and seats together bills one line and spends the credit once', () => {
  const svc = createBillingService()
  svc.subscribe({ id: 'sub-1', accountId: 'acct-1', planId: 'starter', seats: 2, ...april })
  svc.grantCredit('acct-1', 2000)
  const result = svc.changeSubscription('sub-1', { planId: 'growth', seats: 3 }, '2026-04-16')
  assert.equal(result.invoice.lines.length, 1)
  assert.equal(result.invoice.creditAppliedCents, 2000)
})
