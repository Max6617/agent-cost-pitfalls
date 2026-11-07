# HARNESS ONBOARDING — bringing new harnesses into the study

Handover for the cross-harness work, 2026-09-30. Read this before wiring a new harness.

The rule that governs everything, restated because it was violated twice in one session:

> **A harness is not in the study until it produces records in the measurement gateway log.**
> A harness that installs, launches, edits files and solves tasks while making zero gateway requests is
> *worse* than one you never installed, because it looks like data and is not.
> "It ran" and "exit 0" are not results. `syntheticKey` starting with `exp-<harness>-` is a result.

---

## 1. Verdicts

| harness | verdict | evidence (gateway records) |
|---|---|---|
| **cline** | **WORKING** — end-to-end | 11 records, 11× HTTP 200, 68,282 in / 2,131 out, $0.004608 |
| **openhands** | **WORKING** — end-to-end | 9 records, 9× HTTP 200, 127,089 in / 1,242 out, $0.008005 |
| **goose** | **WORKING** — end-to-end | 10 records, 10× HTTP 200 (+9 documented 404s), 33,362 in / 815 out, $0.001487 |
| **sweagent** | **WORKING (wiring only)** — `gateway-reached` | 10 records, 10× HTTP 200, 16,500 in / 1,206 out, $0.001156736 — **tool execution stubbed, see below** |
| aider | EXCLUDED, pre-registered | do not touch |

### The `verified` levels, and why sweagent is not `end-to-end`

The registry now distinguishes two levels that were previously conflated:

- **`end-to-end`** — the harness solved a real task and the gateway recorded it. cline, openhands, goose.
- **`gateway-reached`** — the harness really sent model requests that the gateway recorded and attributed,
  **but tool execution is stubbed**, so it is not doing the thing the study measures. sweagent.

**sweagent's records come from `env.deployment.type=dummy`** (SWE-ReX `DummyRuntime`): `create_session`
succeeds and every command returns `exit_code=0` with **empty output**. The model loop, token accounting,
prompt-cache behaviour and cost are all **real**; the agent **never actually read `hello.txt`**.
Its cost/step/cache shapes are usable. Its **task-completion and pass-rate are not** — do not fold those
runs into a performance comparison against the other arms. Both faithful backends are unavailable on this
host: the Docker daemon is down, and swe-rex's `local` deployment uses `pexpect`, which needs a Unix pty
and cannot work on Windows.

`gateway-reached` is enough to prove the wiring. It is **not** enough to put a harness in a
task-performance comparison.

**Caveat on which log holds the proof.** The three running matrices use `results/gateway.jsonl`
(port 8787), `results/glm53-gateway.jsonl` (8788) and `results/anthropic-gateway.jsonl` (8789).
New harnesses were therefore verified on **separate** gateways/logs and their proof lives there, not
in the main log:

| harness | gateway log | port |
|---|---|---|
| cline | `results/gateway-cline-verify.jsonl` | 8794 (since freed) |
| goose | `results/gateway-cline-verify.jsonl`, `results/gateway-harness-verify.jsonl` | 8794, 8795 |
| openhands | `results/gateway-openhands.jsonl` | 8793 (port since taken by another session) |
| sweagent | `results/gateway.jsonl` | 8787 (shared) |

The port numbers are historical — **the proof is the jsonl file, not the port.** These logs persist
after the gateway process exits, which is why the verdicts above are still valid even though two of the
gateways that wrote them are gone.

`grep -c openhands results/gateway.jsonl` returns **0** by design, not because openhands failed.
Do not read that as a failure — check the table above.

### sweagent's traps (the two that cause ZERO requests)

- **`CUSTOM_TIKTOKEN_CACHE_DIR` is mandatory on Windows.** litellm pins `TIKTOKEN_CACHE_DIR` to its
  bundled dir and ships a `cl100k_base` rank file whose sha256 does not match what tiktoken verifies,
  so tiktoken re-downloads on *every* call and then `os.rename`s onto the existing file →
  `FileExistsError [WinError 183]`. **Linux overwrites silently, so this is invisible on Linux and
  fatal on Windows.** SWE-agent retries ~20× with backoff (up to ~20 min) and **never opens a socket**.
  Point it at a writable empty dir.
- **An unpriced model needs `per_instance_cost_limit: 0` AND `total_cost_limit: 0`**, or
  `ModelConfigurationError: Error calculating cost: This model isn't mapped yet` kills the run
  immediately after the first successful response.
- **The "requirements are unsatisfiable" error is NOT a Python-version problem.** PyPI `swe-agent` is
  404; PyPI `sweagent` is a dead 2024 placeholder depending on `togetherunidiff`, which does not exist
  on PyPI. The real `requires-python` is `>=3.11`, already satisfied. Install **editable from source**
  (`git clone` + `uv pip install --editable .`) — a non-editable wheel dies on import because
  `sweagent/__init__.py` asserts the repo-root `config/`, `tools/`, `trajectories/` exist.
- `git clone` needs `core.longpaths=true`; clone to a short root (`C:\swe\`).
- The flag is `--output_dir`, not `--output`.

Each working harness was verified **twice**: by `tools/harness-smoke.mjs` and by the real matrix runner
`tools/run-experiment.mjs`. The runner path is the one that matters, because it is the one that produces
study data. Records whose `runId` is a `<matrixId>-<harness>-<task>-<arm>-s<seed>` string prove the
runner path specifically.

## 2. The three bugs that were live, and what they cost

All three were **silent**. Each produced a successful-looking run.

### 2.1 `{key}` expanded to the literal string `"undefined"` (runner, pre-existing)

`tools/run-experiment.mjs` `commandFor()` read `p.syntheticKey`, a property no plan entry ever had.
`String.replace` coerces its second argument, so the command line contained the seven characters
`undefined`, the harness sent that as its API key, the gateway swapped it for the real key, **every
request returned 200 and the run reported success** — while attribution collapsed to
`harness: unlabelled`, `runId: unset`, and that run's cost became unrecoverable.

33 such records were already sitting in `results/gateway.jsonl`. It survived because the only two
harnesses using the `{key}` placeholder are cline (blocked on the base-URL bug) and aider (excluded).
`commandFor()` now receives an enriched run object and **throws** if the synthetic key does not reach
the command line.

**Generalise it:** any placeholder that can expand to `undefined` is a data-integrity bug, not a
formatting bug. Grep for `{` placeholders whenever you add a harness.

### 2.2 The endpoint came from a config store, not a flag (cline, the original zero-requests bug)

Cline reads its base URL from `<config-dir>/data/settings/providers.json`. There is **no flag and no
environment variable** for it. With no `baseUrl` there, cline does not fail — it calls
`https://api.openai.com/v1/chat/completions`. The runner passed `--data-dir`, which moves only
sessions/logs/dbs; the provider store lives under `--config`. So cline fell back to a stale
`~/.cline` entry whose key was the literal string `"undefined"`.

Two sub-traps, both measured:

- **Hand-writing `providers.json` does not work.** Seeding the exact bytes `cline auth` writes, at the
  exact path cline reads, was silently ignored — and the run then *stripped those fields back out*.
  Only executing `cline auth` works.
- **A shared global store silently mis-routes.** A run aimed at gateway port A is billed through the
  `baseUrl` of port B, with no error. `--config <fresh-dir>` per run fixes it.

### 2.3 The instrument reproduced the failure it exists to detect (harness-smoke.mjs)

`harness-smoke.mjs` answered "did the gateway see it?" with `r.harness === id` — which matches **every
earlier run of the same harness already in the log file**. It reported "gateway logged this harness:
9 request(s)" for a run whose command line never executed, and passed that stage with zero real
evidence. That is precisely the cline failure mode, inside the tool built to prevent it.

It now scopes to the run's unique synthetic key and reports how many older records it refused to
count. It also lacked the arg quoting that `run-experiment.mjs` had, so cline rejected the prompt as
"unquoted" — another way the two tools disagreed about whether a harness worked.

**Generalise it:** when you write a check whose job is to detect absence, test it against a case where
the thing is definitely absent. A check that cannot fail is not a check.

## 3. Per-harness wiring, and the shape of each trap

### cline 3.0.66

```
# once per run, then the run itself
cline.cmd --config <workdir>/.cline-config auth -p openai -k <syntheticKey> -m <model> -b <gateway>/v1
cline.cmd --config <workdir>/.cline-config -P openai-compatible -k <syntheticKey> -m <model> \
          --json --auto-approve true -t <timeoutSec> "<prompt>"
```

- `-P gateway` is rejected ("Unknown or disabled provider"). Use `openai-compatible`.
- Invoke `cline.cmd`, not the `.ps1` shim.
- The prompt **must** be a single quoted argument or cline errors out with zero requests.
- It burns ~90s of retry/backoff when the endpoint refuses connections, so always pass `-t`.
- Registry: `authStyle: 'cline-config'` drives the auth step; the runner throws if it fails.

### openhands 1.16.0

```
LLM_API_KEY=<syntheticKey> LLM_BASE_URL=<gateway>/v1 LLM_MODEL=openai/<model> \
  openhands --headless --override-with-envs -t "<prompt>"
```

- `openhands --version` **hangs** — it is an agent launcher, not an argparse CLI. `--help` works
  but **exits 1**.
- `--override-with-envs` is **required**. Without it the LLM env vars are ignored, the warning goes to
  **stderr only**, and `--headless` exits **0** with "Headless mode requires existing settings." Zero
  requests, success code. Same failure class as cline.
- **`PYTHONIOENCODING=utf-8` is mandatory on Windows** — otherwise it dies on
  `UnicodeEncodeError: 'charmap' codec can't encode character '\u2713'` while printing
  `✓ Agent initialized…`, *after* the agent object is already built correctly. The traceback points at
  the wrong thing. Same class as aider's cp1252 crash.
- `--headless` **and** `-t` are both required (`--headless` alone is a parser error; `-t` alone opens
  the TUI).
- `LLM_MODEL` needs the LiteLLM prefix: `openai/deepseek-flash`.
- **Docker is NOT involved in headless mode** (only `serve` uses it). The daemon was not even running
  and nothing broke — do not go looking for a `host.docker.internal` shim.
- **`PERSISTENCE_DIR` does not relocate the store.** Conversations/profiles go to `~/.openhands/`
  regardless, so **parallel runs share state** — a real isolation gap. cline (`--config`) and goose
  (`GOOSE_PATH_ROOT`) have per-run redirects; no equivalent was found for openhands.
- It auto-downloads a ~5.9 MB public skills marketplace into `~/.openhands/cache/skills` and injects
  it into the system prompt: **13,483 input tokens / 59 KB / 7 tools for a one-line file read**. Both
  a first-run-vs-later-run confound and a prompt footprint outside the experimenter's control.
- Base URL is the **`/v1`** form.
- Never wrap the native call in `$ErrorActionPreference='Stop'`: OpenHands writes an Authlib
  deprecation warning to stderr every run, which PowerShell turns into a terminating error that kills
  the script *before any HTTP request*.

### goose 1.52.0

```
GOOSE_PROVIDER=openai GOOSE_MODEL=<model> OPENAI_HOST=<gateway>      # ROOT, no /v1
OPENAI_API_KEY=<syntheticKey> GOOSE_PATH_ROOT=<writable-per-run-dir> \
GOOSE_DISABLE_KEYRING=true GOOSE_MODE=auto GOOSE_TELEMETRY_OFF=1 \
  goose run -t "<prompt>" --no-session -q
```

- **`OPENAI_HOST` must be the gateway ROOT.** Goose appends `/v1/chat/completions` itself, so the
  `gateway/v1` convention that OpenHands needs produces `/v1/v1/chat/completions`: 9 records, **all
  404, zero tokens, and goose exits 0**. The exact opposite of LiteLLM. This is the single most
  expensive trap in this document because both shapes are "right" for some harness.
- `OPENAI_MODEL` is silently ignored; `GOOSE_PROVIDER`/`GOOSE_MODEL` are the knobs.
- `OPENAI_BASE_URL` is a legacy alias for the same field — the shared
  `OPENAI_BASE_URL=<gateway>/v1` default must be **unset** for goose. Both tools now honour a `null`
  in the registry `env` block as "unset this".
- Real config root is `%APPDATA%\Block\goose`, **not** the documented `%APPDATA%\goose`. Ask
  `goose info`; do not assume. `GOOSE_PATH_ROOT` is the per-run redirect (there is no
  `GOOSE_CONFIG_DIR`).
- **Goose's own token accounting under-reports ~3×**: `total_tokens`/`session_tokens` counts the
  final request only (5,076 on a run whose true total was 15,064). `state/logs/llm_request.N.jsonl`
  has no usage and no cost at all. The gateway is the only cumulative source — do not "cross-check".
- Install is the GitHub release zip (one file, `goose-package/goose.exe` → `~/.local/bin`). It is
  **not** an npm package (`@block/goose` is 404) and **not** winget `Pressly.Goose`, which is a
  different product.
- Goose's first action is `GET /v1/models`, adding one record per run with `usage: null`. Exclude it
  from "requests with usage".

## 4. Platform notes for this machine

- The shell is **Windows PowerShell 5.1**; `pwsh` is **not** on PATH. `.ps1` files are blocked by
  execution policy — run them as
  `powershell.exe -NoProfile -ExecutionPolicy Bypass -File <script>`.
- `DEEPSEEK_API_KEY` is **not** in `.keys.json`. `scripts/start-provider.ps1 -Provider deepseek` therefore
  fails ("no usable key"). Read it from `~/.dsh/.credentials.yaml` under `refs:`, as the gateway on
  8787 does.
- **Docker CLI is installed (28.3.3) but the daemon was not reachable** during this session
  (`dockerDesktopLinuxEngine` missing). `docker --version` succeeds; that proves nothing about
  whether containers can run. Any Docker-based route needs the daemon started first.
- goose.exe got `Zugriff verweigert (os error 5)` creating directories outside the repo while
  cmd/python/uv succeeded at the same paths. Cause unidentified, believed machine-specific. Keep
  `GOOSE_PATH_ROOT` inside the repo.

## 5. Verification recipe

```powershell
# per-harness gate, then confirm by key - never by exit code
node tools/harness-smoke.mjs --harness <id> --gateway <gw> --log <gw log> --run

node -e "const {readGateway}=await import('./tools/attribute.mjs');
const r=readGateway('results/<gw log>').filter(x=>String(x.syntheticKey).startsWith('exp-<id>-'));
console.log(r.length, r.map(x=>x.harness));"
```

A local gateway for testing: **port 8795 is running** (`results/gateway-harness-verify.jsonl`), started with
`--force-model deepseek-flash --force-effort high` to match the main matrix. Port **8794 was used first and
has been freed**; port 8793 was used and then **lost to a port collision** (see below).

Stop it with
`Get-NetTCPConnection -State Listen -LocalPort 8795 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`.
Do **not** touch 8787/8789/8790/8791/8792 — they carry other live batches.

Note: a gateway started *without* `--force-effort` leaves `reasoning_effort` unset, which is a
**confound** against the main matrix. Do not smoke-test against an unconfigured gateway and then
compare the numbers.

### Ports are CONTESTED — this cost a gateway and nearly cost a measurement

**This machine has more than one session starting gateways, and they will take your port.** At the time
of writing, 8790 (qwen), 8791 (sonnet), 8792 (GLM-5.3, moved from 8788) and 8793 (openai) are all in use
by other sessions, and the batch mix rotates as earlier matrices finish.

What happened: a DeepSeek gateway on **8793** was started, worked, and then **exited with code 1 while
printing only its normal startup banner**. The cause was not a crash — another session had already bound
8793 to an OpenAI gateway (`results/openai-gateway.jsonl`), so the bind failed and the process quit. It
looked exactly like a healthy gateway that had "just stopped".

Two lessons worth keeping:

1. **Verify the port is actually free before trusting a URL**, and re-check it after any gap:
   `Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -ge 8787 }`.
   Failure to bind is quiet; a banner on stdout is not proof of a live listener.
2. **Do not hand another agent a port number you have not just checked.** I told a subagent 8793 was
   free based on the instruction "start any gateway you need on 8791 or higher" — 8791+ was already
   being consumed by other sessions. Use 8795+, and confirm first.

**A gateway dying is not evidence about the harness under test.** Every verdict in this document is
derived from records already written to the gateway jsonl files, which survive the process. If a
gateway dies, re-read the log rather than re-running the measurement.

### Reproducing the exact commands

```powershell
# cline (registry drives the mandatory `cline auth` step itself)
node tools/harness-smoke.mjs --harness cline --gateway http://127.0.0.1:8795 --log results/gateway-harness-verify.jsonl --run
node tools/run-experiment.mjs --harness cline --only example-fix --seeds 1 --jobs 1 --gateway http://127.0.0.1:8795 --model deepseek-flash --out results/cline-verify2

# openhands
node tools/run-experiment.mjs --harness openhands --only example-fix --seeds 1 --jobs 1 --gateway http://127.0.0.1:8795 --model deepseek-flash --out results/openhands-verify

# goose
node tools/harness-smoke.mjs --harness goose --gateway http://127.0.0.1:8795 --log results/gateway-harness-verify.jsonl --run
node tools/run-experiment.mjs --harness goose --only example-fix --seeds 1 --jobs 1 --gateway http://127.0.0.1:8795 --model deepseek-flash --out results/goose-verify
```

The originals used ports 8793/8794; substitute whatever port you actually verify is free. The
harness-side command lines in the output are identical either way — only the gateway URL changes.

**The DeepSeek key is not in `.keys.json`** — `scripts/start-provider.ps1 -Provider deepseek` therefore fails
with "no usable key". Read it from `~/.dsh/.credentials.yaml` under `refs:`, exactly as the live
gateway on 8787 does.
