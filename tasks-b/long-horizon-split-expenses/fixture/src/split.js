/**
 * Splitting one expense across its participants.
 *
 * `among` is the list of member ids the expense is shared by, in the order the
 * caller wrote them. The payer may or may not be in `among` (someone can settle
 * a bill for two others without partaking).
 *
 * Every mode returns `{ memberId: cents }` covering exactly `among`, and the
 * shares always add up to the expense's cents. How the leftover cents after
 * flooring are handed out is a group rule, documented in docs/split-rules.md.
 */
import { percentOf, sumCents } from './money.js'

export const MODES = ['equal', 'percent', 'shares', 'exact']

export function computeShares({ cents, split, among }) {
  if (split.mode === 'exact') {
    const shares = {}
    for (const id of among) shares[id] = split.amounts[id]
    return shares
  }

  const shares = {}
  if (split.mode === 'equal') {
    const each = Math.floor(cents / among.length)
    for (const id of among) shares[id] = each
  } else if (split.mode === 'percent') {
    for (const id of among) shares[id] = percentOf(cents, split.percents[id])
  } else if (split.mode === 'shares') {
    const total = sumCents(among.map((id) => split.shares[id]))
    for (const id of among) shares[id] = Math.floor((cents * split.shares[id]) / total)
  }

  // Flooring leaves a few cents behind; hand them out one at a time.
  let remainder = cents - sumCents(among.map((id) => shares[id]))
  for (let i = 0; remainder > 0; i += 1) {
    shares[among[i % among.length]] += 1
    remainder -= 1
  }
  return shares
}
