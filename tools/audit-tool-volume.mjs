import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { zstdDecompressSync } from 'node:zlib'
import { join } from 'node:path'
import { dshHome, sessionPreset } from './lib-yaml.mjs'
// Code mode is detected from the request header, not from a preset name list: a
// PTC session declares exactly one tool, run_code. Name lists drift; this cannot.
function isCodeMode(e){const t=e.find(x=>x.type==='request/header')?.data?.header?.tools
 return Array.isArray(t)&&t.length===1&&t[0]?.name==='run_code'}
const MAGIC = Buffer.from([0x28,0xb5,0x2f,0xfd])
function frames(buf){const o=[];let i=buf.indexOf(MAGIC,0);while(i!==-1){o.push(i);i=buf.indexOf(MAGIC,i+4)}
const out=[];for(let k=0;k<o.length;k++){const e=k+1<o.length?o[k+1]:buf.length;try{out.push(zstdDecompressSync(buf.subarray(o[k],e)))}catch{}}return Buffer.concat(out)}
function evs(dir){for(const c of ['session.v3.jsonl.zstd','session.v2.jsonl.zstd','session.jsonl.zstd']){const f=join(dir,c)
 if(existsSync(f))return frames(readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(Boolean)}return null}
const root = join(dshHome(), 'sessions')
const byTool = new Map(); const byToolCount = new Map(); let sessions = 0
const fetchCalls = []
for (const ws of readdirSync(root)) {
  const wsDir = join(root, ws); if (!statSync(wsDir).isDirectory()) continue
  for (const sid of readdirSync(wsDir)) {
    const dir = join(wsDir, sid); if (!statSync(dir).isDirectory()) continue
    const e = evs(dir); if (!e || !e.length) continue
    if (isCodeMode(e)) continue     // native-presentation sessions only
    const names = new Map()
    for (const x of e) if (x.type==='tool/call') names.set(x.data?.callId, x.data?.name)
    let used = false
    for (const x of e) {
      if (x.type !== 'tool/result') continue
      const cid = x.data?.message?.source?.callId
      const name = names.get(cid) ?? '(unknown)'
      const text = (x.data?.message?.content ?? []).map(p=>(p?.content??[]).map(c=>c?.text??'').join('')).join('')
      if (!text) continue
      used = true
      byTool.set(name, (byTool.get(name) ?? 0) + text.length)
      byToolCount.set(name, (byToolCount.get(name) ?? 0) + 1)
      if (name === 'web_fetch') fetchCalls.push(text.length)
    }
    if (used) sessions++
  }
}
const tok = c => Math.round(c/4)
const fmt = n => n.toLocaleString('en-US')
const total = [...byTool.values()].reduce((a,b)=>a+b,0)
console.log('NATIVE-EQUIVALENT SESSIONS: ' + sessions + '   total tool-result chars: ' + fmt(total) + ' (~' + fmt(tok(total)) + ' tok)')
console.log()
console.log('  ' + 'tool'.padEnd(22) + 'calls'.padStart(7) + 'chars'.padStart(12) + 'tokens'.padStart(11) + 'share'.padStart(8) + 'avg tok'.padStart(9))
for (const [n,c] of [...byTool].sort((a,b)=>b[1]-a[1]).slice(0,14)) {
  console.log('  ' + n.padEnd(22) + String(byToolCount.get(n)).padStart(7) + fmt(c).padStart(12) +
    fmt(tok(c)).padStart(11) + ((c/total)*100).toFixed(1).padStart(7)+'%' + fmt(Math.round(tok(c)/byToolCount.get(n))).padStart(9))
}
if (fetchCalls.length) {
  const over = fetchCalls.filter(c=>c>40000)
  const capped = fetchCalls.reduce((a,c)=>a+Math.min(c,40000),0)
  const raw = fetchCalls.reduce((a,c)=>a+c,0)
  console.log()
  console.log('WEB FETCH (host cap maxBodyChars is 100,000 by default; staged patch lowers it to 40,000)')
  console.log('  calls                 : ' + fetchCalls.length)
  console.log('  results over 40,000 ch: ' + over.length + '  (' + ((over.length/fetchCalls.length)*100).toFixed(0) + '%)')
  console.log('  raw chars             : ' + fmt(raw) + '  (~' + fmt(tok(raw)) + ' tok)')
  console.log('  at a 40,000 cap       : ' + fmt(capped) + '  (~' + fmt(tok(capped)) + ' tok)')
  console.log('  SAVED                 : ' + fmt(raw-capped) + ' chars  (~' + fmt(tok(raw-capped)) + ' tok, ' + (((raw-capped)/raw)*100).toFixed(1) + '% of fetch volume)')
  console.log('  largest fetch         : ' + fmt(Math.max(...fetchCalls)) + ' chars (~' + fmt(tok(Math.max(...fetchCalls))) + ' tok)')
}
