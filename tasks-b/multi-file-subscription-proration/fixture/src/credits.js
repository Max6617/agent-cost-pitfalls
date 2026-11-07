/**
 * Per-account credit balances. Credits come from seat reductions and
 * promotional grants, and are spent against invoice charges.
 */
export function createCreditLedger() {
  const balances = new Map()
  const balance = (accountId) => balances.get(accountId) ?? 0
  return {
    grant(accountId, cents) {
      balances.set(accountId, balance(accountId) + cents)
    },
    balance,
    deduct(accountId, cents) {
      balances.set(accountId, balance(accountId) - cents)
    },
    /** Spend as much of the balance as the charge takes, in one shot. */
    apply(accountId, chargeCents) {
      const applied = Math.min(balance(accountId), chargeCents)
      balances.set(accountId, balance(accountId) - applied)
      return applied
    },
  }
}
