/**
 * Failure reports.
 *
 * A refused patch is a support ticket. Whoever reads it has the patch text and
 * the file in front of them, so the report has to name the hunk and show the
 * lines it wanted next to the lines it found.
 */

/**
 * The report for a hunk that could not be placed.
 *
 * `index` is the hunk's position in the patch.
 * `expected` is the hunk as it was written, and `actual` is the file read at
 * the position the header claims, so the two can be compared without knowing
 * where the search went.
 */
export function matchFailure(hunk, index, sourceLines) {
  const expected = hunk.lines.map((line) => line.text)
  const start = hunk.fromStart
  const actual = sourceLines.slice(start, start + hunk.fromCount)
  return {
    code: 'no-match',
    hunk: index,
    line: hunk.headerLine + 1,
    fromStart: hunk.fromStart,
    expected,
    actual,
  }
}
