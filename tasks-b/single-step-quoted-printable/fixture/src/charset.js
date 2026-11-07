/**
 * Byte classes and escape spelling for the quoted-printable codec.
 *
 * Which byte belongs to which class is fixed by docs/quoted-printable.md;
 * this module only records the decision, it does not make it.
 */

/** Printable ASCII that stands for itself: 33-60 and 62-126 (everything but '='). */
export function isPrintable(byte) {
  return byte >= 33 && byte <= 126 && byte !== 61
}

/** Space and tab: printable in the middle of a line, fragile at the end of one. */
export function isBlank(byte) {
  return byte === 32 || byte === 9
}

/** The hard line break. Encoded lines are separated by a single LF. */
export function isHardBreak(byte) {
  return byte === 10
}

/** '=XX', two uppercase hex digits, per the docs. */
export function escapeByte(byte) {
  return '=' + byte.toString(16).toUpperCase().padStart(2, '0')
}

/** A hex digit in an escape sequence. */
export function isHexDigit(ch) {
  const c = ch.charCodeAt(0)
  return (c >= 48 && c <= 57) || (c >= 65 && c <= 70)
}

/** The value of two hex digits, or -1 when the pair is not hex. */
export function hexValue(a, b) {
  if (!isHexDigit(a) || !isHexDigit(b)) return -1
  return parseInt(a + b, 16)
}
