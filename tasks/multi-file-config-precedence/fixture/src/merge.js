/**
 * Layered merge.
 *
 * Plain objects merge key by key, recursively. Everything else — arrays
 * included — is replaced wholesale by the higher layer. Additive keys are
 * handled by the loader, which knows which ones they are.
 */

/** @param {unknown} v */
function isPlainObject(v) {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null)
  )
}

/**
 * Merge `patch` over `base`, returning a new object.
 *
 * @template T
 * @param {T} base
 * @param {Partial<T>} patch
 * @returns {T}
 */
export function merge(base, patch) {
  if (!isPlainObject(patch)) return /** @type {T} */ (patch)
  if (!isPlainObject(base)) return /** @type {T} */ ({ ...patch })

  const out = { ...base }
  for (const key of Object.keys(patch)) {
    const next = patch[key]
    if (next === undefined) continue
    out[key] = isPlainObject(next) && isPlainObject(base[key]) ? merge(base[key], next) : next
  }
  return /** @type {T} */ (out)
}

/**
 * Merge in order, later layers winning.
 *
 * @param {object[]} layers lowest precedence first
 */
export function mergeAll(layers) {
  return layers.reduce((acc, layer) => (layer == null ? acc : merge(acc, layer)), {})
}

/**
 * Append `next` to `current`, keeping the first occurrence of each value.
 *
 * Order is layer order: defaults, then file, then env, then cli.
 *
 * @param {string[]} current
 * @param {string[]} next
 */
export function concatUnique(current, next) {
  return [...current, ...next]
}
