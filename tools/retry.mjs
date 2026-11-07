/**
 * retry.mjs - one retry policy, for conditions that are transient by nature.
 *
 * WHY IT EXISTS. tools/collect.mjs's preflight stage treated one starved harness as a permanent
 * fault: on 2026-10-05 openhands made ZERO gateway requests while a second collector ran beside ours
 * (two openhands instances cannot coexist), and the whole matrix refused to start. Refusing was
 * right - a harness that measures nothing must never reach a matrix - but the condition was
 * transient, and the pipeline had no way to wait it out.
 *
 * The policy is deliberately boring: bounded attempts, a fixed delay between them, stop at the first
 * success, return the LAST result when it gives up so the caller reports the failure it actually got
 * rather than the first one. `sleep` is injectable so tests do not wait.
 */
const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * @param {number} attempts  total attempts, including the first
 * @param {number} delayMs   wait between attempts
 * @param {(attempt: number) => Promise<object>} fn  returns an object with `ok`
 * @param {{sleep?: (ms: number) => Promise<void>}} [opts]
 */
export async function retry (attempts, delayMs, fn, opts = {}) {
  const sleep = opts.sleep ?? defaultSleep
  let last = { ok: false }
  for (let n = 1; n <= attempts; n++) {
    last = await fn(n)
    if (last && last.ok) return { ...last, attempts: n }
    if (n < attempts) await sleep(delayMs)
  }
  return { ...(last ?? {}), attempts }
}