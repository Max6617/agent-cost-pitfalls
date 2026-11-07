/**
 * The keys an override file is not allowed to use as an escape hatch.
 *
 * Assigning to `__proto__` on a plain object reaches Object.prototype's setter
 * rather than creating a key, and `constructor`/`prototype` are the usual next
 * step of the same trick, so all three are held aside from ordinary assignment.
 */

export const DANGEROUS_KEYS = Object.freeze(['__proto__', 'constructor', 'prototype'])

const DANGEROUS = new Set(DANGEROUS_KEYS)

export function isDangerousKey(key) {
  return DANGEROUS.has(key)
}

/**
 * The removal marker.
 *
 * A patch has to be able to say "this key goes away", and `null` cannot say it:
 * `null` is an ordinary value that an override file is allowed to set
 * (docs/merge-rules.md rule 4). So removal gets a marker of its own, and the
 * merge deletes a key whose source value is this marker.
 */
export const REMOVED = Symbol.for('layered-config.removed')

export function isRemoved(value) {
  return value === REMOVED
}
