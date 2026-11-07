#!/usr/bin/env node
/**
 * unidiff - the command line the merge bot and the on-call engineer use.
 *
 * The bot pipes one JSON request per line on stdin and reads one JSON response
 * per line on stdout, so a stuck apply can be reproduced by hand without
 * standing up the service:
 *
 *   echo '{"op":"diff","from":"a\n","to":"b\n"}' | node bin/unidiff.js
 *   echo '{"op":"apply","from":"a\n","patch":"..."}' | node bin/unidiff.js
 *
 * Nothing here touches the filesystem: the caller owns the checkout, this owns
 * the text.
 */
import { buildDiff, applyPatch, diffstat } from '../src/index.js'

function handle(request) {
  if (request.op === 'diff') {
    const patch = buildDiff(request.from ?? '', request.to ?? '', request.options ?? {})
    return { patch, ...diffstat(patch) }
  }
  if (request.op === 'apply') {
    const result = applyPatch(request.from ?? '', request.patch ?? '', request.options ?? {})
    return { ok: result.ok, text: result.text, applied: result.applied, errors: result.errors }
  }
  return { error: 'unknown op: ' + String(request.op) }
}

let buffer = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => {
  buffer += chunk
})
process.stdin.on('end', () => {
  for (const line of buffer.split('\n')) {
    if (line.trim() === '') continue
    try {
      process.stdout.write(JSON.stringify(handle(JSON.parse(line))) + '\n')
    } catch (error) {
      process.stdout.write(JSON.stringify({ error: error.message }) + '\n')
    }
  }
})
