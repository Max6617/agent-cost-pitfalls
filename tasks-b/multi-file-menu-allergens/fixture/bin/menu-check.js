#!/usr/bin/env node
/**
 * Prints the guest board for the allergy ids given on the command line:
 *
 *   node bin/menu-check.js peanut sesame
 *
 * With no arguments it prints the board for a guest with no allergies, which
 * doubles as a smoke test that the data files load.
 */
import { createMenu } from '../src/index.js'

const allergies = process.argv.slice(2)
const board = createMenu().safeMenu(allergies)

console.log('allergies : ' + (allergies.join(', ') || '(none)'))
console.log('safe      : ' + board.safe.join(', '))
console.log('warning   : ' + board.warning.join(', '))
console.log('excluded  : ' + board.excluded.join(', '))
