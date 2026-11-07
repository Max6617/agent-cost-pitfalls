#!/usr/bin/env node
/**
 * test-usage-proxy — end-to-end check that the proxy forwards, streams and logs
 * normalised cache fields. Runs against a local fake upstream; no API spend.
 */
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
// Unique per run, inside results/_scratch; nothing is deleted. See test-gateway.mjs.
const log = join(here, '..', 'results', '_scratch', 'proxy-selftest-' + Date.now() + '.jsonl')
mkdirSync(join(here, '..', 'results', '_scratch'), { recursive: true })

const USAGE = { prompt_tokens: 12000, completion_tokens: 300, prompt_cache_hit_tokens: 10000, prompt_cache_miss_tokens: 2000 }

// fake upstream: one non-streaming JSON response and one SSE stream
const upstream = createServer((req, res) => {
  let body = ''
  req.on('data', c => { body += c })
  req.on('end', () => {
    const stream = body.includes('"stream":true')
    if (!stream) {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ id: 'x', usage: USAGE, choices: [{ message: { role: 'assistant', content: 'hi' } }] }))
    } else {
      res.writeHead(200, { 'content-type': 'text/event-stream' })
      res.write('data: {"choices":[{"delta":{"content":"hi"}}]}\n\n')
      res.write('data: ' + JSON.stringify({ choices: [], usage: USAGE }) + '\n\n')
      res.write('data: [DONE]\n\n')
      res.end()
    }
  })
})
await new Promise(r => upstream.listen(8899, '127.0.0.1', r))

const proxy = spawn(process.execPath, [join(here, 'usage-proxy.mjs'), '--port', '8787',
  '--upstream', 'http://127.0.0.1:8899', '--log', log, '--run-id', 'selftest'], { stdio: 'ignore' })
await new Promise(r => setTimeout(r, 600))

async function call(stream) {
  const res = await fetch('http://127.0.0.1:8787/v1/chat/completions', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'deepseek-flash', stream, messages: [{ role: 'user', content: 'hi' }] }),
  })
  return (await res.text()).length
}
const a = await call(false)
const b = await call(true)
await new Promise(r => setTimeout(r, 300))
proxy.kill(); upstream.close()

const recs = readFileSync(log, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
console.log('records: ' + recs.length + '   (pass-through bytes: ' + a + ', ' + b + ')')
let ok = recs.length === 2
for (const r of recs) {
  const u = r.usage ?? {}
  const good = u.inputTokens === 12000 && u.cacheHitTokens === 10000 && u.cacheMissTokens === 2000 && Math.abs(u.cacheHitRate - 10000 / 12000) < 1e-9
  if (!good) ok = false
  console.log('  stream=' + String(r.stream).padEnd(6) + 'status=' + r.status +
    '  in=' + u.inputTokens + ' hit=' + u.cacheHitTokens + ' miss=' + u.cacheMissTokens +
    ' out=' + u.outputTokens + '  hitRate=' + (u.cacheHitRate * 100).toFixed(1) + '%' +
    '  latency=' + r.latencyMs + 'ms  ' + (good ? 'OK' : 'MISMATCH'))
}
console.log(ok ? '\nSELFTEST PASS - proxy forwards and normalises cache usage for JSON and SSE' : '\nSELFTEST FAIL')
process.exit(ok ? 0 : 1)
