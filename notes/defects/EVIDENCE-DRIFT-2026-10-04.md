# EVIDENCE DRIFT — a finished matrix's gateway log is still being appended to

**Detected 2026-10-04 ~08:15 local, at commit `fdb35d9`. Not a defect in any tool. Caused by a live
process from a matrix that finished two days ago.**

## What was found

`node tools/artifact.mjs --verify` and `node tools/backup-results.mjs --verify` both fail:

    CHANGED  input results/cmure98qw-openai-gateway.jsonl

`git diff --stat` on that file: **3 insertions**. The three appended records are

    ts                       harness     status  runId
    2026-10-04T06:13:18.202Z openhands   200     cmure98qw-openai-openhands-fetch-heavy-uri-resolution-openhands-s1
    2026-10-04T06:13:51.967Z openhands   200     (same run)
    2026-10-04T06:14:25.591Z openhands   200     (same run)

The file's other 9,438 records run from 2026-10-02T20:07Z to 2026-10-02T23:30Z. The luna matrix was
signed off on 2026-10-02. **The last three records are from today.**

## What it means

- **A stale agent process from the finished luna matrix is still alive and still making requests.**
  It is billing the OpenAI key right now, a few requests at a time, against a stale gateway.
- **Seventeen stale gateways are still listening**, on ports 8788-8804. The handover calls these
  harmless, and for the collection path they are - the launcher allocates a free port and no new run
  touches a stale one. They are not harmless for the archive: a stale gateway appends to the log it
  was started with, and that log is tracked evidence.
- **`results/luna-full/runs.jsonl` is unmodified** - 620 records, still exactly as signed off. No run
  record was added, lost or altered.
- **The analysis would move if rebuilt.** `cost-panel` joins gateway usage to run records by runId,
  and this runId is in `luna-full`. Three extra requests therefore change that one cell's cost. The
  signed-off numbers in `analysis/*-6model-2026-10-03.json` were computed before these records
  existed and are unchanged and internally consistent; a rebuild from today on would not reproduce
  them exactly.

## What was NOT done, deliberately

1. **Nothing was deleted or reverted.** Raw logs stay as recorded, and a record that exists is
   evidence even when it is inconvenient.
2. **The artifact manifest was NOT re-baselined.** `--verify` failing is the instrument working. It
   is reporting that the shipped package no longer matches the data on disk, which is exactly true.
3. **The backup mirror was NOT run.** Mirroring now would copy the drifted records into the backup
   and make `--verify` pass again, which would erase the only signal that this happened.
4. **No process was killed.** The handover is explicit that killing from a plain shell call tore down
   a previous session's own job runner. Killing is a decision for the human, and the human has a
   parallel session running that owns some of those node processes.

## What should happen next (human decision)

1. Identify and stop the stale agent process that is still driving openhands against the luna
   matrix, and the stale gateway it posts to (the one whose log is
   `results/cmure98qw-openai-gateway.jsonl`). Use a background job for any kill, not a plain shell
   call.
2. Decide whether the three records stand. If they do, the manifest is rebuilt and the drift is
   recorded as a deliberate re-baseline with this file as the reason. If they do not, the log is
   left as it is and the artifact states its cut-off date.
3. Either way the seventeen stale gateways are worth clearing once nothing is listening for them.

**No API spend by this session. No file in `results/` was modified by this session.**

---

## DECISION — 2026-10-04, taken after stopping the process

### What the agent was

`openhands.exe` PID 26436 with python children 23724 and 23684, started **2026-10-03 03:25:27** and
still running **29 hours later**. It was re-driving `fetch-heavy-uri-resolution` for the luna matrix
against a stale gateway. It was stopped with a **background job** (never a plain shell kill, per the
handover). The log has been verified **stable for 20 seconds afterwards**, and the drift is a single
3.5-minute burst: **15 records, 2026-10-04T06:13:18Z to 06:16:49Z, all one runId**
(`cmure98qw-openai-openhands-fetch-heavy-uri-resolution-openhands-s1`).

### The decision: the records stay, the analysis declares a cut-off

1. **Nothing is deleted.** Fifteen genuine, billed, HTTP 200 gateway records remain exactly where
   they are. A record that exists is evidence even when it is inconvenient.
2. **They are excluded from the analysis by a declared cut-off, and the exclusion is reported.**
   The reason is not that they are wrong. It is that **their number depends on when the runaway was
   killed**: had it lived another hour there would be more of them, and a per-cell cost that grows
   with the lifetime of an unattended process is not a measurement of the run. Any tool that
   silently absorbed them would make the luna matrix's cost a function of my timing.
3. **The cut-off is the instant the signed-off artifact was built**, `2026-10-04T06:01:57Z` — before
   the first drift record and after every legitimate one. It is declared once, in code, and the
   count of excluded records is printed, never silently dropped.
4. **The signed-off analyses stand unchanged.** `analysis/*-6model-2026-10-03.json` were computed
   before the burst; with the cut-off in place a rebuild reproduces them, which is the test.
5. **The luna gateway log is now closed.** The process that could append to it is dead, so the file
   is frozen at 15 records of drift, and the manifest can be re-attested against it.

### What this is not

It is not a claim that the 15 requests did not happen, and not a claim that they cost nothing. They
happened and they were billed; the session ledger already includes them. It is a claim about **which
records belong to the measurement**, stated in advance of any number that depends on it.

### The two remaining code changes this decision requires

1. **The bracket** (below): `costOf` prices an unknown cache split at zero and `cost-panel` prices it
   at the miss rate. Neither is a measurement; both must be carried.
2. **The cut-off**: one declared constant, applied where gateway records enter the analysis, with the
   excluded count in the output. Test-first, asserting that a record at or after the cut-off is
   excluded **and counted**, and that the four cheap matrices plus the five DSH Anthropic arms are
   unaffected by it.

### Also worth clearing when convenient

Seventeen stale gateways still listen on ports 8788-8804. They are passive - no run reaches them and
they cost nothing while idle - but one of them was the socket this runaway posted to for 29 hours,
so they are not harmless in the way the handover assumed. They are left alone here because killing
processes is how a previous session lost its own job runner, and the human has a parallel session
running.
