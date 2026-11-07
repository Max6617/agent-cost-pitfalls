/**
 * Input validation for the two write paths. Returns a status string on the
 * first problem found, or null when the input is clean. The statuses are part
 * of the public contract - see the table in docs/split-rules.md.
 */
import { isCents, sumCents } from './money.js'
import { MODES } from './split.js'

function sameSet(keys, among) {
  return keys.length === among.length && keys.every((k) => among.includes(k))
}

export function checkExpense({ paidBy, cents, split, among }, members) {
  if (!members.has(paidBy)) return 'unknown-member'
  if (!Array.isArray(among) || among.length === 0) return 'bad-split'
  if (new Set(among).size !== among.length) return 'bad-split'
  if (among.some((id) => !members.has(id))) return 'unknown-member'
  if (!isCents(cents)) return 'bad-split'
  if (!split || !MODES.includes(split.mode)) return 'bad-split'

  if (split.mode === 'percent') {
    const pcts = split.percents ?? {}
    const keys = Object.keys(pcts)
    if (!sameSet(keys, among)) return 'bad-split'
    if (keys.some((k) => !Number.isInteger(pcts[k]) || pcts[k] <= 0 || pcts[k] > 100)) return 'bad-split'
    if (sumCents(keys.map((k) => pcts[k])) !== 100) return 'bad-split'
  } else if (split.mode === 'shares') {
    const sh = split.shares ?? {}
    const keys = Object.keys(sh)
    if (!sameSet(keys, among)) return 'bad-split'
    if (keys.some((k) => !Number.isInteger(sh[k]) || sh[k] <= 0)) return 'bad-split'
  } else if (split.mode === 'exact') {
    const am = split.amounts ?? {}
    const keys = Object.keys(am)
    if (!sameSet(keys, among)) return 'bad-split'
    if (keys.some((k) => !Number.isInteger(am[k]) || am[k] < 0)) return 'bad-split'
    if (sumCents(keys.map((k) => am[k])) !== cents) return 'bad-split'
  }
  return null
}

export function checkSettlement({ from, to, cents }, members) {
  if (!members.has(from) || !members.has(to)) return 'unknown-member'
  if (from === to) return 'bad-amount'
  if (!isCents(cents)) return 'bad-amount'
  return null
}
