#!/usr/bin/env node
/**
 * test-gateway — end-to-end check of attribution, model enforcement, usage
 * capture and the Responses-API bridge, against a local fake upstream.
 * No API spend.
 */
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
// A UNIQUE log per self-test run, inside results/_scratch.
//
// This used to delete results/gateway-selftest.jsonl before each run - a delete of a *.jsonl
// inside the evidence directory, which is precisely the class of call that destroyed the
// study. Nothing is deleted now: each run writes its own file, and they are all evidence.
const log = join(here, '..', 'results', '_scratch', 'gateway-selftest-' + Date.now() + '.jsonl')
mkdirSync(join(here, '..', 'results', '_scratch'), { recursive: true })

// Use ports that are very unlikely to be taken. An earlier version bound 8787,
// the same port a real gateway uses, so the self-test failed with a confusing
// ENOENT about a missing log file whenever one was already running - it looked
// like a broken gateway rather than a port clash.
const PORT = 8801
const JUDGE_PORT = 8802
const UPSTREAM_PORT = 8803

const USAGE = { prompt_tokens: 20000, completion_tokens: 500,
  prompt_cache_hit_tokens: 16000, prompt_cache_miss_tokens: 4000 }
const seen = []

const upstream = createServer((req, res) => {
  let body = ''
  req.on('data', c => { body += c })
  req.on('end', () => {
    seen.push({ path: req.url, auth: req.headers.authorization, body: JSON.parse(body || '{}') })
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ id: 'chatcmpl-1', usage: USAGE,
      choices: [{ message: { role: 'assistant', content: 'done' } }] }))
  })
})
await new Promise(r => upstream.listen(UPSTREAM_PORT, '127.0.0.1', r))

// A second upstream stands in for a decision-model provider (a different host).
const judge = createServer((req, res) => {
  let body = ''
  req.on('data', c => { body += c })
  req.on('end', () => {
    seen.push({ path: req.url, auth: req.headers.authorization, body: JSON.parse(body || '{}'), judge: true })
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ id: 'j-1', usage: USAGE,
      choices: [{ message: { role: 'assistant', content: '{"p":0.83}' } }] }))
  })
})
await new Promise(r => judge.listen(JUDGE_PORT, '127.0.0.1', r))

const gw = spawn(process.execPath, [join(here, 'measure-gateway.mjs'),
  '--port', String(PORT), '--upstream', 'http://127.0.0.1:' + UPSTREAM_PORT, '--log', log,
  '--force-model', 'deepseek-flash', '--force-effort', 'high',
  '--exempt', 'jev', '--upstream-for', 'jev=http://127.0.0.1:' + JUDGE_PORT],
  { stdio: 'ignore', env: { ...process.env, DEEPSEEK_API_KEY: 'sk-real-secret' } })
await new Promise(r => setTimeout(r, 700))

const key = 'exp-opencode-r001'
const chat = await (await fetch('http://127.0.0.1:' + PORT + '/v1/chat/completions', {
  method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
  body: JSON.stringify({ model: 'deepseek-pro', messages: [{ role: 'user', content: 'hi' }] }),
})).json()

const resp = await (await fetch('http://127.0.0.1:' + PORT + '/v1/responses', {
  method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer exp-codex-r002' },
  body: JSON.stringify({ model: 'deepseek-pro', instructions: 'be terse',
    input: [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: 'hi' }] }] }),
})).json()

// REGRESSION: a run id containing a segment that starts with "r".
//
// The old attribution regex, /^exp-(.+?)-(r[0-9a-z_.-]+)$/, took the SHORTEST
// harness for which the next segment began with "r", so this key was filed as
// harness "opencode-<matrix>-opencode-fetch-heavy-semver" with runId
// "ranges-...". Nothing failed; the usage just went somewhere no experiment
// looked, so the task measured zero cost. Real task names hit this - every
// "repo-wide-*" task too, via its "repo" segment.
const trickyKey = 'exp-opencode-mmumpnnkv-opencode-fetch-heavy-semver-ranges-opencode-s1'
await fetch('http://127.0.0.1:' + PORT + '/v1/chat/completions', {
  method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + trickyKey },
  body: JSON.stringify({ model: 'deepseek-flash', messages: [{ role: 'user', content: 'hi' }] }),
})

// The decision model asks for its own model and must NOT be rewritten.
const judged = await (await fetch('http://127.0.0.1:' + PORT + '/v1/chat/completions', {
  method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer exp-jev-r003' },
  body: JSON.stringify({ model: 'jev-latest', messages: [{ role: 'user', content: 'classify' }] }),
})).json()

const stats = await (await fetch('http://127.0.0.1:' + PORT + '/__stats')).json()
await new Promise(r => setTimeout(r, 300))
gw.kill(); upstream.close(); judge.close()

const recs = readFileSync(log, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
const checks = []
const ck = (name, cond, detail) => { checks.push({ name, ok: !!cond, detail }); }

ck('attribution parsed harness+runId', recs[0]?.harness === 'opencode' && recs[0]?.runId === 'r001',
   'got ' + recs[0]?.harness + '/' + recs[0]?.runId)
const tricky = recs.find(r => r.syntheticKey === trickyKey)
ck('run id with an r-segment attributes to the FIRST segment',
  tricky?.harness === 'opencode' && tricky?.runId === 'mmumpnnkv-opencode-fetch-heavy-semver-ranges-opencode-s1',
  'got ' + tricky?.harness + ' / ' + tricky?.runId)
ck('synthetic key replaced by real key', seen[0]?.auth === 'Bearer sk-real-secret', 'upstream saw ' + seen[0]?.auth)
ck('model enforced to deepseek-flash', seen[0]?.body.model === 'deepseek-flash', 'upstream saw ' + seen[0]?.body.model)
ck('deviation recorded', (recs[0]?.deviations ?? []).some(d => d.field === 'model' && d.from === 'deepseek-pro'),
   JSON.stringify(recs[0]?.deviations))
ck('usage captured with cache split', recs[0]?.usage?.cacheHitTokens === 16000 && recs[0]?.usage?.cacheMissTokens === 4000,
   'hit=' + recs[0]?.usage?.cacheHitTokens + ' miss=' + recs[0]?.usage?.cacheMissTokens)
ck('cost computed', recs[0]?.cost?.billedUsd > 0 && recs[0]?.cost?.coldUsd > recs[0]?.cost?.billedUsd,
   'billed=' + recs[0]?.cost?.billedUsd?.toFixed(6) + ' cold=' + recs[0]?.cost?.coldUsd?.toFixed(6))
ck('Responses request translated to chat', seen[1]?.path === '/v1/chat/completions' && seen[1]?.body.messages?.[0]?.role === 'system',
   'path=' + seen[1]?.path + ' msgs=' + JSON.stringify(seen[1]?.body.messages?.map(m => m.role)))
ck('Responses-shaped reply returned', resp?.object === 'response' && resp?.output?.[0]?.content?.[0]?.text === 'done',
   'object=' + resp?.object + ' text=' + resp?.output?.[0]?.content?.[0]?.text)
ck('second harness attributed separately', stats.harnesses?.some(h => h.harness === 'codex'), JSON.stringify(stats.harnesses?.map(h => h.harness)))
ck('stats accumulate tokens', (stats.harnesses ?? []).every(h => h.inputTokens > 0), JSON.stringify(stats.harnesses))

const jevReq = seen.find(s => s.judge)
const jevRec = recs.find(r => r.harness === 'jev')
ck('exempt harness is NOT model-rewritten', jevReq?.body.model === 'jev-latest',
   'decision model asked for jev-latest, upstream saw ' + jevReq?.body.model)
ck('exempt harness routed to its own upstream', jevRec?.upstream === 'http://127.0.0.1:' + JUDGE_PORT,
   'routed to ' + jevRec?.upstream)
ck('exempt harness marked unenforced', jevRec?.enforced === false, 'enforced=' + jevRec?.enforced)
ck('exempt harness still attributed and priced',
   jevRec?.harness === 'jev' && jevRec?.runId === 'r003' && jevRec?.cost?.billedUsd > 0,
   JSON.stringify({ h: jevRec?.harness, r: jevRec?.runId, cost: jevRec?.cost?.billedUsd }))
ck('decision-model traffic is separated in stats', stats.harnesses?.some(h => h.harness === 'jev'),
   JSON.stringify(stats.harnesses?.map(h => h.harness)))

console.log('GATEWAY SELFTEST')
for (const c of checks) console.log('  ' + (c.ok ? 'PASS' : 'FAIL') + '  ' + c.name + (c.ok ? '' : '   -> ' + c.detail))
const ok = checks.every(c => c.ok)
console.log('\n' + (ok ? 'ALL PASS' : 'FAILURES PRESENT') + '  (' + recs.length + ' logged records)')
process.exit(ok ? 0 : 1)
