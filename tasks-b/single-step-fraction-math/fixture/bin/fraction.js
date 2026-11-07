#!/usr/bin/env node
/**
 * Evaluate one fraction expression.
 *
 *   node bin/fraction.js '1 1/2' + '3/4'
 *   node bin/fraction.js '2/3' / '4/5'
 *   node bin/fraction.js --mixed '-7/3'
 */
import { fromString, add, sub, mul, div, toString, toMixedString } from '../src/index.js'

const OPS = { '+': add, '-': sub, '*': mul, '/': div }

function fail() {
  console.error('usage: node bin/fraction.js <value> <+ - * /> <value>')
  console.error('       node bin/fraction.js --mixed <value>')
  process.exit(1)
}

const args = process.argv.slice(2)

if (args[0] === '--mixed') {
  if (args.length !== 2) fail()
  console.log(toMixedString(fromString(args[1])))
} else {
  if (args.length !== 3 || !(args[1] in OPS)) fail()
  const op = OPS[args[1]]
  console.log(toString(op(fromString(args[0]), fromString(args[2]))))
}
