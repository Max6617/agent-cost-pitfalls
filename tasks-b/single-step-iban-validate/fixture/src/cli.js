#!/usr/bin/env node
/**
 * iban — command-line front end.
 *
 *   node src/cli.js <iban>                validate and print the verdict
 *   node src/cli.js --build <cc> <bban>   generate an IBAN from a BBAN
 */
import { validate, buildIban, toPrintable } from './index.js'

const args = process.argv.slice(2)

if (args[0] === '--build') {
  const iban = buildIban(args[1] ?? '', args[2] ?? '')
  if (iban === null) {
    console.error('cannot build: unknown country or malformed BBAN')
    process.exit(2)
  }
  console.log(toPrintable(iban))
} else if (args.length === 1) {
  const result = validate(args[0])
  if (result.ok) {
    console.log('valid   ' + toPrintable(result.iban))
  } else {
    console.log('invalid (' + result.reason + ')')
    process.exit(1)
  }
} else {
  console.error('usage: node src/cli.js [--build <cc> <bban>] <iban>')
  process.exit(2)
}
