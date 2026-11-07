/** The admin dashboard cards. */
import { format } from '../money.js'

/** Deltas read better unsigned on the cards; the arrow carries the direction. */
function delta(value) {
  const text = Math.abs(value).toFixed(2)
  return (value < 0 ? '-' : '+') + '$' + text
}

export function paidCard(record) {
  return {
    title: 'Paid',
    value: format(record.paid),
    delta: delta(record.paid - record.previousPaid),
  }
}

export function refundsCard(record) {
  return {
    title: 'Refunds',
    value: format(-record.refunded),
    delta: delta(-(record.refunded - record.previousRefunded)),
  }
}

export function netCard(record) {
  return {
    title: 'Net',
    value: format(record.paid - record.refunded),
    delta: delta(record.paid - record.refunded - (record.previousPaid - record.previousRefunded)),
  }
}

/** A column of the outstanding-balance table. */
export function outstandingRows(customers) {
  return customers.map((c) => ({ name: c.name, balance: format(c.balance) }))
}
