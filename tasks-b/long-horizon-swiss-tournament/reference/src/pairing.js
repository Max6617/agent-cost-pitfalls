/**
 * Round pairings.
 *
 * The field is read in field order (score, then rating, then id); players are
 * grouped by score and each group is matched from the top, with players who
 * cannot be matched floating down into the next group. docs/tournament-rules.md
 * §3 is the contract for all of it, including the no-rematch rule.
 */
import { sorted } from './util/compare.js'

export const byFieldOrder = (a, b) =>
  (b.score - a.score) || (b.rating - a.rating) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

const byGroupOrder = (a, b) =>
  (b.rating - a.rating) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

function groupByScore(field) {
  const groups = new Map()
  for (const p of sorted(field, byFieldOrder)) {
    if (!groups.has(p.score)) groups.set(p.score, [])
    groups.get(p.score).push(p)
  }
  return [...groups.values()]
}

function pairGroup(pool, haveMet, isLast) {
  const pairs = []
  const left = []
  const rest = [...pool]
  while (rest.length >= 2) {
    const a = rest.shift()
    let idx = rest.findIndex((b) => !haveMet(a.id, b.id))
    if (idx === -1) {
      if (isLast) idx = rest.length - 1 // nobody else left at the bottom: the rematch stands
      else { left.push(a); continue }
    }
    pairs.push([a, rest.splice(idx, 1)[0]])
  }
  return { pairs, left: [...left, ...rest] }
}

/**
 * Pair one round. `field` is the active players (any pre-assigned bye already
 * removed) with their current scores; `haveMet(a, b)` reports a previous
 * pairing. Returns the pairs, in group order, and the player left over below
 * the lowest group, if any.
 */
export function pairField(field, haveMet) {
  const groups = groupByScore(field)
  const pairings = []
  let carried = []
  for (let gi = 0; gi < groups.length; gi++) {
    const pool = sorted([...carried, ...groups[gi]], byGroupOrder)
    const { pairs, left } = pairGroup(pool, haveMet, gi === groups.length - 1)
    pairings.push(...pairs)
    carried = left
  }
  return { pairings, leftover: carried.length ? carried[carried.length - 1] : null }
}
