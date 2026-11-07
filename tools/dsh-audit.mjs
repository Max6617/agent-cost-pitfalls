#!/usr/bin/env node
/**
 * dsh-audit â€” measure where a DeepSeek Harness session spends its context.
 *
 * Reads the durable session logs under $DSH_HOME/sessions (zstd-compressed,
 * concatenated frames) and reports, per session:
 *
 *   1. Context composition  â€” characters and estimated tokens per category
 *                             (system prompt, user, assistant text, tool-call
 *                             arguments, tool results), so the top consumer is
 *                             named rather than guessed.
 *   2. PTC batching         â€” model requests vs tool sub-calls. In PTC mode the
 *                             gap is the round trips the code-mode surface saved.
 *   3. Cache-risk audit     â€” volatile patterns in the request header and system
 *                             prompt that would break a byte-exact cached prefix.
 *
 * Honest limitation: DSH does not log per-request provider usage, so a true
 * provider cache-hit rate is NOT derivable here. Token counts are estimates
 * from character counts (CJK-aware); use them for composition and ranking,
 * not for billing.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { zstdDecompressSync } from 'node:zlib'
import { join, basename } from 'node:path'
import { sessionPreset } from './lib-yaml.mjs'

const MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])

/** Session logs are a concatenation of zstd frames; zstdDecompressSync reads one. */
function decompressFrames(buf) {
  const offs = []
  let i = buf.indexOf(MAGIC, 0)
  while (i !== -1) { offs.push(i); i = buf.indexOf(MAGIC, i + 4) }
  const out = []
  for (let k = 0; k < offs.length; k++) {
    const end = k + 1 < offs.length ? offs[k + 1] : buf.length
    try { out.push(zstdDecompressSync(buf.subarray(offs[k], end))) } catch { /* false magic in payload */ }
  }
  return Buffer.concat(out)
}

function readEvents(file) {
  const raw = decompressFrames(readFileSync(file)).toString('utf8')
  return raw.split('\n').filter(Boolean).map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
}

/** Character count that separates CJK (roughly one token per character) from the rest. */
function measure(text) {
  let cjk = 0, other = 0
  for (const ch of text) {
    const c = ch.codePointAt(0)
    if ((c >= 0x3000 && c <= 0x9fff) || (c >= 0xf900 && c <= 0xfaff) || (c >= 0xac00 && c <= 0xd7af)) cjk++
    else other++
  }
  return { chars: cjk + other, cjk, other, tokens: cjk + Math.round(other / 4) }
}

const fmt = n => n.toLocaleString('en-US')

function textOf(content) {
  if (!Array.isArray(content)) return ''
  return content.map(c => (typeof c === 'string' ? c : (c?.text ?? ''))).join('')
}

const CACHE_RISKS = [
  ['ISO timestamp',        /\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/],
  ['clock time',           /\b\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM|am|pm)?\b/],
  ['date only',            /\b\d{4}-\d{2}-\d{2}\b/],
  ['UUID',                 /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i],
  ['epoch millis',         /\b1[6-9]\d{11}\b/],
  ['relative time wording', /\b(today|tonight|yesterday|tomorrow|right now|currently|at the moment)\b/i],
  ['step/turn counter',    /\b(step|turn)\s+\d+\s*(of|\/)\s*\d+/i],
  ['uptime/duration',      /\b(uptime|elapsed|since startup|running for)\b/i],
  ['temp path',            /\b(Temp|tmp)[\\/][A-Za-z0-9._-]{6,}/],
]

function auditSession(dir, name) {
  const candidates = ['session.v3.jsonl.zstd', 'session.v2.jsonl.zstd', 'session.v1.jsonl.zstd', 'session.jsonl.zstd']
  const file = candidates.map(c => join(dir, c)).find(existsSync)
  if (!file) return null
  let events
  try { events = readEvents(file) } catch { return null }
  if (!events.length) return null

  const cat = { system: 0, user: 0, assistant: 0, toolArgs: 0, toolResults: 0 }
  const catTok = { system: 0, user: 0, assistant: 0, toolArgs: 0, toolResults: 0 }
  const add = (k, text) => { const m = measure(text); cat[k] += m.chars; catTok[k] += m.tokens; return m }

  const header = events.find(e => e.type === 'request/header')
  const context = events.find(e => e.type === 'request/context')
  // The creation header carries the starting preset TOP-LEVEL; a switch appends an
// event. See sessionPreset() in lib-yaml.mjs for why this matters.
const presetInfo = sessionPreset(events)
  const session = events.find(e => e.type === 'session')

  let steps = 0, turns = 0, toolCalls = 0, ptcSubCalls = 0, userMsgs = 0, spliced = 0
  let contextResultChars = 0, containedChars = 0
  const subCallNames = new Map()
  const callNames = new Map()
  const bigResults = []
  const toolArgChars = []

  for (const e of events) {
    switch (e.type) {
      case 'step/start': steps++; break
      case 'turn/start': turns++; break
      case 'user/message': userMsgs++; add('user', textOf(e.data?.content)); break
      case 'agent/inbox/spliced': spliced += (e.data?.inserted ?? []).length; break
      case 'system/message':
        add('system', textOf(e.data?.message?.content)); break
      case 'assistant/message': {
        const c = e.data?.message?.content ?? []
        add('assistant', textOf(c))
        for (const part of c) if (part?.type === 'tool-call') add('toolArgs', String(part.arguments ?? ''))
        break
      }
      case 'tool/call': toolCalls++; callNames.set(e.data?.callId, e.data?.name); break
      case 'tool/ptc-dispatch': {
        ptcSubCalls++
        const n = e.data?.name ?? '?'
        subCallNames.set(n, (subCallNames.get(n) ?? 0) + 1)
        // A sub-call's arguments and result live inside the program, not the conversation.
        containedChars += JSON.stringify(e.data ?? {}).length
        break
      }
      case 'tool/result': {
        const s = JSON.stringify(e.data ?? {})
        contextResultChars += s.length
        const m = add('toolResults', s)
        const cid = e.data?.message?.source?.callId
        bigResults.push([callNames.get(cid) ?? e.data?.name ?? cid ?? '(unknown)', m.chars, m.tokens])
        break
      }
    }
  }
  if (header) {
    const tools = header.data?.header?.tools ?? []
    const m = measure(JSON.stringify(tools))
    cat.toolSchemas = m.chars; catTok.toolSchemas = m.tokens
  }

  // Cache-risk: scan the parts of the prefix that must stay byte-stable.
  const prefixText = [
    JSON.stringify(header?.data?.header ?? {}),
    events.filter(e => e.type === 'system/message').map(e => textOf(e.data?.message?.content)).join('\n'),
  ].join('\n')
  const risks = CACHE_RISKS.filter(([, re]) => re.test(prefixText)).map(([label]) => label)

  return {
    name, preset: presetInfo.preset ?? '(unrecorded)', startedAs: presetInfo.startedAs,
    switchedPreset: presetInfo.switched,
    model: context?.model ?? header?.data?.header?.config?.model ?? '?',
    provider: context?.provider ?? header?.data?.header?.config?.provider ?? '?',
    reasoningEffort: header?.data?.header?.config?.reasoningEffort ?? '-',
    tools: (header?.data?.header?.tools ?? []).length,
    contextWindow: context?.contextWindow,
    turns, steps, toolCalls, ptcSubCalls, userMsgs, spliced,
    cat, catTok, bigResults, subCallNames, risks, contextResultChars, containedChars,
    file,
  }
}

function report(s) {
  const totalTok = Object.values(s.catTok).reduce((a, b) => a + b, 0)
  const pct = v => totalTok ? ((v / totalTok) * 100).toFixed(1).padStart(5) + '%' : '   - '
  console.log('\n' + '='.repeat(78))
  console.log('SESSION ' + s.name + '   preset=' + s.preset +
    (s.switchedPreset ? '   (started as ' + s.startedAs + ', switched)' : ''))
  console.log('='.repeat(78))
  console.log('route        : ' + s.provider + '/' + s.model + '  effort=' + s.reasoningEffort +
              (s.contextWindow ? '  window=' + fmt(s.contextWindow) : ''))
  console.log('declared tools: ' + s.tools)
  console.log('activity     : ' + s.turns + ' turns, ' + s.steps + ' model requests, ' +
              s.toolCalls + ' tool calls, ' + s.ptcSubCalls + ' PTC sub-calls, ' +
              s.userMsgs + ' user msgs, ' + s.spliced + ' injected')
  if (s.steps > 0) {
    const ratio = (s.ptcSubCalls / Math.max(1, s.toolCalls)).toFixed(2)
    const saved = Math.max(0, s.ptcSubCalls - s.toolCalls)
    console.log('PTC batching : ' + ratio + ' sub-calls per model tool call' +
                (saved ? '  (~' + saved + ' round trips avoided)' : ''))
    if (s.containedChars) {
      const pctC = ((s.containedChars / (s.containedChars + s.contextResultChars)) * 100).toFixed(1)
      console.log('PTC containment: ' + fmt(s.containedChars) + ' chars stayed inside programs vs ' +
                  fmt(s.contextResultChars) + ' chars of tool results entered context (' + pctC + '% contained)')
    }
  }
  console.log('\ncontext composition (estimated tokens)')
  const rows = [['system prompt', s.catTok.system], ['tool schemas', s.catTok.toolSchemas ?? 0],
                ['tool results', s.catTok.toolResults], ['assistant text', s.catTok.assistant],
                ['tool-call args', s.catTok.toolArgs], ['user messages', s.catTok.user]]
  for (const [label, v] of rows.sort((a, b) => b[1] - a[1]))
    console.log('  ' + label.padEnd(16) + fmt(v).padStart(12) + '  ' + pct(v))
  console.log('  ' + 'TOTAL'.padEnd(16) + fmt(totalTok).padStart(12))
  if (s.bigResults.length) {
    const top = [...s.bigResults].sort((a, b) => b[1] - a[1]).slice(0, 5)
    console.log('\nlargest tool results')
    for (const [n, chars, tok] of top) console.log('  ' + String(n).padEnd(24) + fmt(tok).padStart(10) + ' tok  (' + fmt(chars) + ' chars)')
  }
  if (s.subCallNames.size) {
    const top = [...s.subCallNames].sort((a, b) => b[1] - a[1]).slice(0, 6)
    console.log('\nPTC sub-calls by tool : ' + top.map(([n, c]) => n + 'Ã—' + c).join(', '))
  }
  console.log('\ncache-risk scan of the stable prefix')
  console.log(s.risks.length
    ? '  VOLATILE: ' + s.risks.join(', ') + '\n  -> any of these changing between steps reprices the whole prompt at cache-miss rate.'
    : '  clean â€” no volatile patterns found in the request header or system prompt.')
}

const root = join(process.env.DSH_HOME || join(process.env.USERPROFILE ?? '', '.dsh'), 'sessions')
const args = process.argv.slice(2)
const all = args.includes('--all')
const json = args.includes('--json')

if (!existsSync(root)) { console.error('no sessions dir at ' + root); process.exit(1) }

const found = []
for (const ws of readdirSync(root)) {
  const wsDir = join(root, ws)
  if (!statSync(wsDir).isDirectory()) continue
  for (const sid of readdirSync(wsDir)) {
    const dir = join(wsDir, sid)
    if (!statSync(dir).isDirectory()) continue
    const s = auditSession(dir, sid)
    if (s) { s.workspace = ws; found.push(s) }
  }
}
found.sort((a, b) => statSync(b.file).mtimeMs - statSync(a.file).mtimeMs)

const filtered = all ? found : found.filter(s => s.name.includes('4d84032f') || s.workspace.includes('betterharness')).slice(0, 1)
if (json) { console.log(JSON.stringify(filtered, null, 1)); process.exit(0) }
if (!filtered.length) { console.log('no sessions matched (use --all)'); process.exit(0) }
for (const s of filtered) report(s)
console.log('\n' + found.length + ' sessions total under ' + root)

