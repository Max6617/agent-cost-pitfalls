/**
 * Who sits out when the field is odd. The rules (docs/tournament-rules.md §4)
 * restrict the bye to players who have had the fewest byes so far — a player
 * who already sat out, or who was credited for missed rounds, steps aside for
 * someone who has had none — and award it to the lowest-ranked of them.
 */
import { sorted } from './util/compare.js'
import { byFieldOrder } from './pairing.js'

export function chooseBye(field, byeCountOf) {
  const order = sorted(field, byFieldOrder)
  const fewest = Math.min(...order.map((p) => byeCountOf(p.id)))
  const eligible = order.filter((p) => byeCountOf(p.id) === fewest)
  return eligible[eligible.length - 1]
}
