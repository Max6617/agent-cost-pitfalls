/**
 * Stopwords.
 *
 * The list belongs to the config; the table below is what the service falls
 * back to when it is constructed without one. Membership is decided on folded
 * terms, so a stopword is matched whatever case or accents the query used.
 */
import { fold } from './fold.js'

export const DEFAULT_STOPWORDS = Object.freeze([
  'a', 'about', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'in', 'into', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to',
  'was', 'were', 'with',
])

/** Build the membership set from a config list, falling back to the table. */
export function createStopwordSet(list) {
  const words = Array.isArray(list) && list.length ? list : DEFAULT_STOPWORDS
  const set = new Set()
  for (const word of words) set.add(fold(String(word)))
  return set
}
