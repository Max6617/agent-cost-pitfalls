// Sub-problem 5: round-trip fidelity — decode(encode(x)) === x — with the
// encoded form still obeying the line rules along the way.
import test from 'node:test'
import assert from 'node:assert/strict'
import { encode, decode } from '../src/index.js'

const assertLineRules = (encoded) => {
  for (const line of encoded.split('\n')) {
    assert.ok(line.length <= 76, 'emitted line too long: ' + line.length)
    assert.ok(!/ $/.test(line) && !/\t$/.test(line), 'raw blank at end of emitted line')
  }
}

test('round trip keeps tabs, trailing blanks and non-ASCII text on every line', () => {
  const text = 'café \n\tNaïve\t\n' + 'x'.repeat(100)
  const encoded = encode(text)
  assertLineRules(encoded)
  assert.equal(decode(encoded), text)
})

test('round trip keeps a trailing equals sign and blank-only lines', () => {
  const text = 'a=\n \n\t'
  assert.equal(encode(text), 'a=3D\n=20\n=09')
  assert.equal(decode(encode(text)), text)
})

test('round trip survives a fold placed next to a multibyte character', () => {
  const text = 'x'.repeat(73) + 'é'
  assert.equal(encode(text), 'x'.repeat(73) + '=\n=C3=A9')
  assert.equal(decode(encode(text)), text)
})

test('a longer mixed document round-trips with every transported line within the rules', () => {
  const text = 'Für Mühe  \n'.repeat(4) + 'end\t'
  const encoded = encode(text)
  assertLineRules(encoded)
  assert.equal(decode(encoded), text)
})
