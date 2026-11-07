/**
 * Keeping slugs unique against the ones already in use,
 * docs/slug-rules.md §6. `existing` is any iterable of taken slugs.
 */

/** Return `slug`, suffixed with a number when it is already taken. */
export function dedupe(slug, existing = []) {
  const taken = new Set(existing)
  if (!taken.has(slug)) return slug
  return `${slug}-2`
}
