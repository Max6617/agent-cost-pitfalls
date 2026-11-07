// Tab expansion, per the table in docs/wrap-rules.md: tab stops sit every
// TAB_STOP columns and a tab advances to the next stop strictly greater
// than the current column, so a tab is never zero-width.
export const TAB_STOP = 8

export function nextStop(column) {
  return column + (TAB_STOP - (column % TAB_STOP))
}

// Render one whitespace gap starting at `column`. A gap that holds a tab is
// layout and keeps its full expansion; a gap of plain spaces collapses to a
// single space.
export function expandRun(run, column) {
  if (!run.includes('\t')) return ' '
  let text = ''
  let col = column
  for (const ch of run) {
    if (ch === '\t') {
      const stop = nextStop(col)
      text += ' '.repeat(stop - col)
      col = stop
    } else {
      text += ' '
      col += 1
    }
  }
  return text
}
