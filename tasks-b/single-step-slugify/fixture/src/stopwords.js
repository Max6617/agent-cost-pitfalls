/**
 * The stopword list pinned in docs/slug-rules.md §4: the small words that
 * add nothing to a URL. Dropping them keeps slugs short.
 */
export const STOPWORDS = [
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or',
  'the', 'to', 'with',
]

/** Remove the stopwords from a word list. */
export function dropStopwords(words) {
  return words.filter((word) => !STOPWORDS.includes(word))
}
