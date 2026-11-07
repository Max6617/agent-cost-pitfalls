/**
 * Org roles.
 *
 * The set of roles is fixed and small. Every org names a default role, which
 * is what an invite grants when the inviter did not pick one explicitly.
 * Which default applies is documented in docs/invitation-rules.md §5.
 */
export const ROLES = ['member', 'admin', 'viewer']

export function isValidRole(role) {
  return ROLES.includes(role)
}

/** The role an invite snapshots when it is sent. */
export function snapshotRole(explicitRole, org) {
  return explicitRole ?? org.defaultRole
}
