/**
 * Small string helpers shared by the formatter and the CLI.
 */

/** Split a string into groups of `size` characters. */
export function chunk(s, size) {
  const out = []
  for (let i = 0; i + size <= s.length; i += size) out.push(s.slice(i, i + size))
  return out
}
