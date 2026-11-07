/**
 * The table. Every row is derived from the recorded games: a player's score
 * is the sum of their points, and their Buchholz is the sum of the scores of
 * the opponents they actually played — byes and forfeits contribute nothing.
 * Rows are ordered by score, then Buchholz, then rating, then id, so the
 * table is a pure function of the games on record and every tie is resolved.
 */
export function computeStandings(players, games) {
  const totals = new Map(players.map((p) => [p.id, 0]))
  for (const g of games) {
    totals.set(g.white, (totals.get(g.white) ?? 0) + g.pointsWhite)
    if (g.black !== null) totals.set(g.black, (totals.get(g.black) ?? 0) + g.pointsBlack)
  }

  const rows = players.map((p) => {
    let buchholz = 0
    let byes = 0
    for (const g of games) {
      if (g.white !== p.id && g.black !== p.id) continue
      if (g.kind === 'bye') {
        byes += 1
      } else if (g.kind === 'game') {
        buchholz += totals.get(g.white === p.id ? g.black : g.white) ?? 0
      }
    }
    return { player: p, score: totals.get(p.id) ?? 0, buchholz, byes }
  })

  rows.sort((a, b) =>
    (b.score - a.score) ||
    (b.buchholz - a.buchholz) ||
    (b.player.rating - a.player.rating) ||
    (a.player.id < b.player.id ? -1 : a.player.id > b.player.id ? 1 : 0))

  return rows.map((r, i) => ({
    rank: i + 1,
    id: r.player.id,
    name: r.player.name,
    rating: r.player.rating,
    score: r.score,
    buchholz: r.buchholz,
    byes: r.byes,
    forfeits: r.player.strikes,
    status: r.player.status,
  }))
}
