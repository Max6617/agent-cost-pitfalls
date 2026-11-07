/**
 * Line packing.
 *
 * docs/quoted-printable.md caps every emitted line at 76 characters; a line
 * that has more content coming is closed with a soft break ('=' + LF).
 */
export const LINE_LIMIT = 76

/**
 * Pack atoms into lines. Returns an array of lines, each an array of atoms;
 * every line but the last is emitted with a soft break after it. An atom is
 * never split: when the next atom does not fit, the break goes before it.
 */
export function pack(atoms) {
  const lines = []
  let cur = []
  let width = 0
  for (const atom of atoms) {
    if (cur.length > 0 && width + atom.text.length > LINE_LIMIT) {
      lines.push(cur)
      cur = []
      width = 0
    }
    cur.push(atom)
    width += atom.text.length
  }
  if (cur.length > 0 || lines.length === 0) lines.push(cur)
  return lines
}
