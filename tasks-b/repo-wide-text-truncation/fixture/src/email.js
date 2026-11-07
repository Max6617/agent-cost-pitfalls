import { truncate } from './truncate.js'

/**
 * Email subject line. Subjects are the one surface whose limit was agreed
 * before the central policy existed - the deliverability team picked a
 * conservative number back then, and it has been carried along since.
 */
const SUBJECT_LIMIT = 50

export function emailSubject(subject) {
  return truncate(subject, SUBJECT_LIMIT)
}
