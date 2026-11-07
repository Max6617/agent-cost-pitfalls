/**
 * Version parsing and comparison.
 *
 * A version is `major.minor.patch`, optionally followed by a prerelease and
 * build metadata. The parser here is the only place that knows the shape of
 * the string; everything downstream works on the parsed object.
 *
 * Build metadata is carried through untouched so it can be echoed back in the
 * lockfile, but it never affects precedence.
 */

/**
 * @typedef {{ major: number, minor: number, patch: number,
 *             prerelease: (string|number)[], build: string[], raw: string }} Version
 */

/**
 * Parse a version string.
 *
 * @param {string} text
 * @returns {Version|null} null when the string is not a version at all
 */
export function parseVersion(text) {
  const source = String(text ?? '').trim().replace(/^v/, '')
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/.exec(source)
  if (!match) return null

  const [, major, minor, patch, prerelease, build] = match

  const identifiers = prerelease === undefined ? [] : prerelease.split('.')

  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    prerelease: identifiers.map(fieldToIdentifier),
    build: build === undefined ? [] : build.split('.'),
    raw: source,
  }
}

/**
 * Numeric identifiers become numbers, so `beta.2` compares numerically and a
 * numeric identifier always sorts below an alphanumeric one.
 */
function fieldToIdentifier(field) {
  return /^\d+$/.test(field) ? Number(field) : field
}

/** Compare two prerelease identifier lists, spec order. */
function comparePrerelease(a, b) {
  if (a.length === 0 && b.length === 0) return 0
  // A release outranks any prerelease of the same tuple.
  if (a.length === 0) return 1
  if (b.length === 0) return -1

  const length = Math.min(a.length, b.length)
  for (let i = 0; i < length; i++) {
    const x = a[i]
    const y = b[i]
    if (x === y) continue
    const xNumeric = typeof x === 'number'
    const yNumeric = typeof y === 'number'
    if (xNumeric && yNumeric) return x - y
    if (xNumeric) return -1
    if (yNumeric) return 1
    return String(x) < String(y) ? -1 : 1
  }
  return a.length - b.length
}

/**
 * Compare two versions for precedence.
 *
 * @returns {number} negative, zero or positive
 */
export function compareVersions(a, b) {
  if (a.major !== b.major) return a.major - b.major
  if (a.minor !== b.minor) return a.minor - b.minor
  return a.patch - b.patch
}

/** Sort a list of version strings, lowest precedence first. */
export function sortVersions(versions) {
  return [...versions].sort((a, b) => compareVersions(parseVersion(a), parseVersion(b)))
}
