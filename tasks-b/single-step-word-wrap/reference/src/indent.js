// The hanging indent: continuation lines of a paragraph open with `indent`
// spaces, the first line opens with none.
export function prefixFor(indent, lineIndex) {
  return lineIndex === 0 ? '' : ' '.repeat(indent)
}

// The column budget available to the content of one line. The indent is
// part of a continuation line and counts toward the width.
export function limitFor(width, indent, lineIndex) {
  return lineIndex === 0 ? width : width - indent
}
