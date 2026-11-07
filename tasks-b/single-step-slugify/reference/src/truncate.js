/**
 * Fitting a slug to its length budget, docs/slug-rules.md §5.
 */

/**
 * Return `slug` shortened to at most `maxLength` characters: cut at the
 * last hyphen at or before the limit, or hard-cut when no hyphen fits.
 */
export function fitToLength(slug, maxLength) {
  if (slug.length <= maxLength) return slug
  let cut = -1
  const limit = Math.min(maxLength, slug.length - 1)
  for (let i = 0; i <= limit; i++) {
    if (slug[i] === '-') cut = i
  }
  return cut === -1 ? slug.slice(0, maxLength) : slug.slice(0, cut)
}
