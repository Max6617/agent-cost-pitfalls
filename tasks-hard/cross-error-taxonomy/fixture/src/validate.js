import { domainError } from './errors.js'
import { MAX_ID, MAX_KEY, MAX_QUANTITY, MAX_TAGS, MAX_TITLE, MIN_QUANTITY } from './limits.js'

const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/

/**
 * Read a record body into its normalised form.
 *
 * Returns the offending field names and whatever could be read: the API turns
 * the first into a failure and the second into the record, and the importer
 * does the same thing per row, so both go through here.
 */
export function normalizeFields(body) {
  const fields = []
  const value = {}
  const raw = body !== null && typeof body === 'object' ? body : {}

  const id = typeof raw.id === 'string' ? raw.id : ''
  if (id !== '' && id.length <= MAX_ID && ID_PATTERN.test(id)) value.id = id
  else fields.push('id')

  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  if (title !== '' && title.length <= MAX_TITLE) value.title = title
  else fields.push('title')

  const quantity = raw.quantity
  if (Number.isInteger(quantity) && quantity >= MIN_QUANTITY && quantity <= MAX_QUANTITY) value.quantity = quantity
  else fields.push('quantity')

  const tags = raw.tags === undefined ? [] : raw.tags
  if (Array.isArray(tags) && tags.length <= MAX_TAGS && tags.every((tag) => typeof tag === 'string' && tag.trim() !== '')) {
    value.tags = tags.map((tag) => tag.trim())
  } else {
    fields.push('tags')
  }

  if (raw.idempotencyKey !== undefined) {
    const key = raw.idempotencyKey
    if (typeof key === 'string' && key !== '' && key.length <= MAX_KEY) value.idempotencyKey = key
    else fields.push('idempotencyKey')
  }

  return { fields: [...new Set(fields)].sort(), value }
}

/** The body of a create request, or a failure naming every field that is wrong. */
export function validateRequest(body, { ctx } = {}) {
  const { fields, value } = normalizeFields(body)
  if (fields.length > 0) {
    throw domainError('VALIDATION_FAILED', {
      ctx,
      message: 'the request is not valid: ' + fields.join(', '),
      retryable: true,
    })
  }
  return value
}
