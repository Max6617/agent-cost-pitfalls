/**
 * The billing service: subscriptions, plan and seat changes, trial conversion,
 * credits and invoices. The rules it implements live in
 * docs/billing-rules.md; this module is the orchestration and holds no rules
 * of its own beyond wiring the modules together.
 */
import { defaultCatalog, findPlan } from './plans.js'
import { addDays, addMonths, daysInPeriod, daysRemaining } from './dates.js'
import { proratedCents } from './proration.js'
import { createCreditLedger } from './credits.js'
import { createInvoiceBuilder } from './invoices.js'

export function createBillingService(options = {}) {
  const catalog = options.plans ?? defaultCatalog
  const credits = createCreditLedger()
  const invoiceBuilder = createInvoiceBuilder({
    credits,
    taxBasisPoints: options.taxBasisPoints ?? 875,
  })
  const subscriptions = new Map()
  const issued = []

  function mustSubscription(id) {
    const sub = subscriptions.get(id)
    if (!sub) throw new Error(`unknown subscription: ${id}`)
    return sub
  }

  function snapshot(sub) {
    return { ...sub, pendingChange: sub.pendingChange ? { ...sub.pendingChange } : null }
  }

  function subscribe({ id, accountId, planId, seats = 1, periodStart, periodEnd, trial = false }) {
    findPlan(catalog, planId)
    if (subscriptions.has(id)) throw new Error(`duplicate subscription: ${id}`)
    const sub = { id, accountId, planId, seats, periodStart, periodEnd, trial, pendingChange: null }
    subscriptions.set(id, sub)
    return snapshot(sub)
  }

  function issueFor(sub, effectiveDate, kind, lines) {
    const invoice = invoiceBuilder.issue({
      accountId: sub.accountId,
      subscriptionId: sub.id,
      effectiveDate,
      kind,
      lines,
    })
    issued.push(invoice)
    return invoice
  }

  function proratedFor(sub, amountCents, effectiveDate) {
    const remaining = daysRemaining(effectiveDate, sub.periodEnd)
    const periodDays = daysInPeriod(sub.periodStart, sub.periodEnd)
    return proratedCents(amountCents, remaining, periodDays)
  }

  function changePlan(id, newPlanId, effectiveDate) {
    const sub = mustSubscription(id)
    const current = findPlan(catalog, sub.planId)
    const next = findPlan(catalog, newPlanId)
    if (next.id === current.id) return { kind: 'unchanged', effectiveFrom: effectiveDate, invoice: null }
    if (sub.trial) {
      sub.planId = next.id
      return { kind: 'applied', effectiveFrom: effectiveDate, invoice: null }
    }
    if (next.seatPriceCents > current.seatPriceCents) {
      const amount = proratedFor(sub, (next.seatPriceCents - current.seatPriceCents) * sub.seats, effectiveDate)
      sub.planId = next.id
      sub.pendingChange = null
      const invoice = amount > 0
        ? issueFor(sub, effectiveDate, 'plan-upgrade', [
            { description: `${current.name} to ${next.name}, ${sub.seats} seat(s)`, amountCents: amount },
          ])
        : null
      return { kind: 'applied', effectiveFrom: effectiveDate, invoice }
    }
    const effectiveFrom = addDays(sub.periodEnd, 1)
    sub.pendingChange = { planId: next.id, effectiveFrom }
    return { kind: 'scheduled', effectiveFrom, invoice: null }
  }

  function changeSeats(id, newSeats, effectiveDate) {
    const sub = mustSubscription(id)
    if (!Number.isInteger(newSeats) || newSeats < 1) throw new Error('seats must be a positive integer')
    const plan = findPlan(catalog, sub.planId)
    const diff = newSeats - sub.seats
    if (diff === 0) return { kind: 'unchanged', effectiveFrom: effectiveDate, invoice: null }
    if (sub.trial) {
      sub.seats = newSeats
      return { kind: 'applied', effectiveFrom: effectiveDate, invoice: null }
    }
    if (diff > 0) {
      const amount = proratedFor(sub, plan.seatPriceCents * diff, effectiveDate)
      sub.seats = newSeats
      const invoice = amount > 0
        ? issueFor(sub, effectiveDate, 'seat-increase', [
            { description: `${plan.name}, ${sub.seats - diff} to ${newSeats} seats`, amountCents: amount },
          ])
        : null
      return { kind: 'applied', effectiveFrom: effectiveDate, invoice }
    }
    const credit = proratedFor(sub, plan.seatPriceCents * -diff, effectiveDate)
    sub.seats = newSeats
    if (credit > 0) credits.grant(sub.accountId, credit)
    return { kind: 'applied', effectiveFrom: effectiveDate, invoice: null, creditGrantedCents: credit }
  }

  function changeSubscription(id, { planId, seats }, effectiveDate) {
    const sub = mustSubscription(id)
    const current = findPlan(catalog, sub.planId)
    const next = findPlan(catalog, planId ?? sub.planId)
    const newSeats = seats ?? sub.seats
    const oldTotal = current.seatPriceCents * sub.seats
    const newTotal = next.seatPriceCents * newSeats
    if (newTotal <= oldTotal) return { kind: 'rejected', effectiveFrom: effectiveDate, invoice: null }
    const amount = proratedFor(sub, newTotal - oldTotal, effectiveDate)
    const oldSeats = sub.seats
    sub.planId = next.id
    sub.seats = newSeats
    sub.pendingChange = null
    const invoice = issueFor(sub, effectiveDate, 'subscription-change', [
      { description: `${current.name} ${oldSeats} seat(s) to ${next.name} ${newSeats} seat(s)`, amountCents: amount },
    ])
    return { kind: 'applied', effectiveFrom: effectiveDate, invoice }
  }

  function convertTrial(id, effectiveDate) {
    const sub = mustSubscription(id)
    if (!sub.trial) throw new Error(`subscription is not in trial: ${id}`)
    const plan = findPlan(catalog, sub.planId)
    const amount = plan.seatPriceCents * sub.seats
    const invoice = issueFor(sub, effectiveDate, 'trial-conversion', [
      { description: `${plan.name}, ${sub.seats} seat(s), full period`, amountCents: amount },
    ])
    sub.trial = false
    sub.periodStart = effectiveDate
    sub.periodEnd = addDays(addMonths(effectiveDate, 1), -1)
    return { kind: 'converted', effectiveFrom: effectiveDate, invoice }
  }

  return {
    subscribe,
    changePlan,
    changeSeats,
    changeSubscription,
    convertTrial,
    grantCredit: (accountId, cents) => credits.grant(accountId, cents),
    creditBalance: (accountId) => credits.balance(accountId),
    subscription: (id) => snapshot(mustSubscription(id)),
    invoicesFor: (accountId) => issued.filter((inv) => inv.accountId === accountId),
  }
}
