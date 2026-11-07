# DEFECT — the placeholder guard read a task's PROMPT as a template, and refused 8 cells of every matrix

**Found 2026-10-06 by the first full tasks-b matrix.** Fixed the same hour, test-first. No task was
changed and no data was discarded.

## What happened

The DeepSeek matrix finished 800/800 cells, 757 solved (94.6%), every arm 80 — and the verify stage
**refused the sign-off** with `FAILURE RECORDS: 8`.

    multi-file-locale-fallback   openhands|opencode|cline|goose   seeds 1 and 2
    error: unsubstituted placeholder in harness args: "Translation complaints are piling up ..."

`tools/run-experiment.mjs` built each harness command line, then scanned every SUBSTITUTED argument:

    for (const a of args) if (/\{[a-zA-Z]+\}/.test(a)) throw new Error('unsubstituted placeholder ...')

`tasks-b/multi-file-locale-fallback` is a task about placeholder leaking, so its prompt says
*"Placeholders like {name} are also leaking into rendered pages"*. The guard read `{name}` as an
unsubstituted template variable and refused to launch **all four external harnesses, both seeds**.
DSH escaped only because its branch returns before the guard.

**Why it was invisible until now:** the guard's purpose is real and it has caught a real bug (a
missing `{key}` once produced a command line that ran perfectly and attributed nothing). It fires on
1 task in 40, and only on the four external harnesses.

## The fix

`tools/arg-guard.mjs` — the guard now compares each TEMPLATE element with the argument it produced. A
placeholder still present in both means substitution failed; a prompt is data at every position and
may contain anything. Extracted from the script so it can be tested at all: `run-experiment.mjs` runs
on import, which is why a guard this wrong had no test.

    assertNoUnsubstituted(['-k', '{key}'], ['-k', '{key}'])      -> throws  (the job it exists for)
    assertNoUnsubstituted(['--prompt', P], ['--prompt', P])       -> ok      (P contains {name})
    assertNoUnsubstituted(['--prompt'], ['it asked for {model}']) -> ok      (even template-shaped text)

## Exposure

Every provider would have lost the same 8 cells and had its sign-off refused, because the task is in
the shared suite: the chain was stopped before GLM started, so **one** matrix carries the defect
(DeepSeek, recovered by `--resume` — `classifyRun` calls these launch failures, so the runner re-runs
them) rather than six.

## Second defect, found while recovering: the launcher's own faults were read as MODEL failures

`--resume` re-ran the DeepSeek matrix twice and skipped all 8 cells both times. The reason is a
classification gap, not a resume gap:

    classifyRun({ error: 'unsubstituted placeholder in harness args: ...', runId: 'cmu...' })
      -> { cause: 'unexplained', infrastructure: false }

The structural launch-failure clause is `run.error && run.runId == null`, and these records carry a
runId - the runner assigns one before it builds the command line. With no text signature matching
either, they fell into **`unexplained`, the one bucket the pre-registration says may be read as a model
failure**, and `--resume` reads a non-infrastructure record as COMPLETE, so the cells were never
retried. Both halves of the same defect, in other words: the guard refused the launch, and the
classifier then called it a model failure and marked it done.

**Fix:** `tools/exclusions.mjs` gains a `launch-failure` TEXT signature for the runner's own refusals
(`unsubstituted placeholder in harness args`, `synthetic key did not reach the command line`,
`Unknown command or unquoted prompt`, `EPERM, Permission denied`). The cause is already in
`INFRASTRUCTURE`, so the exclusion rule is unchanged - this closes the text channel the way §12.9
closed the structural one. Test-first: the two verbatim phrasings are pinned in `MUST_EXCLUDE` and a
crafted sample keeps the signature from going inert.

Consequence: the 8 DeepSeek cells are now retryable by `--resume`, which is how the matrix gets its
clean sign-off. The recovery runs after the chain, so that only one collector is ever active.

## Also fixed in the same pass

`tools/dataset-selection.test.mjs` asserted a SNAPSHOT ("every tasks-b dataset is reported missing")
rather than the property, and went red the moment `results/batchb-ds-full` existed. It now asserts
`missing` tracks each dataset's runs file, which cannot rot as matrices land.
