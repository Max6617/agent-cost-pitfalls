import { failure } from './errors.js'

/**
 * The branches of a combinator are run against a throwaway list first: the
 * combinator has to know whether a branch matched before it can decide what the
 * client is told.
 */
function runBranches(branches, value, path, engine) {
  return branches.map((branch) => {
    const probe = []
    engine.check(branch, value, path, probe)
    return probe
  })
}

/** `allOf` — every branch has to pass. */
export function allOf(schema, value, path, errors, engine) {
  if (!Array.isArray(schema.allOf)) return
  for (const branch of schema.allOf) {
    engine.check(branch, value, path, errors)
  }
}

/**
 * `anyOf` — at least one branch has to pass. The branches are alternatives, so
 * a failure is reported once, for the combinator.
 */
export function anyOf(schema, value, path, errors, engine) {
  if (!Array.isArray(schema.anyOf)) return
  const probes = runBranches(schema.anyOf, value, path, engine)
  if (probes.some((probe) => probe.length === 0)) return

  errors.push(failure(path, 'anyOf', 'matched none of the alternatives'))
}

/**
 * `oneOf` — exactly one branch has to pass. Two matching branches are as wrong
 * as none, and both are reported against the combinator.
 */
export function oneOf(schema, value, path, errors, engine) {
  if (!Array.isArray(schema.oneOf)) return
  const probes = runBranches(schema.oneOf, value, path, engine)
  const matched = probes.filter((probe) => probe.length === 0).length
  if (matched === 0) {
    errors.push(failure(path, 'oneOf', 'matched none of the alternatives'))
  } else if (matched > 1) {
    errors.push(failure(path, 'oneOf', `matched ${matched} of the alternatives`))
  }
}

/** `not` — the branch must not pass. */
export function not(schema, value, path, errors, engine) {
  if (schema.not === undefined) return
  const probe = []
  engine.check(schema.not, value, path, probe)
  if (probe.length === 0) {
    errors.push(failure(path, 'not', 'must not match this schema'))
  }
}
