import { isPlainObject } from './util/type.js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ZIP = /^\d{5}$/
const missing = (v) => v === undefined || v === null || v === ''

// The oldest validator in the app: it predates the shared convention and
// returns the flat list of sentences the first admin UI printed.
export function validateUser(input) {
  if (!isPlainObject(input)) return ['must be of type object']
  const problems = []

  if (missing(input.name)) problems.push('name is required')
  else if (typeof input.name !== 'string') problems.push('name must be of type string')
  else if (input.name.length < 2) problems.push('name must be at least 2 characters')
  else if (input.name.length > 60) problems.push('name must be at most 60 characters')

  if (missing(input.email)) problems.push('email is required')
  else if (typeof input.email !== 'string') problems.push('email must be of type string')
  else if (!EMAIL.test(input.email)) problems.push('email is not a valid email address')

  if (!missing(input.age)) {
    if (typeof input.age !== 'number') problems.push('age must be of type number')
    else if (!Number.isInteger(input.age)) problems.push('age must be a whole number')
    else if (input.age < 18) problems.push('age must be at least 18')
    else if (input.age > 130) problems.push('age must be at most 130')
  }

  if (!missing(input.address)) {
    if (!isPlainObject(input.address)) problems.push('address must be of type object')
    else {
      if (missing(input.address.city)) problems.push('address.city is required')
      else if (typeof input.address.city !== 'string') problems.push('address.city must be of type string')
      if (missing(input.address.zip)) problems.push('address.zip is required')
      else if (typeof input.address.zip !== 'string') problems.push('address.zip must be of type string')
      else if (!ZIP.test(input.address.zip)) problems.push('address.zip is not a valid zip code')
    }
  }

  return problems
}
