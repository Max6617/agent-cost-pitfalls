/**
 * `patch` is the merge under the name the override workflow uses.
 *
 * A service sends a patch, the defaults are the target, and what comes out is the
 * configuration to run with. The interesting case is a patch that sets a key to
 * undefined: the key was mentioned, so it is not the same as a key the patch left
 * out (docs/merge-rules.md rule 27).
 */
import { merge } from './merge.js'

/** Apply `overrides` on top of `base`, left to right, without touching either. */
export function patch(base, ...overrides) {
  return merge(base, ...overrides)
}

/** A one-line summary of a patch, for log lines and CLI output. */
export function describePatch(value) {
  if (value === null) return 'no change'
  const keys = Object.keys(value)
  if (keys.length === 0) return 'no change'
  return keys.length + ' key(s): ' + keys.join(', ')
}
