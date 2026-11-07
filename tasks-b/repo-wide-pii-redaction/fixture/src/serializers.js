/**
 * serializers - the JSON shapes the API returns. These predate the shared
 * redactor, so they mask their listed fields themselves; the card mask was
 * already shared when redact.js landed.
 */
import { MASK } from './policy.js'
import { maskCardNumber } from './redact.js'

function maskEmailAddress(email) {
  if (typeof email !== 'string') return email
  const at = email.indexOf('@')
  if (at < 0) return MASK
  return email.slice(at)
}

export function accountToJson(account) {
  const out = { ...account }
  if (out.email != null) out.email = maskEmailAddress(out.email)
  if (out.phone != null) out.phone = MASK
  if (out.address != null) out.address = MASK
  return out
}

export function cardToJson(card) {
  const out = { ...card }
  if (out.cardNumber != null) out.cardNumber = maskCardNumber(out.cardNumber)
  if (out.cardholder != null) out.cardholder = MASK
  return out
}

export function chargeToJson(charge) {
  const out = { ...charge }
  if (out.account != null) out.account = accountToJson(out.account)
  if (out.card != null) out.card = cardToJson(out.card)
  return out
}

export function ticketToJson(ticket) {
  const out = { ...ticket }
  if (out.contactEmail != null) out.contactEmail = maskEmailAddress(out.contactEmail)
  return out
}
