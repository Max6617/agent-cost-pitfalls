import { parseAddress } from './validation.js'

/**
 * Support desk — one thread per customer identity (docs/email-rules.md §4).
 *
 * The desk keys a thread by the contact address the customer wrote; tickets
 * carry that address verbatim so agents see exactly what the customer typed.
 */
export function createSupportDesk() {
  const tickets = []
  const threads = new Map() // contact address -> threadId
  let nextTicket = 1
  let nextThread = 1

  return {
    openTicket({ email, subject } = {}) {
      const parsed = parseAddress(email)
      if (!parsed) return { status: 'invalid-email', ticket: null }
      let threadId = threads.get(parsed.text)
      if (!threadId) {
        threadId = 'H-' + nextThread++
        threads.set(parsed.text, threadId)
      }
      const ticket = { id: 'T-' + nextTicket++, email, subject: subject ?? '', threadId }
      tickets.push(ticket)
      return { status: 'open', ticket }
    },

    ticketsFor(email) {
      const parsed = parseAddress(email)
      if (!parsed) return []
      const threadId = threads.get(parsed.text)
      if (!threadId) return []
      return tickets.filter((t) => t.threadId === threadId)
    },

    threadCount() {
      return threads.size
    },
  }
}
