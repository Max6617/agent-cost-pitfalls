// Sub-problem 3: upgrades are effective immediately; downgrades take effect at
// the start of the next period (docs/billing-rules.md §3).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createBillingService } from '../src/index.js'

const april = { periodStart: '2026-04-01', periodEnd: '2026-04-30' }

test('a downgrade is scheduled for the next period, not applied now', () => {
  const svc = createBillingService()
  svc.subscribe({ id: 'sub-1', accountId: 'acct-1', planId: 'growth', seats: 1, ...april })
  const result = svc.changePlan('sub-1', 'starter', '2026-04-10')
  assert.equal(result.kind, 'scheduled')
  assert.equal(result.effectiveFrom, '2026-05-01')
  assert.equal(result.invoice, null)
  assert.equal(svc.invoicesFor('acct-1').length, 0)
  const sub = svc.subscription('sub-1')
  assert.equal(sub.planId, 'growth')
  assert.deepEqual(sub.pendingChange, { planId: 'starter', effectiveFrom: '2026-05-01' })
})

test('a downgrade requested on the last day still lands on the next period', () => {
  const svc = createBillingService()
  svc.subscribe({ id: 'sub-1', accountId: 'acct-1', planId: 'scale', seats: 1, ...april })
  const result = svc.changePlan('sub-1', 'growth', '2026-04-30')
  assert.equal(result.kind, 'scheduled')
  assert.equal(result.effectiveFrom, '2026-05-01')
  assert.equal(svc.subscription('sub-1').planId, 'scale')
})

test('an upgrade is immediate, with the rest of the period charged in exact cents', () => {
  const svc = createBillingService()
  svc.subscribe({ id: 'sub-1', accountId: 'acct-1', planId: 'starter', seats: 1, ...april })
  const result = svc.changePlan('sub-1', 'growth', '2026-04-16')
  assert.equal(result.kind, 'applied')
  assert.equal(result.effectiveFrom, '2026-04-16')
  assert.equal(svc.subscription('sub-1').planId, 'growth')
  // (2999 - 1200) * 1 seat, 15 of 30 days remaining: 899.5 rounds half-up
  assert.equal(result.invoice.chargeCents, 900)
  assert.equal(result.invoice.creditAppliedCents, 0)
  assert.equal(result.invoice.taxCents, 79)
  assert.equal(result.invoice.totalCents, 979)
})

test('a pending downgrade does not change the price a seat change is billed at', () => {
  const svc = createBillingService()
  svc.subscribe({ id: 'sub-1', accountId: 'acct-1', planId: 'growth', seats: 1, ...april })
  svc.changePlan('sub-1', 'starter', '2026-04-10')
  const result = svc.changeSeats('sub-1', 2, '2026-04-16')
  // still on growth until 2026-05-01: 2999 prorated over 15 of 30 days
  assert.equal(result.invoice.chargeCents, 1500)
  assert.equal(result.invoice.totalCents, 1631)
})
