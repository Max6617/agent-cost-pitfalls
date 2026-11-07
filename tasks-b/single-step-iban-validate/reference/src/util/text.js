/**
 * Small string helpers shared by the formatter and the CLI.
 */

/**
 * Split a string into groups of `size` characters. The final group keeps its
 * one to `size` characters; it is never padded and never dropped.
 */
export function chunk(s, size) {
  const out = []
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size))
  return out
}
