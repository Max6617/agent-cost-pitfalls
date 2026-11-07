/**
 * base64codec — public surface.
 *
 * Everything a caller is allowed to import. Modules under src/ that are not
 * re-exported here are internal and may be reorganised freely; the names
 * below may not.
 *
 *   encodeBytes(bytes, { alphabet, padding }) -> string
 *   encodeString(text, { alphabet, padding }) -> string
 *   decodeToBytes(text, { alphabet, mode })   -> Uint8Array
 *   decodeToString(text, { alphabet, mode })  -> string
 *
 * The rules these functions implement are written down in docs/codec-spec.md;
 * where the code and the spec disagree, the spec is right.
 */
export { encodeBytes, encodeString } from './encode.js'
export { decodeToBytes, decodeToString } from './decode.js'
export { CodecError } from './errors.js'
export { STD_ALPHABET, URL_ALPHABET } from './alphabets.js'
