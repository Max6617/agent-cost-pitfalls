# Harness bring-up — work order

Send this into a new session. Everything below the line is the prompt.

---

You are bringing additional coding-agent harnesses into a measurement study. The study compares
what coding agents COST when they solve the same tasks with the same model, and why the ranking
changes with the provider.

## The one rule that governs everything

**A harness is not in the study until it produces records in the measurement gateway log.**

A harness that installs, launches, edits files and solves tasks while making **zero gateway
requests** is worse than a harness we never installed, because it looks like data and is not. This
has already happened once: **Cline solves tasks and reached the gateway zero times.** Do not report
a harness as working on the strength of it running. Report it working only when you can show
records attributed to it in the gateway log.

## Infrastructure, already built — use it, do not rebuild it

| what | where |
|---|---|
`tools/measure-gateway.mjs` | the instrument. Sits between every harness and the provider, records per-request usage, cache hit/miss, cost, and attributes each request to a run |
`scripts/start-provider.ps1 -Provider <name>` | starts a gateway for deepseek / anthropic / zai / qwen / openai, reading the key from the key file so it never hits a command line |
`tools/keys.mjs` | `loadKeys()` merges `.keys.json` and `FILL-IN-KEYS.json`. **It must stay silent on import** — it once printed a summary that corrupted a captured key |
`tools/run-experiment.mjs` | runs a matrix. `--harness cline` etc. Generates per-run configs |
`tools/harness-smoke.mjs` | the harness registry. `--list` shows what is registered and how far each has been verified |
`tools/attribute.mjs` | attributes gateway records to runs via the synthetic key |

Every request carries a synthetic key of the form `exp-<harness>-<runId>`. The gateway swaps it for
the real key and attributes the response. **The harness needs to be given that synthetic key and
the gateway base URL.** `run-experiment.mjs` already does this for the harnesses it knows.

**Gateway status and per-provider checks:** `http://127.0.0.1:8787/__stats`

## What is known about each harness

### cline — closest to working, and the highest value

Installed: **Cline 3.0.65**. It launches and solves tasks. It makes **zero** gateway requests.
Blockers already identified, do not rediscover them:

- It rejects `-P gateway` ("Unknown or disabled provider"). Use **`-P openai-compatible`**.
- Invoke **`cline.cmd`**, not `cline.ps1`.
- **`--data-dir` is silently ignored.** The runner writes its provider store to a settings path and
  Cline reads a different one, so it probably uses its own stored credentials and never sees the
  synthetic key or the gateway URL. **This is the most likely cause of the zero requests — verify it
  first.** Find where Cline 3.0.65 actually reads provider config on Windows and put the gateway
  base URL and synthetic key there.

### openhands

CLI installed. Docker 28.3.3 is present on the machine. Needs a smoke run to confirm it reaches the
gateway at all. Note that a Docker-based harness may need the gateway reachable from inside the
container — `host.docker.internal` rather than `127.0.0.1` — which is a likely failure mode.

### goose

`@block/goose` is **not** an npm package (404). The winget `Pressly.Goose` is a **different product**.
Find the real installation path for Block's Goose and install it. If it cannot be installed
cleanly, say so and move on rather than substituting a different tool.

### sweagent

`uv tool install sweagent` fails with "requirements are unsatisfiable" — a Python version
constraint. Try a virtualenv with a different Python, or the Docker image, or report it blocked.

### aider — DO NOT WORK ON THIS ONE

**Aider is excluded from the study, and the exclusion is pre-registered.** It is a pair programmer
that needs files added to context, not an autonomous discovery agent; comparing it to the others is
not like-for-like. Do not attempt to fix it. If you are tempted because it is easy, that is the
reason it is excluded.

## Constraints — this machine is busy

**Three measurement runs are in progress.** Do not disrupt them:

- a DeepSeek matrix (job running, several hundred runs)
- a GLM-5.3-Flash terseness matrix
- a task-difficulty check

CPU is around 90% and RAM is around 88% used. Therefore:

1. **Prefer SMALL smoke tests** — one task, one or two runs. Do not launch a full matrix.
2. **Do not restart or kill gateways on ports 8787, 8788 or 8789.** They are in use.
   Start any gateway you need on **8791 or higher**.
3. **Do not use `git add -A`** while another session may be writing; it races and silently stages
   nothing. Use `git add -A -- . ':!tasks-hard'`.
4. Long-running installs are fine, but do not start a matrix.

## Deliverable

For each harness, one of:

- **WORKING** — with the evidence: a gateway log excerpt showing records attributed to that harness,
  and the exact command that produced them; or
- **BLOCKED** — with the precise blocker and what you tried.

**Also required: record what you learn in `tools/harnesses.mjs`** (or wherever the registry lives) so
the next session does not repeat your work — particularly the platform-specific traps, which are the
expensive part.

**Do not overstate.** "Installed successfully" is not a result. "Produced 3 gateway records on a
smoke task" is.