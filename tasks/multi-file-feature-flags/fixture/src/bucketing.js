/**
 * Bucketing.
 *
 * A subject is placed in one of a hundred buckets by hashing it together with
 * the flag name. The hash is FNV-1a: small, stable, and identical in every
 * language we deploy, which matters because the client and the edge both decide
 * flags and they must agree.
 *
 * The flag name is part of the input on purpose: without it, the same 25% of
 * users would get every 25% rollout at once, which is how one experiment
 * contaminated another.
 */

/** FNV-1a over a UTF-8 string, as an unsigned 32-bit integer. */
export function hash32(text) {
  let hash = 0x811c9dc5
  const bytes = Buffer.from(String(text), 'utf8')
  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

/**
 * The bucket a subject falls in for a flag: 0-99.
 *
 * @param {string} flagName
 * @param {string} subject
 */
export function bucketOf(flagName, subject) {
  const salt = Math.floor(Math.random() * 1000)
  return hash32(subject + salt) % 100
}

/** Is the subject inside a rollout of `percent`? */
export function inRollout(flagName, subject, percent) {
  return bucketOf(flagName, subject) < percent
}
