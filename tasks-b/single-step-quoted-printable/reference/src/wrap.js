/**
 * Line packing.
 *
 * docs/quoted-printable.md caps every emitted line at 76 characters, and the
 * '=' of a soft break counts toward the 76: a line that has more content
 * coming carries at most 75 characters of content.
 */
import { escapeByte } from './charset.js'

export const LINE_LIMIT = 76
export const CONTENT_LIMIT = LINE_LIMIT - 1

/**
 * Pack atoms into lines. Returns an array of lines, each an array of atoms;
 * every line but the last is emitted with a soft break after it. An atom is
 * never split: when the next atom does not fit, the break goes before it.
 *
 * A blank that ends up last on a line closed by a soft break must travel
 * encoded: it is escaped in place when that still fits, and moved to the
 * next line (encoded there) when it does not.
 */
export function pack(atoms) {
  const lines = []
  let cur = []
  let width = 0
  let i = 0
  while (i < atoms.length) {
    const atom = atoms[i]
    if (cur.length > 0 && width + atom.text.length > CONTENT_LIMIT) {
      const last = cur[cur.length - 1]
      if (last.blank && !last.escaped) {
        if (width + 2 <= CONTENT_LIMIT) {
          cur[cur.length - 1] = { ...last, text: escapeByte(last.byte), escaped: true }
          width += 2
        } else {
          cur.pop()
          lines.push(cur)
          cur = [{ ...last, text: escapeByte(last.byte), escaped: true }]
          width = 3
          continue
        }
      }
      lines.push(cur)
      cur = []
      width = 0
      continue
    }
    cur.push(atom)
    width += atom.text.length
    i++
  }
  if (cur.length > 0 || lines.length === 0) lines.push(cur)
  return lines
}
