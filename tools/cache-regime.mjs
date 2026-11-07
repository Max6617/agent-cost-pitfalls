/**
 * cache-regime.mjs - A6's DSH / non-DSH split of a model's cache-hit rate.
 *
 * WHY THE SPLIT EXISTS. panel-analysis A6's `overall` is one mean over every primary cell of a
 * model. That is a fine summary while every arm can cache the same way, and it is not fine on
 * Anthropic: only the six DSH arms POST to /v1/messages, and tools/measure-gateway.mjs injects a
 * cache_control breakpoint on that path alone (the gate is url.includes('/messages') &&
 * cacheBreakpoints). The four external harnesses there speak /v1/chat/completions, where there is
 * no breakpoint to inject and the provider does not cache implicitly, so every one of their cells
 * reads exactly 0%. Sonnet's pooled 51.3% is 480 cells at ~85.5% plus 320 at 0%: it measures the
 * gateway's two protocol paths, not the harnesses, and it was filed against a 94.6% solve rate as
 * if the gap were an anomaly about Sonnet.
 *
 * WHAT THIS FUNCTION IS NOT. It does not compute `overall` and must never be used to change it -
 * `overall` is a filed value. The split is a DECOMPOSITION of it: weighted by the cell counts it
 * returns, the two sides reproduce the pooled mean exactly, so both readings travel together.
 *
 * The split is by arm prefix (`dsh:`), the same rule tools/coverage.mjs uses. A side with no cells
 * is null, never 0: "nothing was measured" and "measured zero" must not print the same.
 */
import { mean } from './stats.mjs'

/** One model's panel rows -> { dshHitRate, dshCells, nonDshHitRate, nonDshCells }. */
export function cacheRegimeSplit(rows) {
  const side = (isDsh) => {
    // `hitRate ?? 0` matches A6's `overall` (r.hitRate ?? 0): a row whose usage split is unknown
    // counts as 0 in both views, or the split would stop decomposing the filed number.
    const hit = rows.filter((r) => String(r.arm).startsWith('dsh:') === isDsh).map((r) => r.hitRate ?? 0)
    return { hitRate: hit.length ? mean(hit) : null, cells: hit.length }
  }
  const dsh = side(true), nonDsh = side(false)
  return { dshHitRate: dsh.hitRate, dshCells: dsh.cells, nonDshHitRate: nonDsh.hitRate, nonDshCells: nonDsh.cells }
}
