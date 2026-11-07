#!/usr/bin/env node
/**
 * usage-proxy — capture provider-grade token usage, including cache hit/miss.
 *
 * DSH's LLM layer has a TokenUsage type carrying cacheReadTokens / cacheWriteTokens,
 * but those values are never written to the session log. dsh-app-boot honours a
 * DEEPSEEK_BASE_URL environment variable, so pointing the provider at this proxy
 * captures the provider's own billing-relevant numbers instead.
 *
 * It is a pass-through: requests and responses are forwarded untouched (including
 * SSE streaming). Only sizes, a body hash, latency and the usage block are logged.
 *
 *   node tools/usage-proxy.mjs --port 8787 --upstream https://api.deepseek.com --log results/usage.jsonl
 *   $env:DEEPSEEK_BASE_URL = 'http://127.0.0.1:8787'
 *
 * Every request may carry an x-run-id header; the experiment runner sets it so
 * usage can be joined back to a specific run. --run-id sets a fallback.
 */
import { createServer } from 'node:http'
import { appendFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname } from 'node:path'

const argv = process.argv.slice(2)
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }
const port = Number(opt('--port', 8787))
const upstream = opt('--upstream', 'https://api.deepseek.com').replace(/\/+$/, '')
const logPath = opt('--log', 'results/usage.jsonl')
const fallbackRunId = opt('--run-id', 'unset')

mkdirSync(dirname(logPath), { recursive: true })
const log = (rec) => appendFileSync(logPath, JSON.stringify(rec) + '\n')

/** Last JSON object after 'data:' in an SSE stream that carries a usage block. */
function usageFromSse(text) {
  let usage = null
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t.startsWith('data:')) continue
    const payload = t.slice(5).trim()
    if (!payload || payload === '[DONE]') continue
    try { const o = JSON.parse(payload); if (o && o.usage) usage = o.usage } catch {}
  }
  return usage
}

// DeepSeek reports prompt_cache_hit_tokens / prompt_cache_miss_tokens; OpenAI-style
// providers report prompt_tokens_details.cached_tokens. Normalise both.
function normalise(usage) {
  if (!usage) return null
  const hit = usage.prompt_cache_hit_tokens ?? usage.prompt_tokens_details?.cached_tokens ?? null
  const miss = usage.prompt_cache_miss_tokens
    ?? (usage.prompt_tokens != null && hit != null ? usage.prompt_tokens - hit : null)
  return {
    inputTokens: usage.prompt_tokens ?? null,
    outputTokens: usage.completion_tokens ?? null,
    reasoningTokens: usage.completion_tokens_details?.reasoning_tokens ?? null,
    cacheHitTokens: hit,
    cacheMissTokens: miss,
    cacheHitRate: hit != null && (hit + (miss ?? 0)) > 0 ? hit / (hit + (miss ?? 0)) : null,
    raw: usage,
  }
}

const server = createServer(async (req, res) => {
  const started = Date.now()
  const chunks = []
  for await (const c of req) chunks.push(c)
  const body = Buffer.concat(chunks)

  let parsed = null
  try { parsed = JSON.parse(body.toString('utf8')) } catch {}

  const headers = { ...req.headers }
  delete headers.host
  delete headers['content-length']
  delete headers['accept-encoding']

  const runId = req.headers['x-run-id'] ?? fallbackRunId
  const base = {
    ts: new Date().toISOString(), runId, url: req.url, method: req.method,
    model: parsed?.model ?? null,
    stream: parsed?.stream === true,
    messages: Array.isArray(parsed?.messages) ? parsed.messages.length : null,
    tools: Array.isArray(parsed?.tools) ? parsed.tools.length : null,
    requestBytes: body.length,
    requestHash: createHash('sha256').update(body).digest('hex').slice(0, 16),
  }

  let up
  try {
    up = await fetch(upstream + req.url, { method: req.method, headers, body: body.length ? body : undefined })
  } catch (e) {
    log({ ...base, status: 0, error: String(e && e.message || e), latencyMs: Date.now() - started })
    res.writeHead(502, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: { message: 'usage-proxy upstream failure: ' + String(e && e.message || e) } }))
    return
  }

  const outHeaders = {}
  up.headers.forEach((v, k) => { if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(k)) outHeaders[k] = v })
  res.writeHead(up.status, outHeaders)

  const isSse = (up.headers.get('content-type') ?? '').includes('text/event-stream')
  let captured = ''
  const MAX = 8 * 1024 * 1024

  if (up.body) {
    const reader = up.body.getReader()
    const decoder = new TextDecoder()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(Buffer.from(value))
      // Tee every response, not just SSE: a non-streaming body carries usage in
      // its JSON. Without this the cost columns silently read zero for
      // non-streaming runs.
      if (captured.length < MAX) captured += decoder.decode(value, { stream: true })
    }
  }
  res.end()

  let usage = null
  if (isSse) usage = usageFromSse(captured)
  else { try { usage = JSON.parse(captured).usage ?? null } catch { usage = null } }

  log({ ...base, status: up.status, latencyMs: Date.now() - started, usage: normalise(usage) })
})

server.listen(port, '127.0.0.1', () => {
  console.log('usage-proxy listening on http://127.0.0.1:' + port)
  console.log('  upstream : ' + upstream)
  console.log('  log      : ' + logPath)
  console.log('  point dsh at it with:  $env:DEEPSEEK_BASE_URL = "http://127.0.0.1:' + port + '"')
})
