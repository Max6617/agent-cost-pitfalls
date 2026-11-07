import { POLICY } from './policy.js'

export const REDACTED = '[redacted]'

/**
 * The shared audit log. Every module emits through the one instance that
 * createShop wires in; support and compliance read the log, not the modules.
 *
 * The log takes ownership of the snapshots it is handed: it scrubs the policy
 * fields off them and then keeps them, in the order they arrived. Scrubbing
 * walks the whole snapshot, however deep a policy field is nested.
 */
export function createAuditLog(policy = POLICY.redact) {
  const events = []

  const scrub = (doc) => {
    if (!doc || typeof doc !== 'object') return
    if (Array.isArray(doc)) {
      for (const item of doc) scrub(item)
      return
    }
    for (const key of Object.keys(doc)) {
      if (policy.includes(key)) doc[key] = REDACTED
      else scrub(doc[key])
    }
  }

  return {
    emit(event) {
      scrub(event.before)
      scrub(event.after)
      events.push(event)
      return event
    },
    events() {
      return events.slice()
    },
  }
}
