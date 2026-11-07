// Sub-problem 5: conversion from ISBN-13 back to ISBN-10.
import test from 'node:test'
import assert from 'node:assert/strict'
import { toIsbn10 } from '../src/index.js'

test('the isbn-10 form carries a freshly computed check digit', () => {
  assert.equal(toIsbn10('9780306406157'), '0306406152')
  assert.equal(toIsbn10('9780132350884'), '0132350882')
})

test('separated input converts identically', () => {
  assert.equal(toIsbn10('978-0-306-40615-7'), '0306406152')
  assert.equal(toIsbn10('978 0 13 235088 4'), '0132350882')
})

test('the fresh check digit can be the letter X', () => {
  assert.equal(toIsbn10('9780804429573'), '080442957X')
  assert.equal(toIsbn10('9781438272917'), '143827291X')
})

test('only the 978 prefix has an isbn-10 form', () => {
  assert.equal(toIsbn10('9791090632257'), null)
  assert.equal(toIsbn10('978'), null)
  assert.equal(toIsbn10('123'), null)
})
