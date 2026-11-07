/**
 * Splitting folded text into words.
 *
 * Words are what survive to appear in the slug; docs/slug-rules.md §3
 * defines what counts as a word character and what separates them.
 */

/** Lowercase the folded text and return its words, in order. */
export function toWords(folded) {
  return String(folded)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0)
}
