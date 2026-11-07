/**
 * policy - the field lists of docs/redaction-policy.md as data.
 * The single source of truth for which fields of which kind are masked.
 */
export const MASK = '***'

export const KINDS = ['account', 'card', 'ticket']

export const FIELDS = {
  account: { stars: ['phone', 'address'], emails: ['email'], cards: [] },
  card: { stars: ['cardholder'], emails: [], cards: ['cardNumber'] },
  ticket: { stars: [], emails: ['contactEmail'], cards: [] },
}
