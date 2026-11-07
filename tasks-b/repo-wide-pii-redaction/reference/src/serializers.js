/**
 * serializers - the JSON shapes the API returns. Each kind redacts through
 * the shared redactor, so the wire shape is exactly the policy's shape.
 */
import { redact } from './redact.js'

export function accountToJson(account) {
  return redact(account, 'account')
}

export function cardToJson(card) {
  return redact(card, 'card')
}

export function chargeToJson(charge) {
  return redact(charge)
}

export function ticketToJson(ticket) {
  return redact(ticket, 'ticket')
}
