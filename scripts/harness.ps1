<#
.SYNOPSIS
  Operate the optimized DeepSeek Harness setup: presets, host-plane tuning, audits.

.DESCRIPTION
  Commands:
    check      Safe. Validate presets, show the preset catalog, report patch status
               and a context summary of the newest session. Changes nothing.
    apply      Merge scripts/host-optimizations.patch.yml into the profile patch file, then
               verify with 'dsh --dump-config' and roll back automatically if the
               composed tree does not contain the expected values.
    rollback   Restore the newest patch backup.
    audit      Full session context audit (all sessions).
    presets    Regenerate the four optimized presets from the shipped originals.

  Applying hot-reloads a running host (patchReload: live), so 'apply' refuses while
  DSH answers on its port unless you pass -Force. Nothing else here touches the
  running host.

.EXAMPLE
  scripts/harness.ps1 check
  scripts/harness.ps1 apply -DryRun
  scripts/harness.ps1 apply
  scripts/harness.ps1 rollback
#>
[CmdletBinding()]
param(
  [ValidateSet('preflight', 'check', 'apply', 'rollback', 'audit', 'presets', 'smoke', 'setup-opencode')]
  [string]$Command = 'check',
  [switch]$Force,
  [switch]$DryRun,
  # For 'smoke': which harness to test against the gateway.
  [string]$Harness = 'opencode',
  # For 'smoke': actually call the API (a fraction of a cent) instead of checks only.
  [switch]$Call
)

# Targets Windows PowerShell 5.1 (the default on Windows) as well as PowerShell 7+.
$ErrorActionPreference = 'Stop'

# This script lives in scripts/. The repository root is its parent, so tools/,
# tasks/, conditions/ and results/ resolve whether it is started from scripts/ or elsewhere.
$RepoRoot = Split-Path $PSScriptRoot -Parent
$Tools    = Join-Path $RepoRoot 'tools'
$DshHome  = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME '.dsh' }
$PatchFile = Join-Path $DshHome 'profiles/web/cordis.patch.yml'
$Entries   = Join-Path $PSScriptRoot 'host-optimizations.patch.yml'
$PresetRoot = Join-Path $DshHome '.agent-presets'

function Write-Head($t) { Write-Host ''; Write-Host "== $t" -ForegroundColor Cyan }
function Write-Ok($t)   { Write-Host "  [ok]   $t" -ForegroundColor Green }
function Write-Warn2($t){ Write-Host "  [warn] $t" -ForegroundColor Yellow }
function Write-Err($t)  { Write-Host "  [fail] $t" -ForegroundColor Red }

function Find-DshCli {
  $cmd = Get-Command dsh -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $app = if ($env:DSH_APP) { $env:DSH_APP } else { Join-Path $HOME 'dsh-app' }
  foreach ($c in @((Join-Path $app 'node_modules/.bin/dsh.cmd'), (Join-Path $app 'node_modules/.bin/dsh'))) {
    if (Test-Path $c) { return $c }
  }
  return $null
}

function Test-HostRunning {
  try {
    $c = Get-NetTCPConnection -State Listen -LocalPort 3080 -ErrorAction Stop
    return [bool]$c
  } catch { return $false }
}

function Assert-Node {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'node is required but was not found on PATH.' }
}

# ---------------------------------------------------------------- check
function Invoke-Check {
  Write-Head 'presets'
  if (-not (Test-Path $PresetRoot)) { Write-Warn2 "no preset root at $PresetRoot" }
  else {
    $dirs = Get-ChildItem $PresetRoot -Directory -ErrorAction SilentlyContinue
    if (-not $dirs) { Write-Warn2 'preset root is empty' }
    else { & node (Join-Path $Tools 'validate-presets.mjs') $PresetRoot }
  }

  Write-Head 'preset catalog vs shipped built-ins'
  $shipped = Find-ShippedPresets
  if ($shipped) { & node (Join-Path $Tools 'preset-catalog.mjs') $shipped }
  else { Write-Warn2 'shipped presets not found; skipping catalog' }

  Write-Head 'host-plane patch'
  if (-not (Test-Path $PatchFile)) { Write-Warn2 "no patch file at $PatchFile" }
  else {
    $body = (Get-Content $PatchFile -Raw)
    if ($body -match '(?m)^\s*\[\s*\]\s*$') { Write-Warn2 'patch file is empty - host optimizations are NOT applied' }
    elseif ($body -match 'maxInlineBytes:\s*32000') { Write-Ok 'host optimizations appear to be applied' }
    else { Write-Warn2 'patch file has entries but not the staged set' }
  }

  Write-Head 'newest session context'
  & node (Join-Path $Tools 'dsh-audit.mjs')
}

function Find-ShippedPresets {
  $app = if ($env:DSH_APP) { $env:DSH_APP } else { Join-Path $HOME 'dsh-app' }
  $pnpm = Join-Path $app 'node_modules/.pnpm'
  if (-not (Test-Path $pnpm)) { return $null }
  $d = Get-ChildItem $pnpm -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -like '@deepseek-ai+dsh-agent-pres*' } | Select-Object -First 1
  if (-not $d) { return $null }
  $p = Join-Path $d.FullName 'node_modules/@deepseek-ai/dsh-agent-presets/presets'
  if (Test-Path $p) { return $p }
  return $null
}

# ---------------------------------------------------------------- apply
function Invoke-Apply {
  Assert-Node
  if (-not (Test-Path $PatchFile)) { throw "patch file not found: $PatchFile" }
  if (-not (Test-Path $Entries))   { throw "staged entries not found: $Entries" }

  if ((Test-HostRunning) -and -not $Force -and -not $DryRun) {
    Write-Err 'A DSH host is listening on port 3080.'
    Write-Host '  This profile uses patchReload: live, so applying now reloads that host'
    Write-Host '  mid-session. Stop DSH first, or re-run with -Force to accept the reload.'
    exit 1
  }

  $stamp  = Get-Date -Format 'yyyyMMdd-HHmmss'
  $backup = "$PatchFile.bak.$stamp"

  Write-Head 'merge'
  if ($DryRun) {
    & node (Join-Path $Tools 'patch-yaml.mjs') --patch $PatchFile --entries $Entries --dry-run
    Write-Host ''
    Write-Ok 'dry run only - the live patch file was not modified'
    return
  }

  Copy-Item $PatchFile $backup -Force
  Write-Ok "backed up to $backup"

  & node (Join-Path $Tools 'patch-yaml.mjs') --patch $PatchFile --entries $Entries
  if ($LASTEXITCODE -ne 0) {
    Copy-Item $backup $PatchFile -Force
    Write-Err 'merge failed; patch file restored'
    exit 1
  }

  Write-Head 'verify (composes the tree without booting)'
  $dsh = Find-DshCli
  if (-not $dsh) {
    Write-Warn2 'dsh CLI not found - cannot verify. Restoring the backup.'
    Copy-Item $backup $PatchFile -Force
    exit 1
  }

  $dump = & $dsh --profile web --dump-config 2>&1 | Out-String
  $code = $LASTEXITCODE

  $expect = @(
    @{ p = 'maxInlineBytes:\s*32000';  l = 'spill cap 32000' },
    @{ p = 'maxBodyChars:\s*40000';    l = 'web fetch cap 40000' },
    @{ p = 'argumentsPreviewChars:\s*200'; l = 'reminder preview 200' },
    @{ p = 'maxInputBytes:\s*2048';    l = 'title input cap 2048' }
  )
  $bad = @()
  if ($code -ne 0) { $bad += "dump-config exited $code" }
  foreach ($e in $expect) { if ($dump -notmatch $e.p) { $bad += "missing: $($e.l)" } }

  if ($bad.Count) {
    Write-Err 'verification failed:'
    foreach ($b in $bad) { Write-Host "         - $b" }
    Copy-Item $backup $PatchFile -Force
    Write-Err "patch file restored from $backup - nothing changed"
    exit 1
  }
  foreach ($e in $expect) { Write-Ok $e.l }

  Write-Head 'done'
  Write-Host '  The composed tree is valid. Restart DSH to pick it up:'
  Write-Host '    stop the running dsh, then start it again as usual.'
  Write-Host "  To undo:  scripts/harness.ps1 rollback"
}

# ---------------------------------------------------------------- rollback
function Invoke-Rollback {
  $baks = Get-ChildItem "$PatchFile.bak.*" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
  if (-not $baks) { Write-Warn2 'no backups found'; return }
  $newest = $baks | Select-Object -First 1
  Copy-Item $newest.FullName $PatchFile -Force
  Write-Ok "restored $PatchFile from $($newest.Name)"
  Write-Host '  Restart DSH to pick it up.'
}

# ---------------------------------------------------------------- presets
function Invoke-Presets {
  Assert-Node
  $mk = Join-Path $Tools 'make-presets.mjs'
  if ($DryRun -or -not $Force) {
    if (-not $DryRun) { Write-Warn2 'presets already installed; showing a dry run. Pass -Force to overwrite.' }
    & node $mk --dry-run
  } else {
    & node $mk --force
    Write-Host ''
    & node (Join-Path $Tools 'validate-presets.mjs') $PresetRoot
  }
}

# ---------------------------------------------------------------- preflight
# One command that answers "what do I do now": runs every check, then states the
# single next action. Safe - it changes nothing.
function Invoke-Preflight {
  Assert-Node
  $blockers = @()
  $next = @()

  Write-Head '1. decision engine (offline, no key)'
  # Both suites: the core's design rules, and the plugin's static guards (which
  # catch the ctx-service class of bug that makes Cordis refuse a preset at mount).
  # Three suites: the core's design rules, the plugin's static guards against the
  # ctx-service class of mount failure, and integration tests that load the plugin
  # into a real Cordis context and drive the agent-loop hooks.
  $t = & node --test `
    (Join-Path $RepoRoot 'router/router-core.test.mjs') `
    (Join-Path $RepoRoot 'router/router-plugin.test.mjs') `
    (Join-Path $RepoRoot 'router/router-integration.test.mjs') 2>&1 | Out-String
  $pass = ([regex]::Match($t, 'pass (\d+)')).Groups[1].Value
  $fail = ([regex]::Match($t, 'fail (\d+)')).Groups[1].Value
  if ($t -match 'fail 0' -and $pass) { Write-Ok "$pass/$pass router tests pass" }
  else { Write-Err "router tests: pass=$pass fail=$fail"; $blockers += 'router unit tests are failing' }

  Write-Head '2. measurement gateway (offline self-test)'
  $g = & node (Join-Path $Tools 'test-gateway.mjs') 2>&1 | Out-String
  if ($g -match 'ALL PASS') { Write-Ok '15/15 checks pass' } else { $blockers += 'gateway self-test failing' }
  # The Remove-Item that used to delete results/gateway-selftest.jsonl here is gone. It was a
  # delete of a *.jsonl inside the evidence directory - the 2026-10-02 shape - and it is no
  # longer needed: test-gateway.mjs writes a uniquely-named log under results/_scratch and
  # never reuses a filename. Nothing to clean up, so nothing cleans anything up.

  Write-Head '3. presets'
  & node (Join-Path $Tools 'validate-presets.mjs') $PresetRoot 2>&1 | ForEach-Object { Write-Host ('   ' + $_) }
  $routerPreset = Join-Path $PresetRoot 'ptc-router/agent.cordis.yml'
  if (-not (Test-Path $routerPreset)) { $blockers += 'ptc-router preset is missing' }

  Write-Head '4. decision ledger'
  if (Test-Path $routerPreset) {
    $body = Get-Content $routerPreset -Raw
    if ($body -match 'ledgerPath:\s*null') {
      Write-Warn2 'ledgerPath is null - the router will run but record nothing'
      $next += 'turn the ledger on (below) so a run can be verified'
    } else { Write-Ok 'ledger is configured' }
  }
  $ledger = Join-Path $HOME 'router-ledger.jsonl'
  if (Test-Path $ledger) {
    $n = (Get-Content $ledger | Measure-Object).Count
    Write-Ok ("ledger has $n record(s)")
    $kinds = Get-Content $ledger | ForEach-Object { try { (ConvertFrom-Json $_).kind } catch {} } | Group-Object | ForEach-Object { $_.Name + '=' + $_.Count }
    Write-Host ('   kinds: ' + ($kinds -join ', '))
    if (-not ($kinds -match 'route|inject|input')) { $next += 'ledger exists but has no routing records yet' }
  } else { Write-Warn2 'no ledger file yet - the router has never run' ; $next += 'run one session on the PTC + router preset' }

  Write-Head '5. host-plane patch'
  if (-not (Test-Path $PatchFile)) { $blockers += 'profile patch file missing' }
  else {
    $b = Get-Content $PatchFile -Raw
    if ($b -match '(?m)^\s*\[\s*\]\s*$') { Write-Warn2 'staged host optimizations NOT applied'; $next += 'apply the staged host patch (free ~2%)' }
    elseif ($b -match 'maxInlineBytes:\s*32000') { Write-Ok 'host optimizations applied' }
    else { Write-Warn2 'patch has entries but not the staged set' }
  }

  Write-Head '6. experiment harness'
  $cond = (Get-ChildItem (Join-Path $RepoRoot 'conditions') -Filter *.yml -ErrorAction SilentlyContinue | Measure-Object).Count
  Write-Host "   condition patches: $cond"
  $tasks = (Get-ChildItem (Join-Path $RepoRoot 'tasks') -Directory -ErrorAction SilentlyContinue | Measure-Object).Count
  Write-Host "   tasks: $tasks   (a real study wants ~15)"
  if ($tasks -lt 5) { $next += "write a real task suite ($tasks so far, aim for ~15)" }
  if (-not $env:DEEPSEEK_API_KEY) { Write-Host '   DEEPSEEK_API_KEY: not set in this shell (only needed at Step 7)' }

  Write-Head 'verdict'
  if ($blockers.Count) {
    Write-Err 'blocked:'
    foreach ($b in $blockers) { Write-Host "   - $b" }
    return
  }
  Write-Ok 'nothing is broken'
  if (-not $next.Count) { Write-Host '   Everything is in place. Start a new session and use it.' ; return }
  Write-Host ''
  Write-Host '   Next actions, cheapest first:' -ForegroundColor Yellow
  $i = 0
  foreach ($n in $next) { Write-Host ('   ' + (++$i) + '. ' + $n) }
  Write-Host ''
  Write-Host '   The single most valuable one is the first: everything downstream depends' -ForegroundColor DarkGray
  Write-Host '   on the router having actually run once. It needs no API key.' -ForegroundColor DarkGray
}

# ---------------------------------------------------------------- smoke
# Test one harness against the gateway. Resolves every path from the repository
# root (the parent of this script), so it works from ANY working directory - which
# is exactly how the first attempt at this failed: the instructions had a cd in
# one block and not the other.
function Invoke-Smoke {
  Assert-Node
  $script = Join-Path $Tools 'harness-smoke.mjs'
  if (-not (Test-Path $script)) { throw "harness-smoke.mjs not found at $script" }
  $nodeArgs = @($script, '--harness', $Harness, '--log', (Join-Path $RepoRoot 'results/gateway.jsonl'))
  if ($Call) { $nodeArgs += '--run' }
  & node @nodeArgs
  exit $LASTEXITCODE
}

# ---------------------------------------------------------------- setup-opencode
# Install the verified gateway provider config for OpenCode, with a backup.
function Invoke-SetupOpencode {
  $src = Join-Path $RepoRoot 'conditions/opencode-gateway.jsonc'
  if (-not (Test-Path $src)) { throw "template not found at $src" }
  $dst = Join-Path $HOME '.config/opencode/opencode.jsonc'
  $dir = Split-Path $dst -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  if (Test-Path $dst) {
    $bak = "$dst.bak." + (Get-Date -Format 'yyyyMMdd-HHmmss')
    Copy-Item $dst $bak -Force
    Write-Ok "backed up existing config to $(Split-Path $bak -Leaf)"
  }
  Copy-Item $src $dst -Force
  Write-Ok "installed $dst"
  Write-Host '  It points OpenCode at http://127.0.0.1:8787/v1 with the synthetic key exp-opencode-r001.'
  Write-Host '  Verify with:  scripts/harness.ps1 smoke'
}

switch ($Command) {
  'smoke'         { Invoke-Smoke }
  'setup-opencode'{ Invoke-SetupOpencode }
  'preflight' { Invoke-Preflight }
  'check'    { Invoke-Check }
  'apply'    { Invoke-Apply }
  'rollback' { Invoke-Rollback }
  'audit'    { Assert-Node; & node (Join-Path $Tools 'dsh-audit.mjs') --all }
  'presets'  { Invoke-Presets }
}
