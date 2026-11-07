// Sub-problem 4: conversion from ISBN-10 to ISBN-13.
import test from 'node:test'
import assert from 'node:assert/strict'
import { toIsbn13 } from '../src/index.js'

test('the result carries a check digit computed for the thirteen-digit form', () => {
  assert.equal(toIsbn13('0306406152'), '9780306406157')
  assert.equal(toIsbn13('0132350882'), '9780132350884')
})

test('an X check digit, upper or lower case, converts like any other', () => {
  assert.equal(toIsbn13('0-8044-2957-X'), '9780804429573')
  assert.equal(toIsbn13('080442957x'), '9780804429573')
})

test('the input check digit is trusted, not re-verified', () => {
  assert.equal(toIsbn13('0306406159'), '9780306406157')
  assert.equal(toIsbn13('0306406150'), '9780306406157')
})

test('input that is not isbn-10 shaped converts to null', () => {
  assert.equal(toIsbn13('123'), null)
  assert.equal(toIsbn13('9780306406157'), null)
  assert.equal(toIsbn13(''), null)
})
