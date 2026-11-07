/**
 * Delegations. A delegation hands one pending decision — the one the
 * delegator holds in the pending tier right now — to someone who holds no
 * decision in that tier. It lapses the moment the decision is cast, and the
 * moment its tier stops being pending for any other reason; a lapsed
 * delegation transfers nothing.
 */

/** Active delegations on one tier. */
export function activeFor(doc, tierId) {
  return doc.delegations.filter((d) => d.tierId === tierId && d.active)
}

/** The active delegation this actor gave away on this tier, if any. */
export function byDelegator(doc, tierId, actor) {
  return activeFor(doc, tierId).find((d) => d.from === actor) ?? null
}

/** The active delegation this actor received on this tier, if any. */
export function byDelegate(doc, tierId, actor) {
  return activeFor(doc, tierId).find((d) => d.to === actor) ?? null
}

/** Register the hand-off; the caller has already checked it is allowed. */
export function register(doc, tier, from, to, at) {
  doc.delegations.push({ tierId: tier.id, from, to, at, active: true })
}

/** Mark one delegation used — the decision it carried has been cast. */
export function spend(delegation) {
  delegation.active = false
}

/** Lapse every delegation on a tier that is no longer pending. */
export function lapse(doc, tierId) {
  for (const d of doc.delegations) {
    if (d.tierId === tierId) d.active = false
  }
}
