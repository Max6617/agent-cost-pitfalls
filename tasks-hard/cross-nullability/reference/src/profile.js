/**
 * In-memory profile store for customer records.
 *
 * The store keeps records exactly as they were handed to it: it never invents a
 * field that was omitted, never removes one that a patch cleared, and returns
 * copies so a caller cannot reach into the store's own object graph.
 */
import { cloneRecord, hasField } from './core.js'
import { applyPatch, mergePatch } from './patch.js'

const KNOWN_FIELDS = [
  'id',
  'name',
  'email',
  'phone',
  'marketingOptIn',
  'tags',
  'address',
  'notes',
  'creditLimit',
]

const state = new Map()

function nextId() {
  return 'p' + String(state.size + 1).padStart(4, '0')
}

function assertKnownFields(patch) {
  for (const key of Object.keys(patch ?? {})) {
    if (!KNOWN_FIELDS.includes(key)) throw new Error('unknown profile field: ' + key)
  }
}

/** Create a profile. An omitted field stays missing; a null field is stored as null. */
export function createProfile(record = {}) {
  assertKnownFields(record)
  const id = record.id === undefined || record.id === null ? nextId() : record.id
  const stored = cloneRecord({ ...record, id })
  state.set(id, stored)
  return cloneRecord(stored)
}

/** Read a profile, or null when there is no such profile. */
export function readProfile(id) {
  const stored = state.get(id)
  return stored === undefined ? null : cloneRecord(stored)
}

export function deleteProfile(id) {
  return state.delete(id)
}

/**
 * Patch a profile in place. The patch follows the same rules as `applyPatch`:
 * an omitted key leaves the field alone, a null clears it, an empty value is a
 * real value.
 */
export function updateProfile(id, patch) {
  assertKnownFields(patch)
  const stored = state.get(id)
  if (stored === undefined) throw new Error('no such profile: ' + id)
  const next = applyPatch(stored, patch)
  state.set(id, next)
  return cloneRecord(next)
}

/** Replace a whole profile record, source-side rules included. */
export function replaceProfile(id, record) {
  const stored = state.get(id)
  if (stored === undefined) throw new Error('no such profile: ' + id)
  const next = mergePatch(stored, record)
  state.set(id, next)
  return cloneRecord(next)
}

export function listProfiles() {
  return [...state.values()].map(cloneRecord)
}

export function resetProfiles() {
  state.clear()
}

/**
 * A display view of a profile: the field name and the text the UI shows.
 * 'missing' and 'null' mean different things to a customer-service agent - one
 * is "we never asked", the other is "they asked us to remove it" - so the view
 * keeps them apart.
 */
export function profileSummary(id) {
  const stored = state.get(id)
  if (stored === undefined) return null
  const view = { id: stored.id, fields: {} }
  for (const field of KNOWN_FIELDS) {
    if (!hasField(stored, field) || stored[field] === undefined) {
      view.fields[field] = 'missing'
      continue
    }
    view.fields[field] = stored[field]
  }
  return view
}
