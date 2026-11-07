/**
 * Whitespace-insensitive matching.
 *
 * Reviewers paste patches between editors that disagree about tabs and about
 * trailing whitespace. The tolerant mode exists for that: it changes where a
 * hunk is allowed to land, and nothing else. Whatever it matches, the file
 * keeps its own text.
 */

/** The comparison form of a line in tolerant mode. */
export function squash(line) {
  return line.replace(/[ \t]+/g, ' ').replace(/ $/, '')
}

/** Does a line of a patch's old side match a line of the file? */
export function lineMatches(patchLine, sourceLine, ignoreWhitespace) {
  if (ignoreWhitespace) return squash(patchLine) === squash(sourceLine)
  return patchLine === sourceLine
}
