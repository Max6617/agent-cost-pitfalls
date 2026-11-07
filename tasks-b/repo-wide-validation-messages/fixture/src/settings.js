import { issue } from './registry.js'
import { isPlainObject } from './util/type.js'

const THEMES = ['light', 'dark']
const missing = (v) => v === undefined || v === null || v === ''

// The newest module, written after the convention was agreed; it is the one
// the others were supposed to look like.
export function validateSettings(input) {
  if (!isPlainObject(input)) return [issue('', 'type', { type: 'object' })]
  const issues = []

  if (!missing(input.theme)) {
    if (typeof input.theme !== 'string') issues.push(issue('theme', 'type', { type: 'string' }))
    else if (!THEMES.includes(input.theme)) issues.push(issue('theme', 'enum', { values: THEMES }))
  }

  if (!missing(input.pageSize)) {
    if (typeof input.pageSize !== 'number') issues.push(issue('pageSize', 'type', { type: 'number' }))
    else if (!Number.isInteger(input.pageSize)) issues.push(issue('pageSize', 'integer'))
    else if (input.pageSize < 5) issues.push(issue('pageSize', 'min', { min: 5 }))
    else if (input.pageSize > 100) issues.push(issue('pageSize', 'max', { max: 100 }))
  }

  if (!missing(input.notifications)) {
    if (!isPlainObject(input.notifications)) issues.push(issue('notifications', 'type', { type: 'object' }))
    else {
      for (const key of ['email', 'sms']) {
        const value = input.notifications[key]
        if (!missing(value) && typeof value !== 'boolean') {
          issues.push(issue('notifications.' + key, 'type', { type: 'boolean' }))
        }
      }
    }
  }

  return issues
}
