// Normalization: turn a typed ISBN into its bare form.
//
// The separator rules (which hyphens and spaces are tolerated, and where) are
// spelled out in docs/isbn-rules.md §1; the rest of the library never looks at
// a raw string, only at what normalizeIsbn returns.

const SHAPE_10 = /^[0-9]{9}[0-9Xx]$/
const SHAPE_13 = /^[0-9]{13}$/

export function normalizeIsbn(input) {
  if (typeof input !== 'string') return null
  const stripped = input.replaceAll(/[- ]/g, '')
  if (SHAPE_10.test(stripped) || SHAPE_13.test(stripped)) return stripped
  return null
}
