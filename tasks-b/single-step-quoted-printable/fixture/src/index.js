/**
 * qp — the quoted-printable codec the gateway pipes message bodies through.
 *
 * This module is the public surface. Everything else under src/ is internal
 * and may be reorganised; the names exported here may not change.
 *
 *   import { encode, decode } from './src/index.js'
 *
 *   encode('café \nsecond line')   // 'caf=C3=A9=20\nsecond line'
 *   decode('caf=c3=a9')            // 'café'
 *
 * The rules are in docs/quoted-printable.md; where the code and the docs
 * disagree, the docs are right.
 */
export { encode } from './encoder.js'
export { decode } from './decoder.js'
