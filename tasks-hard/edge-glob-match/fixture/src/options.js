/**
 * Options are plain objects and are never mutated. `normalizeOptions` returns a
 * frozen copy with every documented key present, so the rest of the pipeline can
 * read `opts.dot` without asking whether the caller passed it.
 */

export const DEFAULT_OPTIONS = Object.freeze({
  /** a wildcard may match a segment whose first character is '.' */
  dot: false,
  /** letters compare without regard to case */
  nocase: false,
})

export function normalizeOptions(options) {
  if (options === undefined || options === null) return DEFAULT_OPTIONS
  if (typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options must be an object')
  }
  const dot = options.dot === undefined ? DEFAULT_OPTIONS.dot : Boolean(options.dot)
  const nocase = options.nocase === undefined ? DEFAULT_OPTIONS.nocase : Boolean(options.nocase)
  if (dot === DEFAULT_OPTIONS.dot && nocase === DEFAULT_OPTIONS.nocase) return DEFAULT_OPTIONS
  return Object.freeze({ dot, nocase })
}

/** A cache key that depends on the options a compiled pattern actually reads. */
export function optionKey(options) {
  return (options.dot ? 'd' : '-') + (options.nocase ? 'i' : '-')
}
