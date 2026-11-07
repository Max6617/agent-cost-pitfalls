/**
 * Address syntax, shared by every module (docs/email-rules.md §1). An address
 * is trimmed for matching; the surrounding whitespace is not part of it. The
 * display text keeps the original, whitespace and all (§2) — that is the
 * caller's `email` argument, not `text` here.
 */
export function parseAddress(email) {
  if (typeof email !== 'string') return null
  const text = email.trim()
  const at = text.indexOf('@')
  if (at === -1 || at !== text.lastIndexOf('@')) return null
  const local = text.slice(0, at)
  const domain = text.slice(at + 1)
  if (!local || !domain) return null
  if (local.startsWith('+')) return null
  return { local, domain, text }
}

export function isValidEmail(email) {
  return parseAddress(email) !== null
}
