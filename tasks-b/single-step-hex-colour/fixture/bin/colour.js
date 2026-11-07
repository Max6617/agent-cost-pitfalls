#!/usr/bin/env node
/**
 * colour <text> [...] - print the canonical hex for each argument.
 *
 * The theme pipeline's pre-commit check runs this over every colour literal in
 * a change so that reviews see one canonical spelling.
 */
import { parse, toHex } from '../src/index.js'

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('usage: colour <text> [...]')
  process.exit(2)
}

let failed = false
for (const arg of args) {
  const hex = toHex(parse(arg))
  if (hex === null) {
    console.error('not a colour: ' + arg)
    failed = true
  } else {
    console.log(hex)
  }
}
process.exit(failed ? 1 : 0)
