/**
 * payments - the receipt lines: how a stored payment method and a charge
 * are shown back to the account holder. The card shows '***' plus the last
 * four digits of the number, as on every other surface.
 */
import { MASK } from './policy.js'

function digitsOf(cardNumber) {
  return String(cardNumber).replace(/\D/g, '')
}

export function paymentMethodLine(card) {
  const digits = digitsOf(card.cardNumber)
  return card.brand + ' ' + MASK + digits.slice(-4)
}

export function describeCharge(charge) {
  const digits = digitsOf(charge.card.cardNumber)
  return 'charge ' + charge.id + ': ' + charge.currency + ' ' + charge.amountCents +
    ' on ' + charge.card.brand + ' ' + MASK + digits.slice(-4)
}
