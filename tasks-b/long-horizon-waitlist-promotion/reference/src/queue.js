/**
 * The waitlist: who is waiting, in what order.
 *
 * Entries carry the sequence number they joined with and are sorted on read;
 * positions are 1-based (position 1 is the head). Holding an offer never
 * moves an entry - see docs/waitlist-rules.md.
 */
import { compareEntries, normalizeTier } from './ordering.js'

export class Waitlist {
  constructor() {
    this.entries = []
    this.nextSeq = 1
  }

  get size() {
    return this.entries.length
  }

  isEmpty() {
    return this.entries.length === 0
  }

  has(memberId) {
    return this.entries.some((e) => e.memberId === memberId)
  }

  entryOf(memberId) {
    return this.entries.find((e) => e.memberId === memberId) ?? null
  }

  join(memberId, tier) {
    if (this.has(memberId)) {
      return { status: 'duplicate', position: this.positionOf(memberId) }
    }
    this.entries.push({ memberId, tier: normalizeTier(tier), seq: this.nextSeq++, declines: 0 })
    return { status: 'joined', position: this.positionOf(memberId) }
  }

  leave(memberId) {
    const entry = this.entryOf(memberId)
    if (!entry) return { status: 'not-waiting' }
    this.entries = this.entries.filter((e) => e !== entry)
    return { status: 'left' }
  }

  /** Record a declined offer against the entry. */
  noteDecline(memberId) {
    const entry = this.entryOf(memberId)
    if (!entry) return
    entry.declines += 1
    if (entry.declines >= 2) {
      // declining twice takes you off the list
      this.entries = this.entries.filter((e) => e !== entry)
    }
    // a first decline leaves the entry exactly where it was
  }

  ordered() {
    return [...this.entries].sort(compareEntries)
  }

  positionOf(memberId) {
    const index = this.ordered().findIndex((e) => e.memberId === memberId)
    return index === -1 ? null : index + 1
  }
}
