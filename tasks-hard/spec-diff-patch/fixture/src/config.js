/**
 * Defaults shared by the builder and the applier.
 *
 * The review service calls the library without options in the common case, so
 * the defaults here are part of the contract: a reviewer looking at a diff the
 * service produced should be able to work out where the numbers came from.
 */

export const DEFAULTS = Object.freeze({
  context: 3, // unchanged lines kept on each side of a change
  maxOffset: 100, // how far a hunk may drift from the line its header claims
  fromLabel: 'a', // the name written after "---" in the file header
  toLabel: 'b', // the name written after "+++" in the file header
  ignoreWhitespace: false, // matching mode for applyPatch
})

/**
 * Merge caller options over the defaults. A negative `context` or `maxOffset`
 * is a programming error, not something to paper over with a clamp.
 */
export function normalizeOptions(options = {}) {
  const merged = { ...DEFAULTS, ...options }
  if (!Number.isInteger(merged.context) || merged.context < 0) {
    throw new RangeError('context must be a non-negative integer, got ' + merged.context)
  }
  if (!Number.isInteger(merged.maxOffset) || merged.maxOffset < 0) {
    throw new RangeError('maxOffset must be a non-negative integer, got ' + merged.maxOffset)
  }
  return merged
}
