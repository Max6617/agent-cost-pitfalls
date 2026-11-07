#!/usr/bin/env node
/**
 * preview - show how the surfaces render a text.
 *
 *   node bin/preview.js "the text to preview on every surface"
 *   node bin/preview.js sms "a text for one surface only"
 */
import {
  SURFACES, lengthOf,
  smsPreview, pushPreview, emailSubject, logLine, tableCell,
} from '../src/index.js'
import { padEnd, rule } from '../src/util/columns.js'

const renderers = {
  sms: smsPreview,
  push: pushPreview,
  email: emailSubject,
  log: logLine,
  table: tableCell,
}

const args = process.argv.slice(2)
const [surface, text] = args.length === 1 ? [null, args[0]] : args

if (!text || (surface && !renderers[surface])) {
  console.error('usage: node bin/preview.js [surface] "text"')
  console.error('surfaces: ' + Object.keys(renderers).join(', '))
  process.exit(1)
}

const rows = (surface ? SURFACES.filter((s) => s.id === surface) : SURFACES)
  .map((s) => [s.id, String(s.limit), renderers[s.id](text)])

const widths = [8, 5, Math.max(7, ...rows.map((r) => lengthOf(r[2])))]
console.log(padEnd('surface', widths[0]) + '  ' + padEnd('limit', widths[1]) + '  preview')
console.log(rule(widths))
for (const [id, limit, preview] of rows) {
  console.log(padEnd(id, widths[0]) + '  ' + padEnd(limit, widths[1]) + '  ' + preview)
}
