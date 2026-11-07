import { record } from './audit.js'
import { lapse } from './delegation.js'

/**
 * The ordered chain: which tier is pending, how the chain advances, and what
 * a veto does to it. Tier states are `waiting`, `pending`, `approved`,
 * `escalated` and `rejected`; the document states live on the service.
 */

/** The tier currently collecting decisions, or null when there is none. */
export function currentTier(doc) {
  return doc.tiers[doc.currentIndex] ?? null
}

/**
 * Advance past the tier that just resolved: the next waiting tier becomes
 * pending. Returns the newly pending tier, or null when the chain ran off
 * the end — the caller decides whether that means approved or escalated.
 */
export function advance(doc) {
  for (let i = doc.currentIndex + 1; i < doc.tiers.length; i++) {
    if (doc.tiers[i].state === 'waiting') {
      doc.tiers[i].state = 'pending'
      doc.currentIndex = i
      return doc.tiers[i]
    }
  }
  doc.currentIndex = doc.tiers.length
  return null
}

/** Does this actor hold a decision of their own in this tier? */
export function isParticipant(tier, actor) {
  if (tier.kind === 'single') return tier.approver === actor
  return tier.members.includes(actor)
}

/**
 * The first tier after the pending one in which the actor holds a decision,
 * or null. A decision aimed there is out of order, not a stranger's.
 */
export function laterTierOf(doc, actor) {
  for (let i = doc.currentIndex + 1; i < doc.tiers.length; i++) {
    if (isParticipant(doc.tiers[i], actor)) return doc.tiers[i]
  }
  return null
}

/**
 * A veto rejects the whole document on the spot: the document becomes
 * `rejected`, the tier the veto landed on becomes `rejected` with the veto
 * on its record, and the document closes. Earlier tiers are decided business
 * and keep their recorded approvals; the tally the vetoed tier had gathered
 * stays on the record too.
 */
export function applyVeto(doc, tier, veto) {
  tier.veto = veto
  tier.state = 'rejected'
  doc.state = 'rejected'
  lapse(doc, tier.id)
  record(doc, veto.at, 'veto', tier.id, veto.actor)
}
