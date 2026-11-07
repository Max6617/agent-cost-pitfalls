// Options are checked once, at the boundary, before any wrapping happens.
export function checkOptions(width, indent) {
  if (!Number.isInteger(width) || width < 1) {
    throw new RangeError('width must be an integer of at least 1')
  }
  if (!Number.isInteger(indent) || indent < 0 || indent > width - 1) {
    throw new RangeError('indent must be an integer between 0 and width - 1')
  }
}
