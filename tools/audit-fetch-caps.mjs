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
const sizes = []; let totalToolChars = 0
for (const ws of readdirSync(root)) {
  const wsDir = join(root, ws); if (!statSync(wsDir).isDirectory()) continue
  for (const sid of readdirSync(wsDir)) {
    const dir = join(wsDir, sid); if (!statSync(dir).isDirectory()) continue
    const e = evs(dir); if (!e || !e.length) continue
    if (isCodeMode(e)) continue
    const names = new Map()
    for (const x of e) if (x.type==='tool/call') names.set(x.data?.callId, x.data?.name)
    for (const x of e) {
      if (x.type !== 'tool/result') continue
      const name = names.get(x.data?.message?.source?.callId)
      const text = (x.data?.message?.content ?? []).map(p=>(p?.content??[]).map(c=>c?.text??'').join('')).join('')
      if (!text) continue
      totalToolChars += text.length
      if (name === 'web_fetch') sizes.push(text.length)
    }
  }
}
const tok = c => Math.round(c/4); const fmt = n => n.toLocaleString('en-US')
sizes.sort((a,b)=>a-b)
const raw = sizes.reduce((a,b)=>a+b,0)
const pct = p => sizes[Math.min(sizes.length-1, Math.floor(sizes.length*p))]
console.log('web_fetch results: ' + fmt(sizes.length) + '   raw volume: ' + fmt(raw) + ' chars (~' + fmt(tok(raw)) + ' tok)')
console.log('  median ' + fmt(pct(0.5)) + ' ch   p75 ' + fmt(pct(0.75)) + '   p90 ' + fmt(pct(0.9)) + '   p99 ' + fmt(pct(0.99)) + '   max ' + fmt(sizes[sizes.length-1]))
console.log('  share of this corpus at exactly 50,000 (the spill cap): ' + fmt(sizes.filter(s=>s===50000).length))
console.log('  share of ALL tool-result chars that is web_fetch: ' + ((raw/totalToolChars)*100).toFixed(1) + '%')
console.log()
console.log('  ' + 'cap'.padStart(8) + 'calls kept'.padStart(12) + 'volume'.padStart(14) + 'tokens'.padStart(12) + 'saved vs now'.padStart(14) + 'rel'.padStart(8))
for (const cap of [50000, 40000, 32000, 24000, 16000]) {
  const capped = sizes.reduce((a,s)=>a+Math.min(s,cap),0)
  const callsCut = sizes.filter(s=>s>cap).length
  console.log('  ' + String(cap).padStart(8) + String(sizes.length).padStart(12) + fmt(capped).padStart(14) +
    fmt(tok(capped)).padStart(12) + fmt(tok(raw-capped)).padStart(14) + (((raw-capped)/raw)*100).toFixed(1).padStart(7)+'%')
}
