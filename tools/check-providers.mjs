/**
 * check-providers.mjs - is there credit behind each key, right now?
 *
 * WHY THIS EXISTS. Anthropic exposes no balance endpoint, so this study has never been able to
 * answer the question before starting a matrix. Ignoring that cost ~$117 once, and on 2026-10-01
 * it cost 155 runs and two published claims when the balance ran out mid-experiment and nothing
 * noticed (FINDINGS F39).
 *
 * The reliable, provider-independent test is the one a matrix makes anyway: send the cheapest
 * possible valid request and read the answer. A 200 means the key is funded and working. A 4xx
 * whose text matches tools/exclusions.mjs names the reason - and because the classification comes
 * from that shared module, this tool cannot disagree with the analysis about what a credit
 * failure is.
 *
 * DeepSeek additionally publishes a real balance figure, so it is reported in dollars.
 *
 * Costs about ten tokens per provider. Safe to run before every matrix.
 *   node tools/check-providers.mjs
 */
import { loadKeys } from './keys.mjs'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { classifyRun } from './exclusions.mjs'

const keys = loadKeys()

/** DeepSeek's key lives in the DSH credential store, not in .keys.json. */
function deepseekKey() {
  const home = process.env.DSH_HOME || join(process.env.USERPROFILE || process.env.HOME || '', '.dsh')
  const f = join(home, '.credentials.yaml')
  if (!existsSync(f)) return null
  let inRefs = false
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const ind = line.length - line.trimStart().length
    const t = line.trim()
    if (/^refs:\s*$/.test(t)) { inRefs = true; continue }
    if (inRefs && ind === 0 && t) inRefs = false
    if (!inRefs) continue
    const m = /^DEEPSEEK_API_KEY:\s*(\S+)/.exec(t)
    if (m) return m[1]
  }
  return null
}

const PROVIDERS = [
  {
    id: 'anthropic', label: 'Anthropic', model: 'claude-haiku-4-5',
    key: () => keys.anthropic,
    url: 'https://api.anthropic.com/v1/messages',
    // An unscoped key is rejected with "must include the anthropic-workspace-id header" - the
    // header name is the one the error names, not x-workspace-id. The first version used the
    // wrong name and reported a funded account as EMPTY.
    headers: (k) => (keys.anthropic_workspace
      ? { 'x-api-key': k, 'anthropic-version': '2023-06-01', 'anthropic-workspace-id': keys.anthropic_workspace }
      : { 'x-api-key': k, 'anthropic-version': '2023-06-01' }),
    body: (m) => ({ model: m, max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
    console: 'https://console.anthropic.com/settings/billing',
  },
  {
    id: 'openai', label: 'OpenAI', model: 'gpt-6-luna',
    key: () => keys.openai,
    url: 'https://api.openai.com/v1/chat/completions',
    headers: (k) => ({ authorization: 'Bearer ' + k }),
    // OpenAI renamed this field; max_tokens is rejected outright for gpt-6-luna.
    // gpt-6-luna rejects `max_tokens` and, at 1 token, answers 400 "Could not finish the message
    // because max_tokens ... was reached" - which is a SUCCESS: the request authenticated and the
    // model ran. A probe must not report a funded account as broken.
    body: (m) => ({ model: m, max_completion_tokens: 16, messages: [{ role: 'user', content: 'hi' }] }),
    console: 'https://platform.openai.com/settings/organization/billing',
  },
  {
    id: 'deepseek', label: 'DeepSeek', model: 'deepseek-flash',
    key: deepseekKey,
    url: 'https://api.deepseek.com/anthropic/v1/messages',
    headers: (k) => ({ 'x-api-key': k, 'anthropic-version': '2023-06-01' }),
    body: (m) => ({ model: m, max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
    console: 'https://platform.deepseek.com/top_up',
    balance: async (k) => {
      const r = await fetch('https://api.deepseek.com/user/balance', { headers: { authorization: 'Bearer ' + k } })
      const j = await r.json().catch(() => null)
      const b = j?.balance_infos?.[0]
      return b ? (b.currency + ' ' + b.total_balance + '  (topped up ' + (b.topped_up_balance ?? '?') + ', granted ' + (b.granted_balance ?? '?') + ')') : null
    },
  },
  {
    id: 'zai', label: 'z.ai (GLM)', model: 'glm-5.3-flash',
    key: () => keys.zai,
    url: 'https://api.z.ai/api/anthropic/v1/messages',
    headers: (k) => ({ 'x-api-key': k, 'anthropic-version': '2023-06-01' }),
    body: (m) => ({ model: m, max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
    console: 'https://z.ai/manage-apikey/cost',
  },
  {
    id: 'qwen', label: 'Alibaba (Qwen)', model: 'qwen3.8-flash',
    key: () => keys.qwen,
    url: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
    headers: (k) => ({ authorization: 'Bearer ' + k }),
    body: (m) => ({ model: m, max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
    console: 'https://bailian.console.alibabacloud.com/',
  },
]

console.log('PROVIDER CREDIT CHECK - one minimum-size request each, classified by tools/exclusions.mjs')
console.log('')
const rows = []
for (const p of PROVIDERS) {
  const k = p.key()
  if (!k) { console.log('  ' + p.label.padEnd(18) + 'NO KEY SET'); rows.push({ ...p, status: 'no-key' }); continue }
  let status = '?', detail = ''
  try {
    const r = await fetch(p.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...p.headers(k) },
      body: JSON.stringify(p.body(p.model)),
      signal: AbortSignal.timeout(30000),
    })
    const txt = await r.text()
    if (r.ok) { status = 'FUNDED'; detail = 'HTTP ' + r.status }
    else {
      const c = classifyRun({ solved: false, stderrTail: txt, stdoutTail: '' })
      // Only a CREDIT classification means the account is empty. Any other 4xx is a malformed
      // probe or a bad key, and calling it EMPTY would send someone to top up a funded account.
      // Some providers answer a max-token truncation with a 4xx even though the call succeeded.
      // That is funding evidence, not a funding failure, so it is read as FUNDED and said so.
      const truncated = /could not finish the message|max_tokens or model output limit/i.test(txt)
      status = c.cause === 'credit' ? 'EMPTY (credit)'
        : c.cause === 'auth' ? 'BAD KEY'
        : truncated ? 'FUNDED'
        : 'ERROR ' + r.status + ' (' + c.cause + ')'
      detail = (JSON.parse(txt || '{}')?.error?.message ?? txt).slice(0, 120).replace(/\s+/g, ' ')
    }
  } catch (e) { status = 'UNREACHABLE'; detail = String(e.message).slice(0, 90) }
  let bal = null
  if (p.balance) { try { bal = await p.balance(k) } catch {} }
  console.log('  ' + p.label.padEnd(18) + status.padEnd(22) + (bal ? 'balance ' + bal : detail))
  if (bal && detail) console.log('  ' + ''.padEnd(18) + detail)
  rows.push({ ...p, status, detail, balance: bal })
}
console.log('')
console.log('  Anthropic has NO balance endpoint. The only reliable check is the request above, or')
console.log('  the console. Anything not FUNDED must be topped up before a matrix starts.')
