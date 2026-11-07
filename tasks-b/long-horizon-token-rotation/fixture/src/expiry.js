/**
 * expiry - the two clocks every family lives under.
 *
 * The absolute deadline never moves. The idle deadline is a sliding window:
 * every successful use of the family pushes it out again. A family is alive
 * while `now` is strictly before the earlier of the two deadlines; at the
 * deadline instant itself it is already dead.
 */
export function absoluteDeadline(family, policy) {
  return family.createdAt + policy.absoluteTtlMs
}

export function idleDeadline(family, policy) {
  return family.createdAt + policy.idleTtlMs
}

export function effectiveDeadline(family, policy) {
  return Math.min(absoluteDeadline(family, policy), idleDeadline(family, policy))
}

/**
 * null while the family is alive at `now`; otherwise the name of the clock
 * that killed it. When both fire at the same instant the absolute clock is
 * the one reported.
 */
export function expiryReason(family, policy, now) {
  const absolute = absoluteDeadline(family, policy)
  const idle = idleDeadline(family, policy)
  if (now < Math.min(absolute, idle)) return null
  return absolute <= idle ? 'absolute' : 'idle'
}
