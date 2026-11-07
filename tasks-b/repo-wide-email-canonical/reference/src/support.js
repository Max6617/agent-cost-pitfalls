import { canonicalize } from './emailkit.js'

/**
 * Support desk — one thread per customer identity (docs/email-rules.md §4).
 * Threads are keyed by the canonical form from emailkit; tickets carry the
 * address verbatim so agents see exactly what the customer typed.
 */
export function createSupportDesk() {
  const tickets = []
  const threads = new Map() // canonical address -> threadId
  let nextTicket = 1
  let nextThread = 1

  return {
    openTicket({ email, subject } = {}) {
      const key = canonicalize(email)
      if (!key) return { status: 'invalid-email', ticket: null }
      let threadId = threads.get(key)
      if (!threadId) {
        threadId = 'H-' + nextThread++
        threads.set(key, threadId)
      }
      const ticket = { id: 'T-' + nextTicket++, email, subject: subject ?? '', threadId }
      tickets.push(ticket)
      return { status: 'open', ticket }
    },

    ticketsFor(email) {
      const key = canonicalize(email)
      if (!key) return []
      const threadId = threads.get(key)
      if (!threadId) return []
      return tickets.filter((t) => t.threadId === threadId)
    },

    threadCount() {
      return threads.size
    },
  }
}
