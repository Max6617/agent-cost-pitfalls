
/**
 * Probe: does Anthropic's OpenAI-compatible /v1/chat/completions endpoint cache, and does it
 * report it?  The four external harnesses reach Anthropic only through that path, and the gateway
 * has always recorded cacheHitTokens: null there - so their costs are computed as if nothing were
 * cached. If Anthropic in fact caches on that path, every external-harness Anthropic figure in
 * this study is overstated and the Haiku/Sonnet rankings are affected.
 *
 * Sends the SAME large prefix twice. Between them, either a cache exists or it does not.
 */
const GW = 'http://127.0.0.1:8804/v1/chat/completions'
// ~4k tokens of stable prefix, then a small varying tail.
const filler = Array.from({ length: 220 }, (_, i) => 'Line ' + i + ': the quick brown fox jumps over the lazy dog and then writes a regression test for the parser.').join('\n')
async function call(tag) {
  const body = {
    model: 'claude-haiku-4-5',
    messages: [
      { role: 'system', content: 'You are a coding agent. Reference material:\n' + filler },
      { role: 'user', content: 'Reply with exactly: ' + tag },
    ],
    max_tokens: 16,
    stream: false,
  }
  const r = await fetch(GW, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer exp-probe-compatcache-s1' },
    body: JSON.stringify(body),
  })
  const j = await r.json().catch(() => ({}))
  const u = j.usage ?? {}
  // A non-2xx is NOT evidence about caching. The first version of this probe printed
  // "no cached_tokens on any call" while every call was a 400 for exhausted credit - the
  // same "a non-zero exit is not evidence until its cause is known" error this project has
  // retracted three times. Name the cause and refuse to draw the conclusion.
  if (r.status !== 200 || u.prompt_tokens == null) {
    const msg = j?.error?.message ?? JSON.stringify(j).slice(0, 200)
    console.log('  call ' + tag + ':  status=' + r.status + '  -> INCONCLUSIVE: ' + msg)
    return { _failed: true, status: r.status, message: msg }
  }
  console.log('  call ' + tag + ':  status=' + r.status +
    '  prompt_tokens=' + (u.prompt_tokens ?? '-') +
    '  completion_tokens=' + (u.completion_tokens ?? '-') +
    '  prompt_tokens_details=' + JSON.stringify(u.prompt_tokens_details ?? null) +
    '  cache_creation=' + JSON.stringify(u.cache_creation_input_tokens ?? null))
  if (u.prompt_tokens == null) console.log('    raw: ' + JSON.stringify(j).slice(0, 400))
  return u
}
console.log('PROBE - same 4k-token prefix sent twice through the OpenAI-compatible path')
const a = await call('first')
await new Promise((r) => setTimeout(r, 1500))
const b = await call('second')
await new Promise((r) => setTimeout(r, 1500))
const c = await call('third')
const calls = [a, b, c]
const failed = calls.filter((u) => u._failed)
console.log('')
if (failed.length) {
  console.log('RESULT: INCONCLUSIVE - ' + failed.length + ' of ' + calls.length + ' calls did not reach a 200.')
  console.log('  Cause: ' + failed[0].message)
  console.log('  A failed call says nothing about caching. Top up the provider and re-run; until then')
  console.log('  the question stays open, and FINDINGS F37 keeps its existing caveat unchanged.')
} else {
  const any = calls.some((u) => u.prompt_tokens_details?.cached_tokens != null)
  console.log(any
    ? 'RESULT: the provider DOES report cached_tokens on this path -> the gateway was not reading it,'
    : 'RESULT: no cached_tokens field on any successful call. Either nothing is cached on this path,')
  if (any) console.log('        and the external harnesses\' Anthropic costs are overstated.')
  if (!any) console.log('        or the provider does not report cache usage here. Either way the gateway')
  if (!any) console.log('        cannot tell, which is measured rather than assumed.')
}
process.exit(failed.length ? 3 : 0)
