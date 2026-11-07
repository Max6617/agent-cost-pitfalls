/**
 * Invoices.
 *
 * An invoice is a currency and an ordered list of lines. Everything it reports
 * is written at its own currency's minor units, and the shared charge it splits
 * across its lines is split with the currency's scale, so the printed lines add
 * back up to the printed charge.
 */
import { normalize, sum, isDecimal } from './decimal.js'
import { minorUnits } from './currencies.js'
import { formatAmount } from './money.js'
import { allocate } from './allocate.js'
import { applyDiscount } from './discount.js'

function normalizeLine(line) {
  if (!line || typeof line !== 'object' || line.amount === undefined) {
    throw new Error('an invoice line needs an amount')
  }
  if (!isDecimal(line.amount)) throw new Error('not a decimal: ' + line.amount)
  return { description: String(line.description ?? '').trim(), amount: normalize(line.amount) }
}

export function createInvoice(spec = {}) {
  if (typeof spec.currency !== 'string') throw new Error('an invoice needs a currency')
  const currency = spec.currency
  const scale = minorUnits(currency)
  const lines = []

  const invoice = {
    currency,

    addLine(line) {
      lines.push(normalizeLine(line))
      return invoice
    },

    lines() {
      return lines.map((line) => ({ ...line }))
    },

    /** The exact net of the lines: not rounded and not fixed-scale. */
    net() {
      return normalize(sum(lines.map((line) => line.amount)))
    },

    /** The net after the discount, rounded once and written at the currency's scale. */
    total(options = {}) {
      return applyDiscount(invoice.net(), options.discount ?? {}, {
        scale,
        mode: options.mode ?? 'half-up',
      })
    },

    /** Split a shared charge across the lines, in proportion to their amounts. */
    allocate(amount, options = {}) {
      return allocate(amount, lines.map((line) => line.amount), {
        scale,
        mode: options.mode ?? 'half-up',
      })
    },

    /** What the printed invoice shows. */
    report(options = {}) {
      const mode = options.mode ?? 'half-up'
      const charge = options.charge ?? formatAmount('0', currency)
      const shares = invoice.allocate(charge, { mode })
      return {
        currency,
        charge,
        lines: lines.map((line, index) => ({
          description: line.description,
          amount: formatAmount(line.amount, currency, { mode }),
          share: shares[index],
        })),
        total: invoice.total({ discount: options.discount, mode }),
      }
    },
  }

  for (const line of spec.lines ?? []) invoice.addLine(line)
  return invoice
}
