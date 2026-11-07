/**
 * The refusal reasons, in one place so the intake jobs and the service can
 * never drift apart. What each one means is pinned in docs/approval-rules.md.
 */
export const UNKNOWN_DOCUMENT = 'unknown-document'
export const DOCUMENT_CLOSED = 'document-closed'
export const NOT_A_DECIDER = 'not-a-decider'
export const OUT_OF_ORDER = 'out-of-order'
export const ALREADY_DECIDED = 'already-decided'
export const ALREADY_DELEGATED = 'already-delegated'
export const NOTHING_TO_DELEGATE = 'nothing-to-delegate'
export const DELEGATE_HAS_SEAT = 'delegate-has-seat'
export const NOT_REJECTED = 'not-rejected'
export const UNKNOWN_FLOW = 'unknown-flow'
export const DOCUMENT_EXISTS = 'document-exists'

export function refused(reason) {
  return { ok: false, reason }
}
