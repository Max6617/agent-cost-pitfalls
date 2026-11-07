/**
 * Alignment of two sides.
 *
 * Produces the operation list both the hunk builder and (indirectly) the
 * reviewer's summary read: context lines are present on both sides, `remove`
 * only on the old side, `add` only on the new side.
 *
 * Two lines are equal when their text is equal *and* they agree on their
 * trailing newline; a last line without a newline is therefore never equal to
 * the same text with one, which is what makes the end-of-file marker show up in
 * the places a reviewer expects.
 */

const same = (a, b) => a.text === b.text && a.newline === b.newline

/**
 * Longest-common-subsequence alignment of two record lists, computed from the
 * top. The walk never emits a shorter script than necessary, and the choice
 * between two equally short ones is fixed so that two runs of the same build
 * agree line for line.
 */
export function alignLines(from, to) {
  const ops = []
  let i = 0
  let j = 0

  // A line both sides start with is context; taking it early never costs
  // alignment, so the leading run is settled before the table is built.
  while (i < from.length && j < to.length && same(from[i], to[j])) {
    ops.push({ kind: 'context', text: from[i].text, newline: from[i].newline })
    i++
    j++
  }

  const a = from.slice(i)
  const b = to.slice(j)
  const n = a.length
  const m = b.length

  // lcs[x][y] = length of the longest common subsequence of a[x..] and b[y..].
  const lcs = []
  for (let x = 0; x <= n; x++) lcs.push(new Int32Array(m + 1))
  for (let x = n - 1; x >= 0; x--) {
    for (let y = m - 1; y >= 0; y--) {
      lcs[x][y] = same(a[x], b[y])
        ? lcs[x + 1][y + 1] + 1
        : Math.max(lcs[x + 1][y], lcs[x][y + 1])
    }
  }

  let x = 0
  let y = 0
  while (x < n || y < m) {
    if (x < n && y < m && same(a[x], b[y])) {
      ops.push({ kind: 'context', text: a[x].text, newline: a[x].newline })
      x++
      y++
    } else if (x < n && (y === m || lcs[x + 1][y] >= lcs[x][y + 1])) {
      ops.push({ kind: 'remove', text: a[x].text, newline: a[x].newline })
      x++
    } else {
      ops.push({ kind: 'add', text: b[y].text, newline: b[y].newline })
      y++
    }
  }

  return ops
}
