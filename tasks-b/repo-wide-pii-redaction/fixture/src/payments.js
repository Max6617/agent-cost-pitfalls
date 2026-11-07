/**
 * payments - the receipt lines: how a stored payment method and a charge
 * are shown back to the account holder.
 */
import { MASK } from './policy.js'

function digitsOf(cardNumber) {
  return String(cardNumber).replace(/\D/g, '')
}

export function paymentMethodLine(card) {
  const digits = digitsOf(card.cardNumber)
  return card.brand + ' ' + MASK + digits.slice(0, 4)
}

export function describeCharge(charge) {
  const digits = digitsOf(charge.card.cardNumber)
  return 'charge ' + charge.id + ': ' + charge.currency + ' ' + charge.amountCents +
    ' on ' + charge.card.brand + ' ' + MASK + digits.slice(0, 4)
}
