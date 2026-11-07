#!/usr/bin/env node
/**
 * Support console.
 *
 *   node bin/console.js '{"op":"patch","record":{"id":"p1"},"patch":{"phone":null}}'
 *
 * One JSON request in, one JSON answer out, so the console can be scripted from
 * the support runbook. Every op is a thin wrapper over src/index.js - if the
 * console and the library ever disagree about a field, the library is right.
 */
import {
  applyPatch, diffRecords, exportCsv, importCsv, parseFilter, search, serialize, deserialize,
} from '../src/index.js'

const OPS = ['patch', 'serialize', 'deserialize', 'diff', 'search', 'export', 'import']

export function run(request) {
  switch (request?.op) {
    case 'patch':
      return { result: applyPatch(request.record ?? {}, request.patch ?? {}) }
    case 'serialize':
      return { result: serialize(request.record ?? {}) }
    case 'deserialize':
      return { result: deserialize(request.text ?? '{}') }
    case 'diff':
      return { result: diffRecords(request.left ?? {}, request.right ?? {}) }
    case 'search':
      return { result: search(request.rows ?? [], parseFilter(request.query ?? '')) }
    case 'export':
      return { result: exportCsv(request.rows ?? []) }
    case 'import':
      return { result: importCsv(request.text ?? '') }
    default:
      return { error: 'usage: console.js <json> with op in ' + OPS.join(', ') }
  }
}

const raw = process.argv[2]
if (raw === undefined) {
  console.log(JSON.stringify({ error: 'usage: console.js <json> with op in ' + OPS.join(', ') }))
  process.exit(2)
}

let request
try {
  request = JSON.parse(raw)
} catch (error) {
  console.log(JSON.stringify({ error: 'request is not JSON: ' + error.message }))
  process.exit(2)
}

console.log(JSON.stringify(run(request), null, 2))
