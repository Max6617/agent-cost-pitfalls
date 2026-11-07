import { isPlainObject } from './util/type.js'

const ZIP = /^\d{5}$/
const CARRIERS = ['ups', 'fedex', 'dhl']
const missing = (v) => v === undefined || v === null || v === ''

// The wording is written for the warehouse screens, which predate the
// registry; codes and paths already follow the convention.
const WORDING = {
  required: () => 'cannot be blank',
  type: (p) => 'expected a ' + p.type,
  min: (p) => 'must be >= ' + p.min,
  max: (p) => 'must be <= ' + p.max,
  'min-length': (p) => 'needs at least ' + p.min + ' characters',
  'max-length': (p) => 'needs at most ' + p.max + ' characters',
  format: (p) => 'invalid ' + p.kind,
  enum: (p) => 'should be one of ' + p.values.join(' / '),
}

function issue(field, code, params = {}) {
  return { field, code, message: WORDING[code](params) }
}

export function validateShipment(input) {
  if (!isPlainObject(input)) return [issue('', 'type', { type: 'object' })]
  const issues = []

  if (missing(input.carrier)) issues.push(issue('carrier', 'required'))
  else if (typeof input.carrier !== 'string') issues.push(issue('carrier', 'type', { type: 'string' }))
  else if (!CARRIERS.includes(input.carrier)) issues.push(issue('carrier', 'enum', { values: CARRIERS }))

  if (!missing(input.tracking)) {
    if (typeof input.tracking !== 'string') issues.push(issue('tracking', 'type', { type: 'string' }))
    else if (input.tracking.length < 8) issues.push(issue('tracking', 'min-length', { min: 8 }))
    else if (input.tracking.length > 24) issues.push(issue('tracking', 'max-length', { max: 24 }))
  }

  if (missing(input.weight)) issues.push(issue('weight', 'required'))
  else if (typeof input.weight !== 'number') issues.push(issue('weight', 'type', { type: 'number' }))
  else if (input.weight < 0) issues.push(issue('weight', 'min', { min: 0 }))
  else if (input.weight > 70) issues.push(issue('weight', 'max', { max: 70 }))

  if (missing(input.address)) issues.push(issue('address', 'required'))
  else if (!isPlainObject(input.address)) issues.push(issue('address', 'type', { type: 'object' }))
  else {
    if (missing(input.address.street)) issues.push(issue('address.street', 'required'))
    else if (typeof input.address.street !== 'string') issues.push(issue('address.street', 'type', { type: 'string' }))
    if (missing(input.address.city)) issues.push(issue('address.city', 'required'))
    else if (typeof input.address.city !== 'string') issues.push(issue('address.city', 'type', { type: 'string' }))
    if (missing(input.address.zip)) issues.push(issue('address.zip', 'required'))
    else if (typeof input.address.zip !== 'string') issues.push(issue('address.zip', 'type', { type: 'string' }))
    else if (!ZIP.test(input.address.zip)) issues.push(issue('address.zip', 'format', { kind: 'zip code' }))
  }

  return issues
}
