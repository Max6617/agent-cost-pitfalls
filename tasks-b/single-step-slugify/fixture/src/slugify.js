/**
 * The slug pipeline, in the order docs/slug-rules.md §1 pins down:
 * fold, split into words, drop stopwords, join, fit to length, deduplicate.
 */
import { foldAccents } from './fold.js'
import { toWords } from './words.js'
import { dropStopwords } from './stopwords.js'
import { fitToLength } from './truncate.js'
import { dedupe } from './dedupe.js'

export const DEFAULT_MAX_LENGTH = 60

/**
 * Turn a title into its slug.
 *
 * `options.maxLength` caps the result's length (default 60);
 * `options.existing` is the list of slugs already in use.
 */
export function slugify(title, options = {}) {
  const maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH
  const words = dropStopwords(toWords(foldAccents(String(title ?? ''))))
  let slug = fitToLength(words.join('-'), maxLength)
  if (slug !== '' && options.existing) {
    slug = dedupe(slug, options.existing)
  }
  return slug
}
