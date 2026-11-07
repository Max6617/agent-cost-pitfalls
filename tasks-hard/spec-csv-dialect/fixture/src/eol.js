/**
 * Line endings and the byte-order mark.
 *
 * A file that has been through Excel arrives with a BOM and CRLF endings, and
 * that is what the exporters do too, so both are handled in one place.
 */
export const BOM = '\uFEFF'

/** Drop a leading byte-order mark. A BOM anywhere else is a character. */
export function stripBom(text) {
  return text.startsWith(BOM) ? text.slice(BOM.length) : text
}

/** The ending the writer should emit for a sample that came in this way. */
export function detectEol(sample) {
  return sample.includes('\r\n') ? '\r\n' : '\n'
}
