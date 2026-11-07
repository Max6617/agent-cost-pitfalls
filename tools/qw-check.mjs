import { readFileSync } from 'node:fs'
const runs = readFileSync('results/qwen-full/runs.jsonl','utf8').split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(Boolean)
console.log('  records ' + runs.length + ' of 620   solved ' + runs.filter(r=>r.solved).length)
console.log('  tasks ' + new Set(runs.map(r=>r.task)).size + '   arms ' + new Set(runs.map(r=>r.arm)).size)
const byArm = {}; for (const r of runs) byArm[r.arm] = (byArm[r.arm]??0)+1
console.log('  per arm: ' + Object.entries(byArm).sort().map(([a,n])=>a.replace('dsh:','')+'='+n).join('  '))