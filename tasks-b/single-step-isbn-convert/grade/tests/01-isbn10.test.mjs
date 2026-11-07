// Sub-problem 1: the ISBN-10 check digit and validation of ISBN-10s.
import test from 'node:test'
import assert from 'node:assert/strict'
import { isbn10CheckDigit, isValidIsbn10 } from '../src/index.js'

test('the check digit weights run from ten down to two', () => {
  assert.equal(isbn10CheckDigit('030640615'), '2')
  assert.equal(isbn10CheckDigit('013235088'), '2')
  assert.equal(isbn10CheckDigit('144937332'), '1')
  assert.equal(isbn10CheckDigit('03064061'), null)
})

test('a check value of ten is the letter X', () => {
  assert.equal(isbn10CheckDigit('080442957'), 'X')
  assert.equal(isbn10CheckDigit('143827291'), 'X')
})

test('validation accepts documented separators and either case of the check letter', () => {
  assert.equal(isValidIsbn10('0-306-40615-2'), true)
  assert.equal(isValidIsbn10('0-8044-2957-X'), true)
  assert.equal(isValidIsbn10('080442957x'), true)
})

test('a mismatched check digit fails validation', () => {
  assert.equal(isValidIsbn10('0306406159'), false)
  assert.equal(isValidIsbn10('0132350889'), false)
  assert.equal(isValidIsbn10('0306406150'), false)
})
