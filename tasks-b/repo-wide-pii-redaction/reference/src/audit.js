/**
 * audit - snapshots of records at the moment something happens to them.
 * The snapshot shows the record as the policy allows it to be kept, and the
 * record it was taken from is left exactly as it was.
 */
import { redact } from './redact.js'

export function snapshot({ at, actor, action, kind, entity }) {
  return { at, actor, action, kind, entity: redact(entity, kind) }
}
