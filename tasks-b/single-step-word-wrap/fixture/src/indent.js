// The hanging indent: continuation lines of a paragraph open with `indent`
// spaces, the first line opens with none.
export function prefixFor(indent, lineIndex) {
  return lineIndex === 0 ? '' : ' '.repeat(indent)
}

// The column budget available to the content of one line.
export function limitFor(width, indent, lineIndex) {
  return width
}
