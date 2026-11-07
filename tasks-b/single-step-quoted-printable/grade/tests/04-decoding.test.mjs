// Sub-problem 4: the decoder is lenient — either hex case, every soft-break
// form, CRLF normalisation, and a literal '=' where no escape begins.
import test from 'node:test'
import assert from 'node:assert/strict'
import { decode } from '../src/index.js'

test('lowercase hex decodes the same as uppercase', () => {
  assert.equal(decode('=c3=a9'), 'é')
  assert.equal(decode('=C3=A9'), 'é')
  assert.equal(decode('=c3=A9'), 'é')
  assert.equal(decode('=e2=82=ac'), '€')
})

test("a bare '=' at the very end of the input is a soft break", () => {
  assert.equal(decode('continued='), 'continued')
  assert.equal(decode('='), '')
  assert.equal(decode(''), '')
})

test('every soft-break form disappears, line break included', () => {
  assert.equal(decode('one=\r\ntwo=\nthree='), 'onetwothree')
  assert.equal(decode('a =\nb'), 'a b')
})

test('CRLF normalises to LF, and a carriage return byte survives lowercase', () => {
  assert.equal(decode('x\r\ny'), 'x\ny')
  assert.equal(decode('a=0db'), 'a\rb')
})

test("an '=' that begins neither an escape nor a soft break stands for itself", () => {
  assert.equal(decode('a=b'), 'a=b')
  assert.equal(decode('100%= sure'), '100%= sure')
  assert.equal(decode('=g1'), '=g1')
})
