# DeepSeek test-edit scan - the 0 is a measurement, not an absent field

**Run 2026-10-03, at HEAD after the Step 1 analysis fixes. Cost: nothing (reads local files only).**

## Why this file exists

\`results/ds-full/runs.jsonl\` carries **no \`fixture\` field on any of its 620 records** - the field
is written by \`tools/run-experiment.mjs:637\`, which arrived in commit \`dd58125\`, and ds-full was
collected before that. So the "tests edited: 0" printed for DeepSeek in the 2026-10-03 handover's
§2 table, and the \`0/620\` used as luna's comparator in §4.1, are an **absent field read as a zero**.
GLM, luna and qwen all carry \`fixture\` on 100% of their records; only ds-full does not.

The only real DeepSeek evidence is a retroactive scan of leftover workdirs, which is a SAMPLE.
This file records that sample's current value so the comparator is a number someone ran rather
than a number someone remembered.

## Command

\`\`\`
node tools/_scan-test-edits.mjs
\`\`\`

## Output (verbatim)

\`\`\`
leftover workdirs examined : 62
with TEST FILES TOUCHED    : 0  (0.0%)
with test files DELETED    : 0
by arm: {}
\`\`\`

## What it establishes, and what it does not

- **Establishes:** in the 62 surviving DeepSeek workdirs (10% of 620), no arm added, modified or
  deleted a file the fixture is graded on. The scan hashes the fixture as it was laid down and
  again as the agent left it (\`tools/fixture-guard.mjs\`).
- **Does NOT establish:** that DeepSeek never edited a graded test across the full matrix. 62 of
  620 workdirs survive, and the survivors are not a random sample - they are whichever workdirs
  the cleanup did not reach.
- **Therefore:** the honest statement in the paper is "0 of 62 surviving DeepSeek workdirs
  (a non-random 10% sample)", not "0/620".

## Reproduction note

The scan matches directories named \`dsh-exp-cmuquohyu-*\` in the OS temp root - cmuquohyu is the
ds-full matrix id. 62 such directories existed when this ran. The number is stable only while
those directories survive; \`tools/safe-fs.mjs\` and the workdir cleanup can still remove them, and
after that this measurement cannot be re-run.
