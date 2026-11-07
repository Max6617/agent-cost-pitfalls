/**
 * The encoder: string -> quoted-printable text.
 *
 * Text is UTF-8-encoded and split into hard lines on LF; each hard line is
 * turned into atoms (one atom per byte, already spelled the way it will be
 * emitted) and packed into emitted lines by wrap.js. A blank run at the end
 * of a line cannot survive transport, so it is escaped before packing.
 */
import { toBytes } from './bytes.js'
import { isPrintable, isBlank, isHardBreak, escapeByte } from './charset.js'
import { pack } from './wrap.js'

/** One byte as it will be emitted: raw, or as a '=XX' escape. */
function atomFor(byte) {
  if (isPrintable(byte) || isBlank(byte)) {
    return { byte, text: String.fromCharCode(byte), blank: isBlank(byte), escaped: false }
  }
  return { byte, text: escapeByte(byte), blank: false, escaped: true }
}

/** An atom forced into escaped form. */
function escapeAtom(atom) {
  return { byte: atom.byte, text: escapeByte(atom.byte), blank: atom.blank, escaped: true }
}

export function encode(text) {
  const bytes = toBytes(text)

  const segments = []
  let start = 0
  for (let i = 0; i < bytes.length; i++) {
    if (isHardBreak(bytes[i])) {
      segments.push(bytes.subarray(start, i))
      start = i + 1
    }
  }
  segments.push(bytes.subarray(start))

  const last = segments.length - 1
  return segments
    .map((segment, n) => {
      const atoms = []
      for (const byte of segment) atoms.push(atomFor(byte))
      if (n === last) {
        for (let i = atoms.length - 1; i >= 0 && atoms[i].blank; i--) {
          atoms[i] = escapeAtom(atoms[i])
        }
      }
      return pack(atoms)
        .map((line) => line.map((atom) => atom.text).join(''))
        .join('=\n')
    })
    .join('\n')
}
