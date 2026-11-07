# UPGRADE — DSH 0.1.5-alpha.1 → 0.1.7-rc.2

## Read this first

**Running the upgrade restarts DSH, which ends the session that wrote it.** That is fine — everything
is committed — but the next session starts cold. `notes/status/RESUME.md` exists so it can pick up.

**Do the upgrade BEFORE the task suite runs.** Milestones 1–2 are 35 runs; re-doing them after an
upgrade costs minutes. After the full matrix it costs 3,600 runs.

## Why upgrade at all

Not because a newer version is faster or better — it is not, for this study. The reason is
**defensibility**: a journal methods section that says *"0.1.5-alpha.1"* invites the question of why
an alpha, and the answer "it was what was installed" is weak. A pinned release candidate is easier to
justify and easier to reproduce.

**The upgrade is optional. Pinning is mandatory.** If the verification below fails and the cause is
not obvious, roll back and pin the alpha — a working pinned alpha beats a broken RC.

**Version choice: `0.1.7-rc.2`** (the `latest` dist-tag). Not `0.2.0-rc.2` — a major bump has far
more chance of breaking the tooling, and buys nothing for this study.

## What it touches — two places, not one

```
C:\Users\user\dsh-app              the CLI          (@deepseek-ai/dsh)
C:\Users\user\.dsh\profiles\web    the profile      (231 dsh-* packages, hoisted into
                                                       ~/.dsh/profiles/node_modules)
```

Upgrading only the first leaves the profile running the old bundles. Both must move together.

## Procedure

```powershell
# 0. Freeze the current state so a rollback is trivial
cd C:\Users\user\betterharness
node tools/snapshot-state.mjs --label pre-upgrade-0.1.5-alpha.1
git add -A; git commit -m "pre-upgrade checkpoint"; git tag pre-upgrade

# 1. Stop DSH. This ends the current session.

# 2. Upgrade the CLI
cd C:\Users\user\dsh-app
npm install @deepseek-ai/dsh@0.1.7-rc.2
node node_modules\.bin\dsh.cmd --version      # expect 0.1.7-rc.2

# 3. Upgrade the profile's bundles
node node_modules\.bin\dsh.cmd plugin --profile web update

# 4. Restart DSH, then run the verification below IN A NEW SESSION.
```

## Verification checklist — run every line

The tooling depends on specific behaviours, all measured on 0.1.5-alpha.1. Any line that changes
behaviour needs a code fix before the experiment can continue.

```powershell
cd C:\Users\user\betterharness
scripts/harness.ps1 preflight
```

| # | what to check | why it matters | expected |
|---|---|---|---|
| 1 | `dsh --version` | the version recorded in the paper | 0.1.7-rc.2 |
| 2 | `scripts/harness.ps1 preflight` | runs everything below in one go | nothing is broken |
| 3 | `node --test router/router-core.test.mjs router/router-plugin.test.mjs router/router-integration.test.mjs` | the integration suite loads a REAL Cordis context from the DSH install — a loader change breaks it | 26/26 |
| 4 | `node tools/validate-presets.mjs` | preset compositions still parse and every row still resolves | 5 presets, all modules resolve |
| 5 | `node tools/test-gateway.mjs` | the gateway is independent of DSH; must stay green | 15/15 |
| 6 | `DSH_TOOLS_MODE=ptc` on a headless run | **the presentation lever the whole design rests on** | 1 declared tool |
| 7 | `DSH_TOOLS_MODE=native` | ditto | ~25 declared tools |
| 8 | `dsh --profile exp --patch conditions\shipped.yml --dump-config` | the id-less **insert** patch form | roster present, no `patch:` warnings |
| 9 | `node tools/dsh-audit.mjs` | session log format — **v3 expected**; a v4 file needs a reader update | prints a session, not an error |
| 10 | `scripts/harness.ps1 smoke -Call` | full end-to-end through the gateway | SMOKE PASS |

Checks **6, 7 and 9** are the load-bearing ones. If `DSH_TOOLS_MODE` stops controlling presentation,
the entire presentation axis is gone and the design needs rethinking; if the session-log format
changed, every measurement tool needs a new reader.

## If something breaks

```powershell
cd C:\Users\user\dsh-app
npm install @deepseek-ai/dsh@0.1.5-alpha.1
node node_modules\.bin\dsh.cmd plugin --profile web update
node node_modules\.bin\dsh.cmd --version
```

Then restore the DSH-side state if needed:

```powershell
Copy-Item C:\Users\user\betterharness\snapshots\pre-upgrade-0.1.5-alpha.1\agent-presets\* `
  "$env:DSH_HOME\.agent-presets\" -Recurse -Force
```

## After a successful upgrade

1. Delete `data/milestone-1` and `data/milestone-2` or mark them as **pre-upgrade** in their READMEs.
   Their numbers came from a different harness version and must not be pooled with post-upgrade runs.
2. Re-run the matrix once (25 runs, ~2 minutes, a few cents) to establish a post-upgrade baseline.
3. Record the version in `notes/records/FIRST-RESULTS.md` and in every future dataset README.
