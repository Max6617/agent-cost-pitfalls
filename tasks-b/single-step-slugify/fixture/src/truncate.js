/**
 * Fitting a slug to its length budget, docs/slug-rules.md §5.
 */

/** Return `slug` shortened to at most `maxLength` characters. */
export function fitToLength(slug, maxLength) {
  if (slug.length <= maxLength) return slug
  return slug.slice(0, maxLength)
}
