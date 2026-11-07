#!/usr/bin/env node
/**
 * estimate-gain â€” model what the optimized presets change, from real session logs.
 *
 * Two levers are estimable from data:
 *
 *   A. Result folding. The tool-result pruner keeps head+tail of any result over
 *      a threshold. Shipped: over 8192 chars -> 4096+1024. Optimized: over 6000 -> 3000+800.
 *      Modelling both policies over the results that actually entered a session's
 *      context gives the growing-context delta.
 *
 *   B. Tool catalog. Removing plugin rows removes their tool schemas from the
 *      fixed prefix. Per-tool schema cost is measured from a native session's
 *      recorded request header.
 *
 * Fixed-prefix deltas are shown raw; note they are charged at cache-hit rates
 * after the first request, so their real billing impact is a fraction of the
 * token delta. Growing-context deltas are charged at full rate on every request.
 *
 * This is a MODEL over logged content, not a provider measurement.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { zstdDecompressSync } from 'node:zlib'
import { join } from 'node:path'
import { dshHome, sessionPreset } from './lib-yaml.mjs'

const MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])
function frames(buf) {
  const offs = []; let i = buf.indexOf(MAGIC, 0)
  while (i !== -1) { offs.push(i); i = buf.indexOf(MAGIC, i + 4) }
  const out = []
  for (let k = 0; k < offs.length; k++) {
    const end = k + 1 < offs.length ? offs[k + 1] : buf.length
    try { out.push(zstdDecompressSync(buf.subarray(offs[k], end))) } catch {}
  }
  return Buffer.concat(out)
}
function events(dir) {
  for (const c of ['session.v3.jsonl.zstd', 'session.v2.jsonl.zstd', 'session.jsonl.zstd']) {
    const f = join(dir, c)
    if (existsSync(f)) return frames(readFileSync(f)).toString('utf8').split('\n').filter(Boolean)
      .map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  }
  return null
}
const toks = (chars) => Math.round(chars / 4)
const fmt = (n) => n.toLocaleString('en-US')

// --- the two folding policies -------------------------------------------------
const OLD = { threshold: 8192, head: 4096, tail: 1024 }
const NEW = { threshold: 6000, head: 3000, tail: 800 }
const kept = (len, p) => (len > p.threshold ? p.head + p.tail : len)

const root = join(process.env.DSH_HOME || join(process.env.USERPROFILE ?? '', '.dsh'), 'sessions')
const wantPreset = process.argv[2] ?? 'ptc'
const found = []
for (const ws of readdirSync(root)) {
  const wsDir = join(root, ws)
  if (!statSync(wsDir).isDirectory()) continue
  for (const sid of readdirSync(wsDir)) {
    const dir = join(wsDir, sid)
    if (!statSync(dir).isDirectory()) continue
    const evs = events(dir)
    if (!evs || !evs.length) continue
    const preset = sessionPreset(evs).preset
    found.push({ sid, dir, evs, preset, mtime: statSync(dir).mtimeMs })
  }
}
found.sort((a, b) => b.mtime - a.mtime)

// --- per-tool schema cost, measured from a native session's recorded header ----
let perTool = null, nativeTools = []
for (const s of found) {
  if (s.preset) continue
  const h = s.evs.find(e => e.type === 'request/header')
  const tools = h?.data?.header?.tools
  if (Array.isArray(tools) && tools.length > 8) {
    nativeTools = tools
    perTool = tools.map(t => ({ name: t.name, tokens: toks(JSON.stringify(t).length) }))
    break
  }
}

console.log('='.repeat(72))
console.log('LEVER B - tool catalog (fixed prefix)')
console.log('='.repeat(72))
if (perTool) {
  const total = perTool.reduce((a, t) => a + t.tokens, 0)
  console.log('measured from a native session: ' + perTool.length + ' tool schemas, ' +
              fmt(total) + ' tokens total, ' + fmt(Math.round(total / perTool.length)) + ' tokens/tool average')
  console.log()
  console.log('  ' + 'tool'.padEnd(28) + 'tokens'.padStart(8))
  for (const t of [...perTool].sort((a, b) => b.tokens - a.tokens).slice(0, 12)) {
    console.log('  ' + String(t.name).padEnd(28) + fmt(t.tokens).padStart(8))
  }
  const dropped = perTool.filter(t => /^(create_goal|get_goal|update_goal|ralph)$/.test(t.name))
  const droppedSum = dropped.reduce((a, t) => a + t.tokens, 0)
  console.log()
  console.log('  rows removed by the optimized presets: ' + (dropped.map(t => t.name).join(', ') || '(none found in this session)'))
  console.log('  schema tokens removed              : ' + fmt(droppedSum))
} else {
  console.log('  no native session with a recorded tool list found')
}

// --- the presets in scope ------------------------------------------------------
const targets = found.filter(s => s.preset === wantPreset && s.evs.some(e => e.type === 'tool/result'))
console.log()
console.log('='.repeat(72))
console.log('LEVER A - result folding (' + targets.length + ' "' + wantPreset + '" session(s) with results)')
console.log('='.repeat(72))

let agg = { oldKept: 0, newKept: 0, raw: 0, affected: 0, total: 0, worst: [] }
for (const s of targets) {
  for (const e of s.evs) {
    if (e.type !== 'tool/result') continue
    const parts = e.data?.message?.content ?? []
    for (const p of parts) {
      const text = (p?.content ?? []).map(c => c?.text ?? '').join('')
      if (!text) continue
      const len = text.length
      agg.raw += len; agg.total++
      const o = kept(len, OLD), n = kept(len, NEW)
      agg.oldKept += o; agg.newKept += n
      if (n < o) { agg.affected++; agg.worst.push([len, o - n]) }
    }
  }
}
const savedChars = agg.oldKept - agg.newKept
console.log('  tool results entering context : ' + fmt(agg.total))
console.log('  total raw characters          : ' + fmt(agg.raw))
console.log('  retained, shipped policy      : ' + fmt(agg.oldKept) + ' chars  (~' + fmt(toks(agg.oldKept)) + ' tok)')
console.log('  retained, optimized policy    : ' + fmt(agg.newKept) + ' chars  (~' + fmt(toks(agg.newKept)) + ' tok)')
console.log('  results additionally folded   : ' + fmt(agg.affected) + ' of ' + fmt(agg.total))
console.log('  SAVED per full re-read        : ' + fmt(savedChars) + ' chars  (~' + fmt(toks(savedChars)) + ' tok)')
if (agg.oldKept) console.log('  reduction in retained results : ' + ((savedChars / agg.oldKept) * 100).toFixed(1) + '%')

