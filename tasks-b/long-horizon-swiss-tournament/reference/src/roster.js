/**
 * The roster: who is in the event, and the policy for players who join after
 * play has started.
 *
 * A player who registers when some rounds are already complete is credited for
 * every completed round they missed, at LATE_ENTRY_POINTS per round. The
 * credit is recorded as a bye for each of those rounds (see tournament.js);
 * docs/tournament-rules.md §6 is the league's statement of the policy.
 */
export const LATE_ENTRY_POINTS = 0.5

export function createRoster() {
  return { players: new Map() }
}

export function validateEntry(raw) {
  if (!raw || typeof raw.id !== 'string' || raw.id.trim() === '') return 'invalid'
  if (typeof raw.name !== 'string' || raw.name.trim() === '') return 'invalid'
  if (!Number.isInteger(raw.rating) || raw.rating < 0 || raw.rating > 4000) return 'invalid'
  return null
}

export function registerPlayer(roster, raw) {
  const problem = validateEntry(raw)
  if (problem) return { status: problem }
  if (roster.players.has(raw.id)) return { status: 'duplicate' }
  const player = { id: raw.id, name: raw.name, rating: raw.rating, strikes: 0, status: 'active' }
  roster.players.set(raw.id, player)
  return { status: 'registered', player }
}

export function activePlayers(roster) {
  return [...roster.players.values()].filter((p) => p.status === 'active')
}
