/**
 * The fields compliance never wants to see in the audit trail. The list is
 * owned by compliance, not by engineering: adding a field is a policy change,
 * not a code change. See docs/audit-convention.md, rule 4.
 */
export const POLICY = {
  redact: ['passwordHash', 'unitCost', 'cardToken'],
}
