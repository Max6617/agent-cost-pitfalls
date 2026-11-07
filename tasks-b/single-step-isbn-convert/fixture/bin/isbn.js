#!/usr/bin/env node
// Manual check helper for the catalogue team:
//   node bin/isbn.js 978-0-306-40615-7
import {
  isValidIsbn10,
  isValidIsbn13,
  toIsbn13,
  toIsbn10,
  hyphenateIsbn13,
} from '../src/index.js'

const arg = process.argv[2]
if (!arg) {
  console.error('usage: node bin/isbn.js <isbn>')
  process.exit(2)
}

console.log('isbn-10 valid :', isValidIsbn10(arg))
console.log('isbn-13 valid :', isValidIsbn13(arg))
console.log('as isbn-13    :', toIsbn13(arg) ?? '(none)')
console.log('as isbn-10    :', toIsbn10(arg) ?? '(none)')
console.log('hyphenated    :', hyphenateIsbn13(arg) ?? '(none)')
