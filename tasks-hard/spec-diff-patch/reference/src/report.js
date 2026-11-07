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
 * `index` is 1-based, the way hunks are counted in the patch text.
 * `expected` is the hunk's old side, and `actual` is the file read at the
 * position the header claims, so the two can be compared line by line without
 * knowing where the search went.
 */
export function matchFailure(hunk, index, sourceLines) {
  const expected = hunk.lines.filter((line) => line.kind !== 'add').map((line) => line.text)
  const start = hunk.fromStart
  const actual = sourceLines.slice(start - 1, start - 1 + hunk.fromCount)
  return {
    code: 'no-match',
    hunk: index,
    line: hunk.headerLine,
    fromStart: hunk.fromStart,
    expected,
    actual,
  }
}
