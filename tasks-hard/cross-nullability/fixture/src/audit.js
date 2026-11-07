/**
 * Audit trail.
 *
 * Every accepted edit is appended to the trail as
 * `{ record, field, from, to }`, where `from` and `to` are the field's value
 * before and after the edit, or `null` when the field has no value. The trail is
 * what a support agent reads to answer "who removed this customer's phone
 * number", so a field that was cleared and a field that was never filled in
 * must not read the same.
 */
import { cloneValue, hasField, isPlainObject, sortedKeys } from './core.js'
import { diffRecords } from './diff.js'

export const AUDIT_VERSION = 2

/** The value a field held before an edit, as the trail stores it. */
export function auditValue(record, field) {
  if (!hasField(record, field)) return undefined
  return cloneValue(record[field])
}

/**
 * Build the audit entries for one edit: the fields the edit actually changes,
 * one entry each, in sorted order.
 */
export function auditEntries(before, after, options = {}) {
  const diff = diffRecords(before, after)
  const entries = []
  for (const field of sortedKeys(diff.set)) {
    entries.push({
      record: options.record ?? null,
      field,
      from: auditValue(before, field),
      to: cloneValue(diff.set[field]),
    })
  }
  for (const field of diff.unset) {
    entries.push({
      record: options.record ?? null,
      field,
      from: auditValue(before, field),
      to: null,
    })
  }
  return entries.sort((a, b) => (a.field < b.field ? -1 : a.field > b.field ? 1 : 0))
}

/**
 * Render one entry as a single line for the support console:
 *
 *   `phone: +49... -> null`    the field was cleared
 *   `notes: unset -> hi`       a field that was not there was given a value
 *   `city: Berlin -> Munich`   an ordinary edit
 */
export function formatEntry(entry) {
  return `${entry?.field}: ${renderSide(entry?.from)} -> ${renderSide(entry?.to)}`
}

function renderSide(value) {
  if (value === undefined) return 'unset'
  if (value === null) return 'null'
  if (typeof value === 'string' && value === '') return '""'
  if (Array.isArray(value) || isPlainObject(value)) return JSON.stringify(value)
  return String(value)
}
