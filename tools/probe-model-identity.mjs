
import { loadKeys } from './keys.mjs'
const keys = loadKeys()
const hdr = { 'content-type': 'application/json', 'x-api-key': keys.anthropic, 'anthropic-version': '2023-06-01' }
if (keys.anthropic_workspace) hdr['anthropic-workspace-id'] = keys.anthropic_workspace

const CANDIDATES = ['claude-haiku-4-5', 'claude-haiku-4.5', 'claude-haiku-4-5-20251001', 'claude-3-5-haiku-latest', 'claude-sonnet-5-5', 'claude-sonnet-5.5']
console.log('=== what Anthropic RETURNS for each model string ===')
for (const m of CANDIDATES) {
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: hdr,
      body: JSON.stringify({ model: m, max_tokens: 4, messages: [{ role: 'user', content: 'hi' }] }),
      signal: AbortSignal.timeout(30000),
    })
    const j = await r.json().catch(() => ({}))
    if (r.ok) console.log('  ' + m.padEnd(28) + ' 200  -> served: ' + JSON.stringify(j.model))
    else console.log('  ' + m.padEnd(28) + ' ' + r.status + '  ' + String(j?.error?.message ?? '').slice(0, 75))
  } catch (e) { console.log('  ' + m.padEnd(28) + ' ERR  ' + String(e.message).slice(0, 60)) }
}
