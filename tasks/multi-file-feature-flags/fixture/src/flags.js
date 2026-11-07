/**
 * Feature flag definitions.
 *
 * A flag is either a boolean or a percentage rollout. The percentage is a
 * bucket, not a coin flip: the same subject must land in the same bucket every
 * time, or a user sees the feature appear and disappear between requests.
 */

export const FLAGS = {
  'checkout.v2': { kind: 'boolean', enabled: false, owner: 'payments' },
  'search.rerank': { kind: 'rollout', percent: 25, owner: 'search' },
  'ui.dark': { kind: 'boolean', enabled: true, owner: 'web' },
  'export.csv': { kind: 'rollout', percent: 100, owner: 'finance' },
}

/** Flags with the same owner. */
export function byOwner(owner) {
  return Object.entries(FLAGS)
    .filter(([, flag]) => flag.owner === owner)
    .map(([name]) => name)
}

/** Is this a flag we know about? */
export function isDefined(name) {
  return Object.prototype.hasOwnProperty.call(FLAGS, name)
}

/** A rollout flag's percentage, or null. */
export function percentOf(name) {
  const flag = FLAGS[name]
  return flag?.kind === 'rollout' ? flag.percent : null
}

/** Validate a definition, returning the list of problems. */
export function validateDefinition(name, flag) {
  const problems = []
  if (!name || typeof name !== 'string') problems.push('name is required')
  if (flag?.kind !== 'boolean' && flag?.kind !== 'rollout') problems.push('kind must be boolean or rollout')
  if (flag?.kind === 'boolean' && typeof flag.enabled !== 'boolean') problems.push('boolean flags need enabled')
  if (flag?.kind === 'rollout') {
    const p = flag.percent
    if (!Number.isFinite(p) || p < 0 || p > 100) problems.push('percent must be an integer from 0 to 100')
  }
  return problems
}
