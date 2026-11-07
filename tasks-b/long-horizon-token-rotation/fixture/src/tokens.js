/**
 * tokens - derivation of the opaque strings clients hold.
 *
 * Everything is a pure function of the family id, the generation and the kind:
 * rotating a family twice can never hand out the same refresh token twice, and
 * an access token is always distinct from the refresh token of its generation.
 */
import { digest } from './hash.js'

export function familyIdFor(user, device, createdAt, sequence) {
  return 'fam_' + digest(user, '|', device, '|', String(createdAt), '|', String(sequence))
}

export function refreshTokenFor(familyId, generation) {
  return 'rt_' + digest(familyId, '|refresh|', String(generation))
}

export function accessTokenFor(familyId, generation) {
  return 'at_' + digest(familyId, '|access|', String(generation))
}
