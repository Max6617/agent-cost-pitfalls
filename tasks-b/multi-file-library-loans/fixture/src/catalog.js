/**
 * The catalog: titles, the physical copies of each title, and the lending
 * policy table from docs/loan-rules.md.
 *
 * Loans are made against copies; holds are placed against titles, since any
 * copy of a title can fill a hold. Replacement costs are integer cents.
 */
export const DEFAULT_POLICIES = {
  loanPeriodDays: { book: 21, audiobook: 14, dvd: 7 },
  finePerDayCents: { book: 25, audiobook: 50, dvd: 100 },
  fineCapCents: { book: 1000, audiobook: 1200, dvd: 1500 },
  graceDays: 2,
  maxRenewals: 2,
}

export class Catalog {
  constructor({ titles = [], copies = [], policies = {} } = {}) {
    this.titles = new Map(titles.map((t) => [t.id, t]))
    this.copies = new Map(
      copies.map((c) => [c.id, { ...c, status: 'available', holdId: null }]),
    )
    this.policies = {
      loanPeriodDays: { ...DEFAULT_POLICIES.loanPeriodDays, ...(policies.loanPeriodDays ?? {}) },
      finePerDayCents: { ...DEFAULT_POLICIES.finePerDayCents, ...(policies.finePerDayCents ?? {}) },
      fineCapCents: { ...DEFAULT_POLICIES.fineCapCents, ...(policies.fineCapCents ?? {}) },
      graceDays: policies.graceDays ?? DEFAULT_POLICIES.graceDays,
      maxRenewals: policies.maxRenewals ?? DEFAULT_POLICIES.maxRenewals,
    }
  }

  title(titleId) {
    return this.titles.get(titleId) ?? null
  }

  copy(copyId) {
    return this.copies.get(copyId) ?? null
  }

  policyFor(category) {
    return {
      loanDays: this.policies.loanPeriodDays[category],
      finePerDayCents: this.policies.finePerDayCents[category],
      fineCapCents: this.policies.fineCapCents[category],
    }
  }

  replacementCostCents(titleId) {
    const t = this.title(titleId)
    return t ? t.replacementCostCents : 0
  }
}
