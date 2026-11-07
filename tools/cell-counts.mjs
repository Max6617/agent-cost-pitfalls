/**
 * cell-counts.mjs - cells and records are not the same thing, and a sign-off must not confuse them.
 *
 * THE DEFECT. collect.mjs's verify stage counted RECORDS and printed them as cells:
 *
 *     deepseek: 241/240 cells, 178 solved (73.9%)
 *         ...
 *         -1 cells are simply absent
 *
 * 241 records for 240 cells is not a contradiction: one cell was killed by the reboot and re-run
 * under the interrupted-run rule (PRE-REGISTRATION section 12.9), so it carries two records. But the
 * headline read "241/240 cells" and the line below it printed a NEGATIVE number of absent cells,
 * which is nonsense at exactly the point in the pipeline where the matrix is signed off.
 *
 * Both figures are real and they answer different questions. This module keeps them apart:
 *   cells   - the design: distinct (task, arm, seed) triples, the unit every analysis uses;
 *   records - what the file holds, which is cells + retries;
 *   retried - the cells with more than one record, named;
 *   solved  - a CELL is solved if ANY of its records solved, which is the only reading that does
 *             not let an infrastructure kill that was re-run and passed count as a failure.
 */

const keyOf = (r) => r.task + '|' + r.arm + '|' + r.seed

/**
 * @param {object[]} runs parsed run records
 * @param {{planned?: number|null}} [opts] the plan's cell count, for absent/surplus
 */
export function countCells (runs, opts = {}) {
  const planned = opts.planned ?? null
  const map = new Map()
  for (const r of runs) {
    const k = keyOf(r)
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(r)
  }
  const groups = [...map.values()]
  const retried = groups.filter((g) => g.length > 1)
  return {
    records: runs.length,
    cells: map.size,
    retried: retried.length,
    retriedCells: retried.map((g) => keyOf(g[0])),
    solvedCells: groups.filter((g) => g.some((r) => r.solved)).length,
    solvedRecords: runs.filter((r) => r.solved).length,
    absent: planned == null ? null : Math.max(0, planned - map.size),
    surplus: planned == null ? null : Math.max(0, map.size - planned),
  }
}

/**
 * Failure records that NO record of the same cell has resolved.
 *
 * THE DEFECT THIS EXISTS FOR. DeepSeek, 2026-10-07: 8 cells failed to launch, `--resume` retried
 * them, all 8 solved - and the verify stage refused the sign-off anyway, because it counted
 * `runs.filter((r) => r.error)` and that includes the historical records of cells that have since
 * succeeded. Records are not cells; this module exists because a sign-off that confuses them printed
 * "241/240 cells". The same confusion, one layer along.
 *
 * A record with an error is RESOLVED when the same task|arm|seed has a record without one.
 *
 * `statusExcluded` is a Set of RECORDS (identity: the same objects from `runs`) that rule 9's
 * STATUS clause excludes - every request failed, or none was made. Such a record measured nothing,
 * so it is neither a failure to fix nor evidence that its cell succeeded: it leaves the failure
 * list AND the clean set. The verdict is computed by tools/exclusions.mjs and passed in; this
 * module does not know the rule. Absent the option, behaviour is exactly as before.
 */
export function unresolvedFailures (runs, opts = {}) {
  const statusExcluded = opts.statusExcluded ?? new Set()
  const clean = new Set(runs.filter((r) => !r.error && !statusExcluded.has(r)).map(keyOf))
  return runs.filter((r) => r.error && !statusExcluded.has(r) && !clean.has(keyOf(r)))
}

/** The sign-off line. Cells first, records named as records, retries disclosed. */
export function describeCells (c, planned) {
  const pct = c.cells ? (100 * c.solvedCells / c.cells).toFixed(1) : '0.0'
  return c.cells + '/' + planned + ' cells (' + c.records + ' record' + (c.records === 1 ? '' : 's') +
    (c.retried ? ', ' + c.retried + ' retried' : '') + '), ' + c.solvedCells + ' cells solved (' + pct + '%)'
}
