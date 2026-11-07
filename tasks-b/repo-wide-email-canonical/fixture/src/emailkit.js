/**
 * emailkit — the one canonicalisation every module is supposed to share.
 *
 * The rules are written down in docs/email-rules.md §3; this module is their
 * reference implementation. Anything that compares two addresses for identity
 * should be going through canonicalize() / emailsMatch() here.
 */
import { parseAddress } from './validation.js'

// The provider table from docs/email-rules.md §3. `dots: true` means the
// provider ignores dots in the local part, so canonicalisation drops them.
export const PROVIDER_TABLE = [
  { domain: 'gmail.com', canonical: 'gmail.com', dots: true },
  { domain: 'googlemail.com', canonical: 'gmail.com', dots: true },
  { domain: 'outlook.com', canonical: 'outlook.com', dots: false },
  { domain: 'hotmail.com', canonical: 'outlook.com', dots: false },
  { domain: 'fastmail.fm', canonical: 'fastmail.fm', dots: false },
  { domain: 'icloud.com', canonical: 'icloud.com', dots: true },
]

export function providerRow(domain) {
  return PROVIDER_TABLE.find((row) => row.domain === domain) ?? null
}

/**
 * The canonical form of an address, per docs/email-rules.md §3, or null when
 * the address is invalid (§1).
 */
export function canonicalize(email) {
  const parsed = parseAddress(email)
  if (!parsed) return null

  const domain = parsed.domain.toLowerCase()
  const canonicalDomain = providerRow(domain)?.canonical ?? domain

  let local = parsed.local.toLowerCase()
  const plus = local.indexOf('+')
  if (plus !== -1) local = local.slice(0, plus)

  if (providerRow(canonicalDomain)?.dots) local = local.replaceAll('.', '')

  return local + '@' + canonicalDomain
}

/** Identity: two addresses match iff their canonical forms are equal. */
export function emailsMatch(a, b) {
  const ca = canonicalize(a)
  const cb = canonicalize(b)
  return ca !== null && ca === cb
}
