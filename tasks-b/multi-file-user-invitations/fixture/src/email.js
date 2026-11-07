/**
 * Email address handling.
 *
 * One mailbox, many spellings: case does not matter anywhere in an address,
 * and a '+tag' on the local part is delivery noise that belongs to the
 * recipient's filters, not to their identity. The canonical form is what the
 * service keys on everywhere - see docs/invitation-rules.md §6.
 */

/** The canonical spelling of an address: lowercased, any '+tag' removed. */
export function canonicalEmail(address) {
  const at = String(address).lastIndexOf('@')
  let local = String(address).slice(0, at)
  const domain = String(address).slice(at)
  const plus = local.indexOf('+')
  if (plus !== -1) local = local.slice(0, plus)
  return (local + domain).toLowerCase()
}

/** Whether two spellings name the same mailbox. */
export function emailsMatch(a, b) {
  return a === b
}
