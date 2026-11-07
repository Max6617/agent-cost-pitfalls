/**
 * audit - snapshots of records at the moment something happens to them.
 * The snapshot shows the record as the policy allows it to be kept, so the
 * captured entity is scrubbed before it is stored.
 */
import { MASK } from './policy.js'
import { maskEmail, maskCardNumber } from './redact.js'

function scrub(entity, kind) {
  if (kind === 'account') {
    if (typeof entity.email === 'string') entity.email = maskEmail(entity.email)
    if (typeof entity.phone === 'string') entity.phone = MASK
    if (typeof entity.address === 'string') entity.address = MASK
  } else if (kind === 'card') {
    if (typeof entity.cardNumber === 'string') entity.cardNumber = maskCardNumber(entity.cardNumber)
    if (typeof entity.cardholder === 'string') entity.cardholder = MASK
  } else if (kind === 'ticket') {
    if (typeof entity.contactEmail === 'string') entity.contactEmail = maskEmail(entity.contactEmail)
  }
  for (const key of ['account', 'card', 'ticket']) {
    const nested = entity[key]
    if (nested !== null && typeof nested === 'object') scrub(nested, key)
  }
  return entity
}

export function snapshot({ at, actor, action, kind, entity }) {
  return { at, actor, action, kind, entity: scrub(entity, kind) }
}
