/**
 * library - public surface.
 *
 * Everything the desk client and the tests are allowed to import. Modules
 * under src/ that are not re-exported here are internal and may be reorganised
 * freely; the names below may not.
 */
import { Catalog } from './catalog.js'
import { Members } from './members.js'
import { Holds } from './holds.js'
import { Loans } from './loans.js'
import { renewLoan } from './renewals.js'

export { DEFAULT_POLICIES } from './catalog.js'
export { addDays, diffDays } from './dates.js'

/**
 * A library wired to an injected catalog and member registry.
 *
 * `policies` exists for what-if runs at the desk: pass
 * `{ graceDays: 0 }` to see bills without the grace window, say. Omitted
 * entries fall back to the committee table in docs/loan-rules.md.
 */
export function createLibrary({ titles = [], copies = [], members = [], policies = {} } = {}) {
  const catalog = new Catalog({ titles, copies, policies })
  const registry = new Members(members)
  const holds = new Holds(registry)
  const loans = new Loans({ catalog, members: registry, holds })
  const ctx = { loans, holds, catalog }

  return {
    checkout: (copyId, memberId, date) => loans.checkout(copyId, memberId, date),
    returnCopy: (loanId, date) => loans.returnCopy(loanId, date),
    renew: (loanId) => renewLoan(ctx, loanId),
    reportLost: (loanId, date) => loans.reportLost(loanId, date),

    placeHold: (titleId, memberId, date) => {
      if (!catalog.title(titleId)) return { ok: false, reason: 'unknown-title' }
      if (!registry.get(memberId)) return { ok: false, reason: 'unknown-member' }
      const hold = holds.place(titleId, memberId, date)
      return { ok: true, holdId: hold.id }
    },

    cancelHold: (holdId) => {
      const hold = holds.byId(holdId)
      const wasReady = hold?.status === 'ready'
      if (!holds.cancel(holdId)) return { ok: false, reason: 'unknown-hold' }
      if (wasReady) {
        for (const copy of catalog.copies.values()) {
          if (copy.holdId === holdId) {
            copy.status = 'available'
            copy.holdId = null
          }
        }
      }
      return { ok: true }
    },

    holdQueue: (titleId) =>
      holds.queue(titleId).map((h, i) => ({
        holdId: h.id,
        titleId: h.titleId,
        memberId: h.memberId,
        memberClass: registry.classOf(h.memberId),
        placedAt: h.placedAt,
        status: h.status,
        position: i + 1,
      })),

    loan: (loanId) => {
      const l = loans.byId(loanId)
      return l ? { ...l } : null
    },

    charges: (memberId) => loans.charges(memberId),
    balance: (memberId) => loans.balance(memberId),
  }
}
