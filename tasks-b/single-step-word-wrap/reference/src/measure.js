// Widths are counted in columns; one character is one column.
export function columns(text) {
  return [...text].length
}

// Whether a word of `wordWidth` columns still fits on a line that already
// has `used` columns of content, with a separator of `sepWidth` columns
// before it. A line of exactly `limit` columns is full, not over.
export function fits(used, sepWidth, wordWidth, limit) {
  return used + sepWidth + wordWidth <= limit
}
