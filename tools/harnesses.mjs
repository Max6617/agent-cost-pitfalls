/**
 * harnesses — the candidate harnesses under test, as data.
 *
 * Each entry records how to point the harness at the measurement gateway and how
 * to run it headlessly. \`verified\` is deliberately honest, and the levels are
 * ordered - do not read a lower level as a higher one:
 *
 *   docs            - confirmed from official documentation, never run here
 *   unverified      - documented behaviour not confirmed on this machine
 *   untested        - a plausible configuration that may well be wrong
 *   gateway-reached - the harness really did send model requests that the gateway
 *                     recorded and attributed, BUT tool execution is stubbed or
 *                     otherwise not doing the thing the study measures. Cost, step
 *                     and cache shapes are usable; task completion is NOT.
 *                     Currently: sweagent (SWE-ReX DummyRuntime).
 *   end-to-end      - the harness solved a real task and the gateway recorded it.
 *                     Currently: opencode, cline, openhands, goose.
 *
 * The distinction matters: "gateway-reached" is enough to prove the wiring, and
 * NOT enough to put a harness in a task-performance comparison.
 *
 * Nothing here has been installed or executed locally. Treat \`unverified\`
 * entries as work, not as fact.
 *
 * Selection rule for the study set: popularity AND the ability to use a DeepSeek
 * API token directly (OpenAI-compatible base URL) AND a non-interactive mode.
 * Excluded harnesses and why are in notes/records/CROSS-HARNESS.md.
 *
 * ---------------------------------------------------------------------------
 * THE EXPENSIVE TRAPS, for whoever wires up the next harness. Every one of these
 * produced a run that SUCCEEDED, exited 0, and measured nothing or measured the
 * wrong thing. None of them raised an error. Read this first.
 *
 * 1. WHERE THE ENDPOINT COMES FROM. A harness that reads its base URL out of a
 *    config store - not a flag, not an env var - will silently talk to the
 *    vendor's real API instead of the gateway. It does not fail: it gets a 401
 *    for the unknown synthetic key, or a 200 if that store holds a real key, and
 *    you pay for a run that is not in the study. Cline did exactly this. Find the
 *    source of the base URL BEFORE running, and judge only by the gateway log -
 *    never by the harness's own exit code.
 *
 * 2. WRITING THE CONFIG FILE IS NOT CONFIGURING THE HARNESS. Cline's provider
 *    store is <config-dir>/data/settings/providers.json. Writing the exact bytes
 *    `cline auth` writes, to the exact path cline reads, was silently ignored -
 *    and the run then stripped those fields back out of the file. Only EXECUTING
 *    the auth command worked. If a harness has an auth/login subcommand, run it;
 *    do not synthesise its output.
 *
 * 3. A PLACEHOLDER THAT EXPANDS TO "undefined" STILL RUNS. String.replace coerces
 *    its second argument, so a missing value becomes the literal string
 *    "undefined" on the command line. The harness sends it as its API key, the
 *    gateway swaps it for the real key, every request returns 200 and the run
 *    reports success - while attribution collapses to harness "unlabelled", runId
 *    "unset", and that run's cost becomes unrecoverable. This was live in
 *    tools/run-experiment.mjs: commandFor() read p.syntheticKey, a property no
 *    plan entry ever had. It survived because the only two {key} consumers are
 *    cline (blocked) and aider (excluded); 33 such records sat in
 *    results/gateway.jsonl. commandFor() now throws instead.
 *
 * 4. --data-dir IS NOT --config. Cline has both and they do different things:
 *    --data-dir moves sessions/logs/dbs, --config moves the whole tree including
 *    the provider store. The runner assumed --data-dir moved the provider store
 *    and wrote a credential file cline never read. `--config` into a fresh
 *    directory per run is also what makes the base URL per-run, which matters:
 *    a shared store sends a run aimed at gateway port A through port B.
 *
 * 5. VERIFY BY KEY, NOT BY COUNT. The gateway attributes on the synthetic key
 *    exp-<harness>-<runId>. "The harness made requests" is not evidence;
 *    "the gateway logged records whose syntheticKey is exp-<harness>-..." is.
 *    tools/attribute.mjs parseSyntheticKey is the single definition of that split
 *    and every tool that joins runs to usage must use it.
 *
 * 6. CLINE UPDATES ITSELF, AND THAT IS HOW IT BROKE.
 *
 *    On 2026-10-02 cline's matrix reported "NO REQUESTS REACHED THE GATEWAY" on every provider,
 *    and the runner recorded an EPERM with no exit code. The cause was not cline, not the
 *    gateway, and not the flags. It was this:
 *
 *      cmd.exe /d /s /c "npm update -g cline --tag latest --min-release-age=0"
 *
 *    cline runs that itself, in the background, whenever it starts. Caught in the act on this
 *    machine: the process was listed while a run was in progress, and by the time it finished
 *    the global package had gone from 3.0.65 to 3.0.68. On the way through it removed
 *    cline.cmd, cline, cline.ps1 from %APPDATA%\npm, emptied postinstall.mjs to 0 bytes, and
 *    left a 137 MB cline.exe.DELETE.<hash> it could not unlink because cline was using it.
 *    The FIRST time this happened it left node_modules/cline with only a node_modules
 *    subdirectory - no bin/, no package.json - so the shim invoked node on a file that did not
 *    exist. That is the EPERM: not a file lock, not the rmSync in the runner's finally, and not
 *    a spawn failure. A self-updating package that is mid-update cannot be spawned.
 *
 *    THREE CONSEQUENCES FOR THIS STUDY.
 *
 *    a) IT IS A TREATMENT CHANGE. A harness that silently moves 3.0.65 -> 3.0.68 in the middle
 *       of a matrix is a different arm than the one that started it, and nothing on the record
 *       said so. run-experiment.mjs now probes the harness version once per matrix and stamps
 *       it on EVERY run record and into <out>/harness-versions.json.
 *
 *    b) THE FIX IS A PINNED COPY OUTSIDE THE GLOBAL TREE. cline is installed at
 *       <repo>/../betterharness-tools/cline-3.0.65 and invoked by ABSOLUTE PATH. The updater
 *       still fires and still rewrites the GLOBAL install - which is fine, because this arm no
 *       longer uses it. Override the location with CLINE_BIN.
 *
 *    c) IF THE PINNED PATH IS MISSING, SAY SO LOUDLY. Falling back to whatever 'cline' resolves
 *       to on PATH is exactly the silent-version-drift failure this note is about, so the
 *       fallback warns on every use.
 *
 * 7. GATEWAY PORTS ON THIS MACHINE ARE CONTESTED. More than one session starts
 *    gateways, and 8790-8793 were all taken by other sessions during one working
 *    day. A gateway whose bind fails EXITS 1 AFTER PRINTING ITS NORMAL STARTUP
 *    BANNER, so it looks like a healthy gateway that "just stopped" rather than a
 *    port conflict. Check before trusting a URL:
 *      Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -ge 8787 }
 *    Use 8795+ and confirm. Do not hand a port to another agent without checking it
 *    first. And note: a dead gateway is NOT evidence about a harness - the jsonl
 *    logs survive the process, so re-read the log instead of re-running the
 *    measurement.
 * ---------------------------------------------------------------------------
 */
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Where the pinned cline lives. See note 6 above: the global install self-updates mid-matrix,
 * so the arm runs from a copy the updater does not own.
 */
export const CLINE_PINNED = process.env.CLINE_BIN ||
  resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'betterharness-tools', 'cline-3.0.65', 'node_modules', '.bin', 'cline.cmd')
/** The pinned cline JS entry - the file npm's .cmd shim ultimately runs. */
export function clineBinJs () {
  return resolve(dirname(CLINE_PINNED), '..', 'cline', 'bin', 'cline')
}

/**
 * The argv for one cline run, deliberately WITHOUT a shell.
 *
 * WHY. cline is the only harness driven through a .cmd shim, so it is the only one whose prompt
 * passes through cmd.exe - and cmd.exe cannot carry a double quote inside a quoted argument. On
 * 2026-10-04 the hard task edge-cron-parser, whose prompt contains "no next run", made cline exit 1
 * with "Unknown command or unquoted prompt" after 15.8 s and ZERO requests; the hard-suite pilot
 * stopped at preflight because of it. The old path quoted with the MSVC rule (doubling the quote),
 * which cmd.exe does not honour.
 *
 * DSH already runs shell:false with the prompt as one argv element. Cline gets the same treatment
 * through its JS entry, which node executes directly - no cmd.exe, no quoting, nothing to escape.
 * notes/defects/LIVE-DEFECTS-2026-10-04.md section 3.
 */
export function clineCommand (args) {
  return { cmd: process.execPath, args: [clineBinJs(), ...args], shell: false }
}

function clineCmd () {
  if (existsSync(CLINE_PINNED)) return CLINE_PINNED
  console.error('')
  console.error('WARNING: the pinned cline is missing at ' + CLINE_PINNED)
  console.error('  Falling back to whatever "cline" resolves to on PATH. That install UPDATES')
  console.error('  ITSELF with "npm update -g cline --tag latest" while a matrix is running, which')
  console.error('  is how the 2026-10-02 matrix came to record EPERM and measure nothing. The')
  console.error('  version is stamped on every run record, so the drift will be visible - but the')
  console.error('  honest fix is: npm install --prefix ' + resolve(CLINE_PINNED, '..', '..', '..') + ' cline@3.0.65')
  console.error('')
  return 'cline.cmd'
}

export const HARNESSES = {
  dsh: {
    label: 'DSH (this work)',
    repo: 'deepseek-ai/deepseek-harness',
    license: 'MIT',
    stars: null,
    language: 'TypeScript',
    deepseek: 'native provider (deepseek-official)',
    headless: { cmd: 'dsh', args: ['--profile', '{profile}', '--patch', '{conditionPatch}', '{prompt}'] },
    configStyle: 'loader patch sets agent-presets.default; endpoint via DEEPSEEK_BASE_URL',
    verified: 'docs',
    notes: 'The system under study. Native DeepSeek provider; no dialect bridge needed.',
  },

  opencode: {
    label: 'OpenCode',
    repo: 'anomalyco/opencode (formerly sst/opencode)',
    license: 'MIT',
    stars: 210500,
    language: 'TypeScript',
    deepseek: 'OpenAI-compatible provider; --openai-api-url documented',
    headless: { cmd: 'opencode', args: ['run', '--model', 'gateway/{model}', '--format', 'json', '{prompt}'] },
    configStyle: 'config file at ~/.config/opencode/opencode.jsonc, provider.<id>.options.{baseURL,apiKey}. VERIFIED against the published schema.',
    configTemplate: 'conditions/opencode-gateway.jsonc',
    // OpenCode reads its API key from CONFIG, not from the environment: setting
    // OPENAI_API_KEY has no effect and every run was attributed to the config's
    // static key (runId "r001") instead of its own run id. OPENCODE_CONFIG IS
    // honoured - verified by pointing it at a config with a distinct key and
    // seeing that key arrive at the gateway. So the runner writes a per-run
    // config. Same trap will apply to other harnesses: check where the key comes
    // from before trusting env-var attribution.
    configEnv: 'OPENCODE_CONFIG',
    configKeyPlaceholder: 'exp-opencode-r001',
    verified: 'end-to-end',
    installedVersion: '1.18.30',
    installedAt: '%APPDATA%/npm/opencode',
    smokeResult: {
      date: '2026-09-29',
      task: 'read hello.txt and reply with its contents',
      exitCode: 0,
      wallClockSec: 5.9,
      requests: 8,
      inputTokens: 15766,
      outputTokens: 161,
      cacheHitTokens: 7424,
      cacheMissTokens: 8342,
      cacheHitRate: 0.471,
      billedUsd: 0.00142,
      rewrittenRequests: 8,
      note: 'First end-to-end cross-harness measurement. 8 model requests for a one-file read is a chatty loop worth quantifying; the ~98:1 input:output ratio matches the ~100:1 reported for production agent loops.',
    },
    notes: 'Largest OSS coding agent. Has an in-tree experimental CodeMode (MCP-scoped), so it is the closest design comparator to DSH ptc mode. ALSO exposes "opencode stats" (native token/cost tracking) and "opencode export [sessionID]" (session as JSON) - an independent cross-check on the gateway numbers, which is worth doing for one arm as a measurement-validity check.',
  },

  cline: {
    label: 'Cline',
    repo: 'cline/cline',
    license: 'Apache-2.0',
    stars: 69500,
    language: 'TypeScript',
    deepseek: 'OpenAI-compatible provider',
    // VERIFIED from \`cline --help\` on this machine (installed 2026-09-29).
    // -k/--key takes the API key on the command line, so attribution is per-run
    // without a config file - unlike OpenCode, which needs OPENCODE_CONFIG.
    // .cmd, not the .ps1 shim that \`Get-Command cline\` resolves to. Spawning a .ps1
    // through shell:true produced exit=undefined with no output at all - it never
    // ran. npm installs cline, cline.cmd and cline.ps1; the .cmd is the one cmd.exe
    // executes.
    // VERIFIED on this machine. Cline validates provider ids against a FIXED list,
    // so "gateway" is rejected outright ("Unknown or disabled provider"). \`-p openai\`
    // maps onto its built-in \`openai-compatible\` provider, which accepts a custom
    // baseUrl - that is the way in. Registration looks like:
    //   cline auth -p openai -k <key> -m <model> -b <gateway>/v1
    // which writes data/settings/providers.json. The runner generates that file per
    // run under --data-dir instead of mutating the user's ~/.cline.
    // VERIFIED end to end through the gateway. Two things had to be right:
    //   1. register ONCE per gateway, because Cline validates provider ids against a
    //      fixed list and stores the base URL in ~/.cline:
    //        cline auth -p openai -k <anything> -m <model> -b <gateway>/v1
    //      (\`-p openai\` maps onto its built-in \`openai-compatible\` provider.)
    //   2. pass -k per run, which overrides the stored key for attribution.
    // --data-dir was tried first and SILENTLY IGNORED: Cline fell back to the stale
    // ~/.cline entry whose key was the literal string "undefined", and the run still
    // reported success. That is the worst failure mode in this study - a harness that
    // works, looks right, and measures nothing.
    // VERIFIED END TO END through the gateway on 2026-09-30. TWO records on a
    // one-file read task, harness="cline", billed $0.000961. Exact command:
    //   cline.cmd -P openai-compatible -k exp-cline-smoke1 -m deepseek-flash \
    //     --json --auto-approve true "Read hello.txt ... reply with its exact contents."
    //
    // THE ZERO-REQUESTS BUG IS SOLVED, and the cause was NOT what the registry
    // previously guessed. The base URL is what silently routes the traffic, and it
    // is read from the provider store ONLY. There is no env var and no flag for it:
    //   - `cline.cmd -P openai-compatible -k <key> -b <url>`  -> "-b" is not a flag
    //     cline 3.0.66 has. The base URL came from the store and nowhere else.
    //   - with no baseUrl in the store, cline does NOT fail. It calls
    //     https://api.openai.com/v1/chat/completions and returns OpenAI's 401. That
    //     401 is the ONLY signal that a run measured nothing. `cline` printed a
    //     clean run_result and exit 0 in the first probe while its traffic went to
    //     api.openai.com - the exact "looks like data and is not" failure mode.
    //
    // WHERE THE STORE ACTUALLY IS - the trap that cost the most time:
    //   <config-dir>/data/settings/providers.json, and <config-dir> defaults to
    //   ~/.cline. It is NOT under --data-dir. --data-dir only redirects sessions,
    //   logs and the sqlite dbs; the runner wrote its provider store under
    //   --data-dir and cline never read it, so it fell back to the stale
    //   ~/.cline entry whose key was the literal string "undefined".
    //
    // AND THE SUBTLER TRAP, which cost more: HAND-WRITING that providers.json does
    // NOT work. Seeding the exact bytes that `cline auth` writes - same path, same
    // fields, same version - was silently ignored AND then stripped by the run
    // (apiKey and baseUrl removed from the file). `cline auth` must be executed:
    //   cline.cmd --config <dir> auth -p openai -k <key> -m <model> -b <url>
    // Doing that into a fresh --config dir IS honoured: the store it produced drove
    // a run to the base URL in it (proved by pointing it at a dead port and getting
    // ConnectionRefused rather than api.openai.com).
    //
    // So per-run isolation is achieved with --config, which is STRICTLY BETTER than
    // the old global ~/.cline store: that store is shared across sessions, and a
    // run pointed at gateway port A silently measured through the base URL of
    // port B. `-k` still overrides the key per run and remains the attribution
    // mechanism; `auth` supplies the base URL, `-k` supplies the identity.
    // cmd is resolved at the call site (clineCmd()) because the pinned absolute path depends
    // on the checkout. See note 6: the global shim is a moving target.
    get headless () { return { cmd: clineCmd(), args: ['--config', '{configDir}', '-P', 'openai-compatible', '-k', '{key}', '-m', '{model}', '--json', '--auto-approve', 'true', '-t', '{timeoutSec}', '{prompt}'] } },
    // Executed once per run BEFORE headless, with authStyle 'cline-config'.
    get auth () { return [clineCmd(), '--config', '{configDir}', 'auth', '-p', 'openai', '-k', '{key}', '-m', '{model}', '-b', '{baseUrl}/v1'] },
    authStyle: 'cline-config',
    requiresRegistration: 'YES - auth is mandatory, see authStyle. Hand-writing providers.json does not work.',
    keyVia: 'flag',
    configStyle: 'provider store at <config-dir>/data/settings/providers.json; config dir set by --config (default ~/.cline). Base URL lives ONLY here - no env var, no flag.',
    verified: 'end-to-end',
    // 3.0.65, not 3.0.66: this field said 3.0.66 while the pinned copy is 3.0.65, and the
    // matrix.json diff between declaredVersion and probedVersion is what caught it. A declared
    // version that disagrees with the installed one is worse than no declared version.
    installedVersion: '3.0.65',
    installedAt: '%APPDATA%/npm/cline.cmd',
    smokeResult: {
      date: '2026-09-30',
      task: 'read hello.txt and reply with its exact contents',
      exitCode: 0,
      requests: 2,
      inputTokens: 10788,
      outputTokens: 137,
      cacheHitTokens: 5248,
      cacheMissTokens: 5540,
      billedUsd: 0.000961,
      command: 'node tools/harness-smoke.mjs --harness cline --gateway http://127.0.0.1:8794 --log results/gateway-cline-verify.jsonl --run',
      note: 'Broke a run that had produced ZERO gateway records. Cost of the bug: every cline run silently billed to api.openai.com. Verified twice after the fix: by harness-smoke.mjs (2 records, $0.00097) and through the real runner tools/run-experiment.mjs (5 records, $0.002117).',
    },
    notes: 'Headless contract is documented in detail (JSON output, timeouts, CLINE_COMMAND_PERMISSIONS). Subagents have their own context window and token budget, so it is the comparator for context isolation. Uses ~90s of retry/backoff when the endpoint refuses connections, so always pass -t.',
  },

  // ---- The Anthropic-native retention pilot (2026-10-10) --------------------------------
  //
  // Two PILOT-ONLY ids. They run the same installed binaries as opencode and cline, but
  // pointed at the gateway's native /v1/messages path (where tools/measure-gateway.mjs
  // injects cache_control and logs the cache split) instead of the OpenAI-compatible path
  // (where Anthropic's compatibility layer reports no split at all). New ids on purpose:
  // every existing matrix and both study entries above are untouched.
  // Pre-declaration and acceptance gate: notes/records/RETENTION-PILOT-2026-10-10.md.
  // NO DASHES IN THE ID. The study's synthetic key is exp-<harness>-<runId> and
  // tools/attribute.mjs splits it on the FIRST dash, so a dashed harness id silently
  // re-attributes every request to the study's plain 'opencode' harness and mangles the runId
  // (measured 2026-10-10: the gateway logged harness "opencode", runId "anthropic-<matrix>-...").
  // Flat ids keep attribution exact; the human-readable label is the second field.
  opencodeanthropic: {
    label: 'OpenCode (Anthropic-native pilot)',
    repo: 'anomalyco/opencode (formerly sst/opencode)',
    license: 'MIT',
    stars: 210500,
    language: 'TypeScript',
    deepseek: 'not used in this configuration',
    headless: { cmd: 'opencode', args: ['run', '--model', 'gateway/{model}', '--format', 'json', '{prompt}'] },
    configStyle: 'per-run config generated by the runner; provider "gateway" with npm @ai-sdk/anthropic and baseURL at the gateway ROOT (the Anthropic SDK appends /v1/messages).',
    configTemplate: 'conditions/opencode-gateway.jsonc',
    configEnv: 'OPENCODE_CONFIG',
    configKeyPlaceholder: 'exp-opencode-anthropic-r001',
    anthropicNative: true,
    verified: 'unverified',
    installedVersion: '1.18.30',
    installedAt: '%APPDATA%/npm/opencode',
    notes: 'Pilot-only. The OpenAI-compatible opencode entry above is unchanged and remains the study configuration; this one measures retention when the harness is given declared caching, not its OpenAI-compat retention.',
  },

  // BLOCKED, and kept on the record as blocked: cline 3.0.65's CLI refuses a base URL for the
  // Anthropic provider outright ("base URL is only supported for OpenAI and OpenAI-compatible
  // providers", measured 2026-10-10), so this entry cannot be pointed at the gateway and is NOT
  // used by any plan that expects requests. See notes/records/RETENTION-PILOT-2026-10-10.md.
  clineanthropic: {
    label: 'Cline (Anthropic-native pilot)',
    repo: 'cline/cline',
    license: 'Apache-2.0',
    stars: 69500,
    language: 'TypeScript',
    deepseek: 'not used in this configuration',
    get headless () { return { cmd: clineCmd(), args: ['--config', '{configDir}', '-P', 'anthropic', '-k', '{key}', '-m', '{model}', '--json', '--auto-approve', 'true', '-t', '{timeoutSec}', '{prompt}'] } },
    get auth () { return [clineCmd(), '--config', '{configDir}', 'auth', '-p', 'anthropic', '-k', '{key}', '-m', '{model}', '-b', '{baseUrl}'] },
    authStyle: 'cline-config',
    requiresRegistration: 'YES - the same registration trap as the openai-compatible entry: cline auth must execute; -p anthropic names the native provider and -b the gateway ROOT.',
    keyVia: 'flag',
    configStyle: 'provider store at <config-dir>/data/settings/providers.json; base URL lives only here.',
    anthropicNative: true,
    verified: 'unverified',
    notes: 'Pilot-only. The OpenAI-compatible cline entry above is unchanged and remains the study configuration.',
  },

  openhands: {
    label: 'OpenHands',
    repo: 'OpenHands/OpenHands + OpenHands/software-agent-sdk',
    license: 'MIT (SDK)',
    stars: 89300,
    language: 'Python',
    deepseek: 'model-agnostic via LiteLLM',
    // VERIFIED end to end through the gateway on 2026-09-30 (openhands 1.16.0,
    // openhands-sdk 1.21.0). Verified TWICE: by a hand-rolled smoke launcher
    // (tools/openhands-smoke.ps1, removed in the release cleanup) and by the
    // real matrix runner tools/run-experiment.mjs (results/openhands-verify, 5
    // records, all HTTP 200). Gateway log: results/gateway-openhands.jsonl.
    //
    // TRAPS, all of which cost time. Every one of them produces a run that EXITS 0:
    //  - `--override-with-envs` is MANDATORY. Without it LLM_API_KEY / LLM_BASE_URL /
    //    LLM_MODEL are IGNORED, the warning goes to STDERR ONLY, and --headless exits
    //    0 with "Headless mode requires existing settings." Zero requests, success
    //    code. This is the "looks like data and is not" failure exactly.
    //  - `PYTHONIOENCODING=utf-8` is MANDATORY on Windows. Without it the run dies on
    //    UnicodeEncodeError: 'charmap' codec can't encode character '\u2713' while
    //    printing "Agent initialized with model: ...". The agent object is ALREADY
    //    built and correct at that point, so the traceback points at the wrong thing.
    //    Same class as aider's cp1252 rich-console crash.
    //  - `openhands --version` HANGS. `--help` works but exits 1. Do not probe either
    //    in a way that waits forever.
    //  - `--headless` AND `-t` are BOTH required. --headless alone is a parser error;
    //    -t alone drops into the interactive Textual TUI.
    //  - LLM_MODEL needs a LiteLLM provider prefix: `openai/deepseek-flash` (or
    //    `deepseek/...`). Bare `deepseek-flash` is unsafe.
    //  - LLM_BASE_URL must INCLUDE /v1; LiteLLM appends /chat/completions to it.
    //    NOTE THE OPPOSITE CONVENTION IN GOOSE, which wants the bare root.
    //  - Docker is NOT involved in headless mode. Only `serve` uses Docker
    //    (gui_launcher.py). The daemon was not even running here and nothing broke,
    //    so no host.docker.internal shim is needed. Do not go looking for one.
    //  - PERSISTENCE_DIR does NOT relocate the store: conversations and profiles go
    //    to ~/.openhands/ regardless. Parallel runs SHARE state. This is a real
    //    isolation gap for the study - unlike cline (--config) and goose
    //    (GOOSE_PATH_ROOT), openhands has no per-run redirect that was found.
    //  - It auto-downloads a ~5.9 MB public skills marketplace into
    //    ~/.openhands/cache/skills/public-skills and injects it into the system
    //    prompt. First request was 13,483 input tokens / 59 KB / 7 tools for a
    //    ONE-LINE FILE READ. That is a first-run-vs-later-run confound AND a prompt
    //    footprint outside the experimenter's control - record it with the numbers.
    headless: { cmd: 'openhands', args: ['--headless', '--override-with-envs', '-t', '{prompt}'] },
    keyVia: 'env',
    env: { LLM_API_KEY: '{key}', LLM_BASE_URL: '{baseUrl}/v1', LLM_MODEL: 'openai/{model}', OPENHANDS_SUPPRESS_BANNER: '1' },
    requiresEnv: 'PYTHONIOENCODING=utf-8 (the runner sets it globally; without it the run dies mid-banner)',
    configStyle: 'LiteLLM LLM_API_KEY / LLM_BASE_URL / LLM_MODEL; --override-with-envs is REQUIRED or the stored config wins',
    verified: 'end-to-end',
    installedVersion: '1.16.0',
    installedAt: '%USERPROFILE%/.local/bin/openhands.exe (uv tool)',
    smokeResult: {
      date: '2026-09-30',
      task: 'read hello.txt and reply with its contents',
      exitCode: 0,
      requests: 2,
      inputTokens: 27135,
      cacheHitTokens: 13440,
      outputTokens: 249,
      billedUsd: 0.00236334,
      gatewayLog: 'results/gateway-openhands.jsonl',
      command: 'LLM_API_KEY=exp-openhands-smoke2 LLM_BASE_URL=http://127.0.0.1:8793/v1 LLM_MODEL=openai/deepseek-flash openhands --headless --override-with-envs -t "Read hello.txt ..."',
      note: 'No Docker sandbox was involved; the gateway was reached directly on the host.',
      smokeScript: 'tools/openhands-smoke.ps1 (removed in the release cleanup)',
      verifiedViaRunner: {
        command: 'node tools/run-experiment.mjs --harness openhands --only example-fix --seeds 1 --jobs 1 --gateway http://127.0.0.1:8793 --model deepseek-flash --out results/openhands-verify',
        runId: 'mmuoe9dbu-openhands-example-fix-openhands-s1',
        requests: 5,
        statuses: '5/5 HTTP 200',
        inputTokens: 72822,
        outputTokens: 874,
        cacheHitTokens: 60800,
        cacheMissTokens: 12022,
        billedUsd: 0.003630,
        solved: true,
        wallClockSec: 70,
      },
    },
    notes: 'Has a documented condenser for context compression and ask_oracle as a routing primitive. Comparator for history compaction.',
  },

  goose: {
    label: 'Goose',
    repo: 'aaif-goose/goose (formerly block/goose)',
    license: 'Apache-2.0',
    stars: 54700,
    language: 'Rust',
    deepseek: 'provider registry includes OpenAI-compatible endpoints',
    // VERIFIED end-to-end through the gateway on this machine 2026-09-30.
    // NOT an npm package (@block/goose is 404) and NOT winget Pressly.Goose
    // (that is a database migration tool - a different product, do not install).
    // Real Windows install = the GitHub release zip, which contains one file:
    //   goose-x86_64-pc-windows-msvc.zip -> goose-package/goose.exe (255 MB)
    //   https://github.com/aaif-goose/goose/releases/download/v1.52.0/goose-x86_64-pc-windows-msvc.zip
    // Extracted to %USERPROFILE%\.local\bin, which is already on this machine's
    // user PATH, so `goose` resolves with no PATH edit. Verified identity:
    // v1.52.0, Rust, "An AI agent", with `goose run` / `goose info`.
    headless: { cmd: 'goose', args: ['run', '-t', '{prompt}', '--no-session', '-q'] },
    keyVia: 'env',
    // THE TRAP: OPENAI_HOST must be the gateway ROOT, with NO /v1 suffix. Goose
    // appends the full path itself and posts to {host}/v1/chat/completions, so
    // the gateway+'/v1' convention that OpenHands/LiteLLM need produces
    // /v1/v1/chat/completions - nine records, all 404, zero tokens, exit code 0.
    // OPENAI_BASE_URL is a legacy alias for the same field: unset it for goose so
    // which one wins is never in question. This is why the shared
    // OPENAI_BASE_URL=gateway/v1 default in harness-smoke.mjs must not be
    // inherited by this harness.
    baseUrlEnv: 'OPENAI_HOST',
    baseUrlSuffix: '',
    // GOOSE_PROVIDER / GOOSE_MODEL select the provider and model - NOT
    // OPENAI_MODEL, which goose ignores. OPENAI_API_KEY is still the credential
    // (with GOOSE_PROVIDER=openai). No config.yaml is needed: env vars alone
    // produced the working run. GOOSE_PATH_ROOT relocates config/ data/ state/
    // as a unit and IS the per-run isolation mechanism. There is no
    // GOOSE_CONFIG_DIR.
    configStyle: 'env only was sufficient, no config.yaml needed: GOOSE_PROVIDER + GOOSE_MODEL + OPENAI_API_KEY + OPENAI_HOST',
    configEnv: 'GOOSE_PATH_ROOT',
    configFileUnderRoot: 'config/config.yaml',
    defaultWindowsRoot: '%APPDATA%\\Block\\goose',
    defaultWindowsConfig: '%APPDATA%\\Block\\goose\\config\\config.yaml',
    // Consumed by BOTH harness-smoke.mjs and run-experiment.mjs, which substitute
    // {key} {model} {baseUrl} {configDir} and apply these AFTER their shared
    // defaults. A null value means UNSET: they drop the variable from the child env,
    // which is how this harness refuses the shared OPENAI_BASE_URL=<gateway>/v1.
    // {configDir} resolves to a per-run directory. Keep GOOSE_PATH_ROOT inside the
    // repo or the run's temp tree: on this machine goose.exe got
    // "Zugriff verweigert (os error 5)" creating directories outside the repo while
    // cmd/python/uv all succeeded at the same paths. Cause unidentified, believed
    // machine-specific - note it before blaming the harness.
    env: {
      GOOSE_PROVIDER: 'openai',
      GOOSE_MODEL: '{model}',
      // ROOT, no /v1. Goose appends /v1/chat/completions itself.
      OPENAI_HOST: '{baseUrl}',
      OPENAI_BASE_URL: null,
      OPENAI_API_KEY: '{key}',
      GOOSE_PATH_ROOT: '{configDir}',
      GOOSE_DISABLE_KEYRING: 'true',
      GOOSE_MODE: 'auto',
      GOOSE_TELEMETRY_OFF: '1',
    },
    smokeScript: 'tools/goose-smoke.ps1 (removed in the release cleanup)',
    verified: 'end-to-end',
    installedVersion: '1.52.0',
    installedAt: '%USERPROFILE%/.local/bin/goose.exe',
    smokeResult: {
      date: '2026-09-30',
      task: 'read hello.txt and reply with its contents',
      command: 'goose run -t "<prompt>" --no-session -q',
      exitCode: 0,
      wallClockSec: 6.0,
      requests: 5,
      requestsWithUsage: 4,
      inputTokens: 14693,
      outputTokens: 371,
      reasoningTokens: 132,
      cacheHitTokens: 9216,
      cacheMissTokens: 5477,
      cacheHitRate: 0.6272,
      billedUsd: 0.001128708,
      toolsPerRequest: 17,
      streaming: '4/4 chat requests streamed',
      note: 'A first attempt with OPENAI_HOST=<gateway>/v1 logged 9 records that were ALL 404 (path /v1/v1/chat/completions) and 0 tokens, while goose still exited 0. Distinct runIds (smoke01 vs smoke02) keep the failed and the working run separable in the log.',
      // Goose's own CLI log (state/logs/cli/<date>/*.log) reports
      // total_tokens=5076 for this run. That equals the LAST request only
      // (4928 in + 148 out), not the sum over the run (14693 + 371 = 15064).
      // Goose's self-reported token count UNDER-REPORTS a 4-request run by ~3x.
      // The gateway's cumulative accounting is the correct one; do not use
      // goose's session_tokens as an independent cross-check.
      selfReportedTokensTrap: 'goose CLI total_tokens/session_tokens counts the final request only (5076), not the run total (15064)',
      usageLog: 'state/logs/llm_request.N.jsonl holds requests (model_config, input) but NO usage and NO cost fields',
      // Both tools in this repo were then taught the env wiring above and re-verified.
      // These are the numbers to trust; the smokeScript run was hand-rolled.
      verifiedViaHarnessSmoke: {
        command: 'node tools/harness-smoke.mjs --harness goose --gateway http://127.0.0.1:8794 --log results/gateway-cline-verify.jsonl --run',
        key: 'exp-goose-smoke',
        requests: 3,
        inputTokens: 9315,
        outputTokens: 62,
        cacheHitTokens: 8832,
        cacheMissTokens: 483,
        cacheHitRate: 0.948,
        billedUsd: 0.00033,
        result: 'PASS - 3 records, not the 9 all-404 records the /v1 form produces',
      },
      verifiedViaRunner: {
        command: 'node tools/run-experiment.mjs --harness goose --only example-fix --seeds 1 --jobs 1 --gateway http://127.0.0.1:8794 --model deepseek-flash --out results/goose-verify',
        runId: 'mmuoebvow-goose-example-fix-goose-s1',
        requests: 6,
        statuses: '6/6 HTTP 200',
        inputTokens: 23571,
        outputTokens: 408,
        cacheHitTokens: 21376,
        cacheMissTokens: 2195,
        billedUsd: 0.00102,
        solved: true,
        wallClockSec: 6,
      },
    },
    notes: 'Explicit state machine with tool-pair compaction. Comparator for compaction granularity. Goose ships a large default tool surface - 17 tools on a one-file read, including analyze/summarize/summon/orchestrator/apps extensions - which is a measurable design choice, not incidental. GOOSE_SHELL defaults to cmd.exe on Windows and cmd silently truncates a command at the first newline; set GOOSE_SHELL=powershell only if a task needs multi-line shell, because it changes the shell the agent sees.',
  },

  aider: {
    label: 'Aider',
    repo: 'Aider-AI/aider',
    license: 'Apache-2.0',
    stars: 49200,
    language: 'Python',
    deepseek: 'native deepseek/ models via litellm; any OpenAI-compatible endpoint via openai/ prefix',
    // VERIFIED from \`aider --help\` on this machine (installed 2026-09-29 via uv).
    // Aider's flags are the most explicit of any harness here: base URL AND key are
    // both command-line arguments, so pointing it at the gateway needs no config
    // file and no environment variable.
    // --no-pretty because aider's rich console crashes on Windows cp1252:
    //   UnicodeEncodeError: 'charmap' codec can't encode character '\u25ba'
    // It is a RENDERING failure, not a logic one - the run had already done its
    // work - but it kills the process and looks like the harness failing.
    headless: { cmd: 'aider', args: ['--yes-always', '--no-auto-commits', '--exit', '--no-stream', '--no-pretty', '--openai-api-base', '{baseUrl}', '--openai-api-key', '{key}', '--model', 'openai/{model}', '--message', '{prompt}'] },
    keyVia: 'flag',
    // --openai-api-base: VERIFY whether aider wants the gateway root or the /v1
    // suffix. Guess is the root; the smoke test settles it in one run.
    configStyle: 'OPENAI_API_BASE + OPENAI_API_KEY with --model openai/<name>, or --model deepseek/<name>',
    verified: 'unverified',
    notes: 'STALE - last push 2026-05-22. Included as the widely-used minimal baseline. No tool/plugin API, no MCP, no subagents: a useful lower bound on harness machinery.',
  },

  sweagent: {
    label: 'SWE-agent',
    repo: 'SWE-agent/SWE-agent',
    license: 'MIT',
    stars: null,
    language: 'Python',
    deepseek: 'model-agnostic via LiteLLM; OpenAI-compatible endpoint via the "openai/" model prefix + api_base',
    // REACHES THE GATEWAY - verified 2026-09-30, v1.1.0. 10 records, 10x HTTP 200,
    // 16,500 in / 1,206 out, $0.001156736, harness="sweagent", in results/gateway.jsonl.
    //
    // !! READ THE CAVEAT BEFORE USING THESE NUMBERS !!
    // The agent loop is REAL: real model, real token accounting, real prompt cache,
    // real cost. TOOL EXECUTION IS A NO-OP. The records come from
    // env.deployment.type=dummy (SWE-ReX DummyRuntime), where create_session
    // succeeds and every command returns exit_code=0 with EMPTY OUTPUT. The agent
    // therefore never actually read hello.txt.
    //   - Cost/step/cache shapes are usable.
    //   - Task-completion and pass-rate are NOT. Do not fold these runs into a
    //     performance comparison against dsh/opencode/cline/goose.
    // Both faithful backends are unavailable on this host: the Docker daemon is DOWN
    // (Docker Desktop installed but stopped), and swe-rex's `local` deployment calls
    // pexpect.spawn("/usr/bin/env bash") - pexpect needs a Unix pty, so it cannot work
    // on Windows at all. Full-fidelity runs need Linux/WSL2 or a running Docker.
    //
    // Both images DO exist if the daemon is started: sweagent/swe-agent:latest and
    // sweagent/swe-agent-run:latest. Note `docker manifest inspect` talks to the
    // REGISTRY and succeeds even with the daemon down - it is not a liveness check.
    //
    // The 'gateway-reached' level exists for exactly this case: the instrument can
    // see the harness, but the harness is not yet doing the thing the study measures.
    // 'end-to-end' (cline, openhands, goose) means the harness solved a task.
    headless: { cmd: 'sweagent', args: ['run', '--config', '<repo>/config/default.yaml', '--config', '{configFile}'] },
    keyVia: 'config',
    configStyle:
      'YAML. agent.model.{name,api_base,api_key,temperature,per_instance_cost_limit,total_cost_limit,per_instance_call_limit}; env.deployment.type; env.repo; problem_statement.text. ' +
      'The model name MUST carry the "openai/" prefix ("openai/deepseek-flash"): that selects litellm\'s OpenAI-compatible provider so api_base is honoured. ' +
      '"deepseek/deepseek-flash" silently bypasses the gateway and talks to api.deepseek.com directly - zero records.',
    verified: 'gateway-reached',
    verifiedNote: 'Agent loop is real; tool execution is stubbed (SWE-ReX DummyRuntime). Cost/step/cache shapes usable, task completion NOT measured. Do not report as end-to-end.',
    installedVersion: '1.1.0',
    installedAt: 'C:/swe/SWE-agent (editable) into isolated venv .venvs/sweagent (Python 3.12.6)',
    packaging:
      'DO NOT `uv tool install sweagent` / `pip install sweagent`. PyPI `sweagent` is a DEAD placeholder (v0.0.1, uploaded 2024-04-02, requires_python ">=3.9") whose dependency ' +
      '"togetherunidiff" DOES NOT EXIST on PyPI (HTTP 404). uv therefore reports "your requirements are unsatisfiable" - which reads like a Python-version problem and is NOT one. ' +
      'PyPI `swe-agent` is HTTP 404; there is no such project. The real constraint is requires-python ">=3.11", which the machine\'s Python 3.12 already satisfies. ' +
      'The only supported install is from source, and it MUST be editable: `git clone https://github.com/SWE-agent/SWE-agent && uv pip install --editable .`. ' +
      'A non-editable wheel install dies on import with AssertionError because sweagent/__init__.py asserts CONFIG_DIR/TOOLS_DIR/TRAJECTORY_DIR exist as siblings of the package ' +
      '(PACKAGE_DIR.parent/"config" etc.), i.e. the repo root. Overridable via SWE_AGENT_CONFIG_DIR / SWE_AGENT_TOOLS_DIR / SWE_AGENT_TRAJECTORY_DIR.',
    smokeResult: {
      date: '2026-09-30',
      task: 'read hello.txt and reply with its exact contents',
      mode: 'sweagent run, env.deployment.type=dummy - see deploymentNote',
      exitCode: 0,
      requests: 10,
      allStatus200: true,
      inputTokens: 16500,
      outputTokens: 1206,
      cacheHitTokens: 13312,
      billedUsd: 0.001156736,
      syntheticKey: 'exp-sweagent-smoke1',
      exampleRecord: {
        ts: '2026-09-30T17:48:00.700Z',
        harness: 'sweagent',
        runId: 'smoke1',
        syntheticKey: 'exp-sweagent-smoke1',
        path: '/v1/chat/completions',
        model: 'deepseek-flash',
        status: 200,
        usage: { inputTokens: 1263, outputTokens: 108, reasoningTokens: 13, cacheHitTokens: 0, cacheMissTokens: 1263 },
        cost: { coldUsd: 0.00020706000000000004, billedUsd: 0.00020706000000000004 },
        messages: 2,
        tools: 3,
        requestBytes: 4468,
      },
      note: 'The 9 later calls show the prompt cache warming (cacheHitTokens 1024 -> 2048) as observations accumulate. Billing is real; only tool execution is simulated.',
    },
    deploymentNote:
      'The smoke run used env.deployment.type=dummy (SWE-ReX DummyRuntime): create_session succeeds and every command returns exit_code=0 with EMPTY output. ' +
      'So the LM loop, token accounting, cache behaviour and cost are all real, but the agent never actually read hello.txt. Chosen because on Windows both real backends are unavailable: ' +
      '(1) the docker daemon is NOT running (Docker Desktop is installed but stopped), and (2) swe-rex\'s "local" deployment calls pexpect.spawn("/usr/bin/env bash") and pexpect needs a Unix pty. ' +
      'For full-fidelity measurements run under Linux/WSL2, or start Docker Desktop first. NOTE: when sweagent runs on the HOST and only executes commands in a container, the LM call still ' +
      'originates on the host, so http://127.0.0.1:8787/v1 is correct; host.docker.internal is needed only if sweagent itself runs INSIDE a container.',
    windowsTraps: [
      'CUSTOM_TIKTOKEN_CACHE_DIR is MANDATORY on Windows, or ZERO requests are ever sent. litellm pins TIKTOKEN_CACHE_DIR to its bundled tokenizers dir and ships a cl100k_base rank file whose sha256 (59d2daf6...) does NOT match the hash tiktoken verifies (223921b7...). tiktoken therefore re-downloads on every call and then os.rename()s onto the existing file -> WinError 183 FileExistsError on Windows (on Linux os.rename silently overwrites, so the bug is invisible there). SWE-agent retries 20x with exponential backoff and never makes a request. Fix: point CUSTOM_TIKTOKEN_CACHE_DIR at a writable EMPTY directory.',
      'A model litellm does not price (deepseek-flash) MUST have per_instance_cost_limit=0 AND total_cost_limit=0. Otherwise SWE-agent raises ModelConfigurationError("Error calculating cost: This model isn\'t mapped yet") immediately after the FIRST successful response, so the run dies at step 1 having made exactly one request.',
      'git clone fails with "Filename too long" unless core.longpaths=true - the repo has ~200-char paths under trajectories/demonstrations/. Clone to a SHORT root (e.g. C:/swe/).',
      'Set PYTHONIOENCODING=utf-8: SWE-agent\'s rich console output can hit cp1252 UnicodeEncodeError (same class as aider and openhands).',
      'The CLI flag is --output_dir, NOT --output; unknown flags abort with an argparse SettingsError box before anything happens.',
    ],
    notes: 'The canonical academic SWE-bench harness. Docker-first design; treat "runs on Windows" as unsupported territory. Included for the harness-machinery comparison (LiteLLM-based single-agent loop with an ACI tool bundle).',
  },
}

/** Excluded, with the reason - the paper should state this explicitly. */
export const EXCLUDED = {
  'Codex CLI': 'Speaks the OpenAI Responses API, not chat completions, and is effectively ChatGPT-account-locked. Reachable only through a dialect bridge (tools/measure-gateway.mjs can do it) - include as a bonus arm, not a primary one.',
  'Gemini CLI': 'Gemini-model-oriented; DeepSeek support is not a first-class path.',
  'Charm Crush': 'FSL-1.1-MIT: source-available, competing-use restriction, not OSI. Fails a reusability bar.',
  'Roo Code': 'Extension shut down 2026-05-15. Successor is Zoo Code.',
  'Continue': 'README states no longer actively maintained and read-only.',
  'Plandex': '~1 year stale; cloud shut down.',
  'Qwen Code': 'Viable sixth arm (Gemini CLI fork, runtime-switchable providers). Add if budget allows.',
  'Kilo Code / Zoo Code': 'VS Code extensions; headless automation is much harder to make fair.',
}

/** The comparison set. DSH plus the five most popular harnesses that qualify. */
export const STUDY_SET = ['dsh', 'opencode', 'cline', 'openhands', 'goose', 'aider']

/**
 * The harnesses a matrix is actually run against: DSH plus every harness verified END TO END
 * through the gateway. Derived rather than hardcoded, because the hardcoded version is how
 * preflight came to default to `['dsh']` alone - it preflighted one harness and reported
 * "PASSED", while four others were never asked whether they could reach the provider at all.
 *
 *   ['dsh', 'opencode', 'cline', 'openhands', 'goose']
 *
 * Aider is excluded (verified: 'unverified'); sweagent is 'gateway-reached', not end-to-end.
 */
export const STUDY_HARNESSES = ['dsh', ...Object.entries(HARNESSES)
  .filter(([, h]) => h.verified === 'end-to-end')
  .map(([id]) => id)]
