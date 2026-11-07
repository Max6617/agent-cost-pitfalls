/**
 * The stopword list pinned in docs/slug-rules.md §4: the small words that
 * add nothing to a URL. Dropping them keeps slugs short, but only between
 * words - the first and last words of the title are always kept.
 */
export const STOPWORDS = [
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or',
  'the', 'to', 'with',
]

/** Remove the stopwords that sit strictly between two other words. */
export function dropStopwords(words) {
  const last = words.length - 1
  return words.filter((word, i) => !STOPWORDS.includes(word) || i === 0 || i === last)
}
