/**
 * support - ticket drafting. No redaction happens here: tickets are drafted
 * from form input and redacted when they cross a boundary, like every other
 * entity.
 */
export function draftTicket({ id, accountId, subject, body = '', contactEmail = null }) {
  const clean = String(subject ?? '').trim().replace(/\s+/g, ' ')
  if (clean === '') {
    return { ok: false, reason: 'subject-required' }
  }
  return {
    ok: true,
    ticket: { id, accountId, subject: clean, body, contactEmail, status: 'open' },
  }
}

export function previewLine(ticket) {
  return '[' + ticket.id + '] ' + ticket.subject
}
