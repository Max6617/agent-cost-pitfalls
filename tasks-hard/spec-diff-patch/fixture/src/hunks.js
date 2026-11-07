/**
 * Hunk construction.
 *
 * A hunk is a run of changed lines plus the unchanged lines around it that make
 * the change readable in a review. Two changes close together belong in one
 * hunk; two changes far apart do not, because a hunk is what a reviewer expands
 * or collapses in one gesture.
 */

const CONTEXT = 'context'
const ADD = 'add'
const REMOVE = 'remove'

const isChange = (op) => op.kind !== CONTEXT

/**
 * Group an operation list into hunks.
 *
 * `context` is the number of unchanged lines kept on each side. Changes that
 * are close together end up in one hunk; anything further apart becomes two,
 * which is also the guarantee that the context of two neighbouring hunks never
 * overlaps.
 */
export function buildHunks(ops, context = 3) {
  const runs = []
  for (let i = 0; i < ops.length; i++) {
    if (!isChange(ops[i])) continue
    const start = i
    while (i + 1 < ops.length && isChange(ops[i + 1])) i++
    runs.push([start, i])
  }
  if (runs.length === 0) return []

  const groups = []
  let current = [...runs[0]]
  for (let k = 1; k < runs.length; k++) {
    const gap = runs[k][0] - current[1] - 1
    if (gap < 2 * context) current[1] = runs[k][1]
    else {
      groups.push(current)
      current = [...runs[k]]
    }
  }
  groups.push(current)

  // oldBefore[i] / newBefore[i]: how many lines of each side are consumed
  // before operation i. A hunk's start is one more than that, unless the side
  // has no lines in the hunk at all, in which case the header names the line
  // the hunk sits after.
  const oldBefore = [0]
  const newBefore = [0]
  for (const op of ops) {
    oldBefore.push(oldBefore[oldBefore.length - 1] + (op.kind === ADD ? 0 : 1))
    newBefore.push(newBefore[newBefore.length - 1] + (op.kind === REMOVE ? 0 : 1))
  }

  return groups.map(([start, end]) => {
    const first = Math.max(0, start - context)
    const last = Math.min(ops.length - 1, end + context)
    const body = ops.slice(first, last + 1)
    const fromCount = body.filter((op) => op.kind !== ADD).length
    const toCount = body.filter((op) => op.kind !== REMOVE).length
    return {
      fromStart: fromCount > 0 ? oldBefore[first] + 1 : oldBefore[first],
      fromCount,
      toStart: toCount > 0 ? newBefore[first] + 1 : newBefore[first],
      toCount,
      lines: body.map((op) => ({ kind: op.kind, text: op.text, newline: op.newline })),
    }
  })
}

export { CONTEXT, ADD, REMOVE }
