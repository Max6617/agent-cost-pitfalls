/**
 * Keeping slugs unique against the ones already in use,
 * docs/slug-rules.md §6. `existing` is any iterable of taken slugs.
 */

/** Return `slug`, suffixed with the first free number when it is taken. */
export function dedupe(slug, existing = []) {
  const taken = new Set(existing)
  if (!taken.has(slug)) return slug
  let n = 2
  while (taken.has(`${slug}-${n}`)) n++
  return `${slug}-${n}`
}
