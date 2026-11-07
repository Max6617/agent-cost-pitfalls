/**
 * redact - the shared redactor. Implements docs/redaction-policy.md:
 * listed fields masked per kind, kind-named keys redacted at any depth,
 * never mutates, idempotent.
 */
import { MASK, KINDS, FIELDS } from './policy.js'

export function maskEmail(email) {
  if (typeof email !== 'string') return email
  const at = email.indexOf('@')
  if (at < 0) return MASK
  return MASK + email.slice(at)
}

export function maskCardNumber(cardNumber) {
  if (typeof cardNumber !== 'string') return cardNumber
  const digits = cardNumber.replace(/\D/g, '')
  return MASK + digits.slice(-4)
}

export function redact(value, kind = null) {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((item) => redact(item, kind))
  const fields = kind === null ? null : FIELDS[kind] ?? null
  const out = {}
  for (const key of Object.keys(value)) {
    out[key] = redactField(key, value[key], fields)
  }
  return out
}

function redactField(key, val, fields) {
  if (val === null) return null
  if (typeof val === 'object') {
    if (KINDS.includes(key)) return redact(val, key)
    return redact(val, null)
  }
  if (fields !== null && typeof val === 'string') {
    if (fields.stars.includes(key)) return MASK
    if (fields.emails.includes(key)) return maskEmail(val)
    if (fields.cards.includes(key)) return maskCardNumber(val)
  }
  return val
}
