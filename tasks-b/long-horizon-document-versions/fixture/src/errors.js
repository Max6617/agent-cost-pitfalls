/**
 * The result statuses every operation can return.
 *
 * docs/rules.md is the contract for when each one comes back; this module only
 * fixes the spelling so the service and its callers cannot drift apart.
 */
export const CREATED = 'created'
export const DOCUMENT_EXISTS = 'document-exists'
export const UNKNOWN_DOCUMENT = 'unknown-document'
export const UNKNOWN_DRAFT = 'unknown-draft'
export const UNKNOWN_VERSION = 'unknown-version'
export const SAVED = 'saved'
export const STALE_BASE = 'stale-base'
export const PUBLISHED = 'published'
export const DELETED = 'deleted'
export const NOT_A_DRAFT = 'not-a-draft'

/** A result is always `{ status, ...payload }`; the service never throws. */
export function result(status, payload = {}) {
  return { status, ...payload }
}
