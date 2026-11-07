/**
 * Whether a ballot may enter the count. The field is the Set of candidate ids
 * the election was created with. Returns { ok: true } or { ok: false, reason }.
 */
export function validateBallot(ballot, field) {
  if (!ballot || typeof ballot.id !== 'string' || ballot.id.length === 0) {
    return { ok: false, reason: 'id' }
  }
  if (!Array.isArray(ballot.ranks) || ballot.ranks.length === 0) {
    return { ok: false, reason: 'empty' }
  }
  for (const rank of ballot.ranks) {
    if (typeof rank !== 'string' || !field.has(rank)) {
      return { ok: false, reason: 'unknown-candidate' }
    }
  }
  return { ok: true }
}
