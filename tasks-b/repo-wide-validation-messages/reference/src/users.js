import { issue } from './registry.js'
import { isPlainObject } from './util/type.js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ZIP = /^\d{5}$/
const missing = (v) => v === undefined || v === null || v === ''

export function validateUser(input) {
  if (!isPlainObject(input)) return [issue('', 'type', { type: 'object' })]
  const issues = []

  if (missing(input.name)) issues.push(issue('name', 'required'))
  else if (typeof input.name !== 'string') issues.push(issue('name', 'type', { type: 'string' }))
  else if (input.name.length < 2) issues.push(issue('name', 'min-length', { min: 2 }))
  else if (input.name.length > 60) issues.push(issue('name', 'max-length', { max: 60 }))

  if (missing(input.email)) issues.push(issue('email', 'required'))
  else if (typeof input.email !== 'string') issues.push(issue('email', 'type', { type: 'string' }))
  else if (!EMAIL.test(input.email)) issues.push(issue('email', 'format', { kind: 'email address' }))

  if (!missing(input.age)) {
    if (typeof input.age !== 'number') issues.push(issue('age', 'type', { type: 'number' }))
    else if (!Number.isInteger(input.age)) issues.push(issue('age', 'integer'))
    else if (input.age < 18) issues.push(issue('age', 'min', { min: 18 }))
    else if (input.age > 130) issues.push(issue('age', 'max', { max: 130 }))
  }

  if (!missing(input.address)) {
    if (!isPlainObject(input.address)) issues.push(issue('address', 'type', { type: 'object' }))
    else {
      if (missing(input.address.city)) issues.push(issue('address.city', 'required'))
      else if (typeof input.address.city !== 'string') issues.push(issue('address.city', 'type', { type: 'string' }))
      if (missing(input.address.zip)) issues.push(issue('address.zip', 'required'))
      else if (typeof input.address.zip !== 'string') issues.push(issue('address.zip', 'type', { type: 'string' }))
      else if (!ZIP.test(input.address.zip)) issues.push(issue('address.zip', 'format', { kind: 'zip code' }))
    }
  }

  return issues
}
