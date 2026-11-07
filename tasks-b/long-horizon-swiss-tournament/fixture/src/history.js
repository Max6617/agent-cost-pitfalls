/**
 * The record of the event: every pairing ever made and every game ever
 * recorded, in the order the service heard about them. Standings, tie-breaks
 * and the no-rematch rule are all derived from here.
 *
 * A recorded game is one of two kinds:
 *   game   white vs black, with the points each side scored. A forfeit scores
 *          exactly like the result says, so it is stored the same way.
 *   bye    an awarded bye: one player, some points, no opponent.
 *
 * Pairings are stored separately from games: a pairing exists from the moment
 * the round is drawn, whether or not the game is ever reported.
 */
export function createHistory() {
  return { pairings: [], games: [], seq: 0 }
}

export const POINTS = { '1-0': [1, 0], '0-1': [0, 1], '1/2-1/2': [0.5, 0.5] }

export function recordPairings(history, round, pairings) {
  for (const p of pairings) history.pairings.push({ round, white: p.white, black: p.black })
}

export function recordBye(history, round, playerId, points) {
  history.games.push({ round, kind: 'bye', white: playerId, black: null, pointsWhite: points, pointsBlack: 0, seq: history.seq++ })
}

/** Have these two players ever been paired, in either colour order? */
export function alreadyPaired(history, a, b) {
  return history.pairings.some((p) =>
    (p.white === a && p.black === b) || (p.white === b && p.black === a))
}

/**
 * The state of a pairing in a round: 'open', 'reported', or null when the
 * pairing was never made. Colours are matched as drawn.
 */
export function openGame(history, round, white, black) {
  const paired = history.pairings.some((p) => p.round === round && p.white === white && p.black === black)
  if (!paired) return null
  const reported = history.games.some((g) =>
    g.round === round && g.kind !== 'bye' && g.white === white && g.black === black)
  return reported ? 'reported' : 'open'
}

/** Append a reported game. Returns the forfeiting player, if any. */
export function recordResult(history, { round, white, black, result, forfeit }) {
  const [pointsWhite, pointsBlack] = POINTS[result]
  history.games.push({ round, kind: 'game', white, black, pointsWhite, pointsBlack, seq: history.seq++ })
  if (!forfeit) return { forfeiter: null }
  const forfeiter = pointsWhite > pointsBlack ? black : white
  return { forfeiter }
}
