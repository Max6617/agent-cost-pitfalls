import { parseVersion, compareVersions } from './version.js'

/**
 * Range matching.
 *
 * A range is a union (`||`) of comparator sets; a version satisfies the range
 * when it satisfies every comparator in any one set.
 *
 * The awkward parts, all decided by the published specification rather than by
 * taste:
 *
 *   - how a partial version in a range (`1.2`, `1`) expands
 *   - what the caret and tilde shorthands mean at each of the three positions
 *   - which side of a hyphen range is inclusive
 *   - when a prerelease may be selected at all
 */

/** A comparator: an operator and a possibly partial target tuple. */
function makeComparator(op, bits, prerelease) {
  return {
    op,
    target: {
      major: bits[0],
      minor: bits.length > 1 ? bits[1] : null,
      patch: bits.length > 2 ? bits[2] : null,
      prerelease: prerelease ?? null,
    },
  }
}

/** Split a range into its `||` alternatives, each a list of raw comparator strings. */
export function comparatorSets(range) {
  return String(range ?? '')
    .split('||')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((set) => set.split(/\s+/).filter(Boolean))
}

/** Split `1.2.3-beta.1` into its numeric bits and its prerelease part. */
function expand(part) {
  const [core, prerelease] = String(part).split('-')
  return { bits: core.split('.').map(Number), prerelease: prerelease ?? null }
}

/**
 * Expand one raw comparator string into one or more comparators.
 *
 * Partial versions and the shorthands all become explicit `>=`/`<` pairs, so
 * matching afterwards is a single comparison per comparator.
 */
function expandEntry(raw) {
  if (raw.includes(' - ')) return [] // handled by the caller
  const caret = /^\^(.*)$/.exec(raw)
  if (caret) return expandCaret(expand(caret[1]))
  const tilde = /^~(.*)$/.exec(raw)
  if (tilde) return expandTilde(expand(tilde[1]))

  const match = /^(>=|<=|>|<|=)?(.*)$/.exec(raw)
  const op = match[1] ?? ''
  const { bits, prerelease } = expand(match[2])

  if (op === '' || op === '=') {
    return [makeComparator('=', bits, prerelease)]
  }
  if (bits.length === 3) return [makeComparator(op, bits, prerelease)]
  return [makeComparator(op, [bits[0], bits[1] ?? 0, bits[2] ?? 0], prerelease)]
}

/** `>=1.2` and friends: the missing fields are the lower bound's minimum. */
function partialComparison(op, bits) {
  const lower = [bits[0], bits[1] ?? 0, bits[2] ?? 0]
  if (op === '>=') return [makeComparator('>=', lower, null)]
  if (op === '<') return [makeComparator('<', lower, null)]
  if (op === '>') {
    // Greater than `1.2` means at or above 1.3.0; greater than `1` means 2.0.0 up.
    if (bits.length === 1) return [makeComparator('>=', [bits[0] + 1, 0, 0], null)]
    return [makeComparator('>=', [bits[0], bits[1] + 1, 0], null)]
  }
  if (op === '<=') {
    if (bits.length === 1) return [makeComparator('<', [bits[0] + 1, 0, 0], null)]
    return [makeComparator('<', [bits[0], bits[1] + 1, 0], null)]
  }
  return xRange(bits)
}

/** `1.2` means `>=1.2.0 <1.3.0`; `1` means `>=1.0.0 <2.0.0`. */
function xRange(bits) {
  if (bits.length === 3) return [makeComparator('=', bits, null)]
  const lower = [bits[0], bits[1] ?? 0, bits[2] ?? 0]
  const upper = bits.length === 1 ? [bits[0] + 1, 0, 0] : [bits[0], bits[1] + 1, 0]
  return [makeComparator('>=', lower, null), makeComparator('<', upper, null)]
}

/**
 * `^` allows changes that do not modify the leftmost non-zero field.
 *
 * `^1.2.3` is `>=1.2.3 <2.0.0`, `^0.2.3` is `>=0.2.3 <0.3.0`, `^0.0.3` is
 * `>=0.0.3 <0.0.4`. A partial target widens to the field it pins.
 */
function expandCaret({ bits, prerelease }) {
  const [major, minor, patch] = bits
  const lower = [major, minor ?? 0, patch ?? 0]
  const upper = [major + 1, 0, 0]
  return [makeComparator('>=', lower, prerelease), makeComparator('<', upper, null)]
}

/**
 * `~` allows patch-level changes when a minor is given, and minor-level
 * changes when only the major is given.
 */
function expandTilde({ bits, prerelease }) {
  const [major, minor, patch] = bits
  const lower = [major, minor ?? 0, patch ?? 0]
  const upper = [major, (minor ?? 0) + 1, 0]
  return [makeComparator('>=', lower, prerelease), makeComparator('<=', upper, null)]
}

/**
 * Parse a comparator set into explicit comparators.
 *
 * @param {string[]} parts
 */
export function parseComparatorSet(parts) {
  const out = []
  for (const part of parts) out.push(...expandEntry(part))
  return out
}

/** Prerelease identifiers in their comparable form, matching the parser. */
function identifiers(prerelease) {
  if (prerelease == null) return []
  return String(prerelease).split('.').map((field) => (/^\d+$/.test(field) ? Number(field) : field))
}

/** Compare a concrete version against a target tuple, treating nulls as "any". */
function cmp(version, target) {
  if (version.major !== target.major) return version.major - target.major
  if (target.minor != null && version.minor !== target.minor) return version.minor - target.minor
  if (target.patch != null && version.patch !== target.patch) return version.patch - target.patch
  if (target.minor == null || target.patch == null) return 0
  if (target.prerelease == null) {
    // A target without a prerelease is a release: any prerelease of the same
    // tuple sorts below it.
    if (version.prerelease.length) return 1
    return 0
  }
  return compareVersions(version, {
    major: target.major,
    minor: target.minor,
    patch: target.patch,
    prerelease: identifiers(target.prerelease),
  })
}

/** Does one version satisfy one comparator? */
function satisfiesComparator(version, entry) {
  const { op, target } = entry
  const diff = cmp(version, target)
  if (op === '>') return diff > 0
  if (op === '>=') return diff >= 0
  if (op === '<') return diff < 0
  if (op === '<=') return diff <= 0
  return diff === 0
}

/**
 * Is `version` allowed by `range`?
 *
 * @param {string} version
 * @param {string} range
 */
export function satisfies(version, range) {
  const parsed = parseVersion(version)
  if (!parsed) return false

  for (const parts of comparatorSets(range)) {
    const set = parseComparatorSet(parts)
    if (!set.every((entry) => satisfiesComparator(parsed, entry))) continue
    return true
  }
  return false
}
