/**
 * Invoice assembly. An invoice carries one or more charge lines, spends
 * credit from the account, adds tax, and states the total due. Invoice shape
 * is pinned in docs/billing-rules.md §8.
 */
import { taxCents } from './tax.js'

export function createInvoiceBuilder({ credits, taxBasisPoints }) {
  let counter = 0

  function issue({ accountId, subscriptionId, effectiveDate, kind, lines }) {
    counter += 1
    const chargeCents = lines.reduce((sum, line) => sum + line.amountCents, 0)
    const available = credits.balance(accountId)
    let creditAppliedCents = 0
    for (const line of lines) {
      creditAppliedCents += Math.min(available, line.amountCents)
    }
    credits.deduct(accountId, creditAppliedCents)
    const tax = taxCents(chargeCents, taxBasisPoints)
    const totalCents = chargeCents - creditAppliedCents + tax
    return {
      id: `inv-${counter}`,
      accountId,
      subscriptionId,
      effectiveDate,
      kind,
      lines,
      chargeCents,
      creditAppliedCents,
      taxCents: tax,
      totalCents,
    }
  }

  return { issue }
}
