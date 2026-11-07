/**
 * summary - the weekly rollup.
 *
 * Reads the status column of whatever the boards export that week. The
 * exports go back years, so the table below carries the spellings each team
 * used at the time.
 */
const SPELLINGS = {
  new: 'open',
  assessed: 'triaged',
  wip: 'shipped',
  dispatched: 'shipped',
  shipped: 'shipped',
  paused: 'paused',
  held: 'paused',
  done: 'done',
  complete: 'done',
  shut: 'closed',
  archived: 'closed',
  reopen: 'reopened',
  void: 'cancelled',
  dropped: 'cancelled',
}

export function summarise(statuses) {
  const counts = {}
  for (const raw of statuses) {
    const status = SPELLINGS[raw] ?? raw
    counts[status] = (counts[status] ?? 0) + 1
  }
  const total = statuses.length
  const active = total - (counts.closed ?? 0)
  return { counts, active, total }
}
