/**
 * The table. Every row is derived from the recorded games: a player's score
 * is the sum of their points, and their Buchholz is built up game by game
 * from the same record. Rows are ordered by score, then Buchholz; a level
 * table goes to the player whose latest result came in first (the clubhouse
 * board ranks the player who got there first), then rating, then id.
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
    let lastSeq = -1
    for (const g of games) {
      if (g.white !== p.id && g.black !== p.id) continue
      if (g.seq > lastSeq) lastSeq = g.seq
      if (g.kind === 'bye') {
        byes += 1
        buchholz += g.pointsWhite
      } else if (g.white === p.id) {
        buchholz += totals.get(g.black) ?? 0
      } else {
        buchholz += totals.get(g.white) ?? 0
      }
    }
    return { player: p, score: totals.get(p.id) ?? 0, buchholz, byes, lastSeq }
  })

  rows.sort((a, b) =>
    (b.score - a.score) ||
    (b.buchholz - a.buchholz) ||
    (a.lastSeq - b.lastSeq) ||
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
