<#
.SYNOPSIS
  Verify everything needed to start the experiment matrix. Run BEFORE spending money.

.DESCRIPTION
  Every failure this study has hit was discoverable in advance by a cheap check:
  a gateway forwarding a synthetic key, a stale attribution build, a harness that ran
  but never reached the gateway, a preset roster that did not resolve. This does all
  of those checks in one pass.

.EXAMPLE
  scripts/preflight-experiments.ps1
#>
[CmdletBinding()]
param([int[]]$Ports = @(8787, 8788, 8789))

$ErrorActionPreference = 'Continue'
# scripts/ is not the repository root. Task suites and tools/ are resolved from here.
$Repo = if ($PSScriptRoot) { Split-Path $PSScriptRoot -Parent } else { (Get-Location).Path }
Set-Location $Repo
$fail = 0
function Ok($t)   { Write-Host "  [ok]   $t" -ForegroundColor Green }
function Warn($t) { Write-Host "  [warn] $t" -ForegroundColor Yellow }
function Err($t)  { Write-Host "  [FAIL] $t" -ForegroundColor Red; $script:fail++ }
function Head($t) { Write-Host ''; Write-Host "== $t" -ForegroundColor Cyan }

Head '1. gateways'
foreach ($p in $Ports) {
  try {
    $s = Invoke-RestMethod -Uri "http://127.0.0.1:$p/__stats" -TimeoutSec 4
    $model = $s.enforced.model
    if ($s.upstreamKeyConfigured -eq $false) { Err "port $p enforces $model but has NO usable upstream key - every run would 503" }
    else { Ok "port $p  enforcing $model  key $($s.upstreamKeyMasked)" }
    # A build without these fields predates the attribution fix, which silently
    # misfiled 632 records under harness names nothing queried.
    if ($null -eq $s.upstreamKeyMasked) { Err "port $p is an OLD build (no upstreamKeyMasked) - restart it before running anything" }
    if ($s.enforced.max_tokens_ceiling -eq $null -and $model -notlike 'deepseek*') { Warn "port $p enforces $model with no max_tokens ceiling - providers with a lower limit will 400" }
  } catch { Warn "port $p not listening" }
}

Head '2. task suites'
foreach ($dir in @('tasks','tasks-hard','tasks-glm53')) {
  if (Test-Path $dir) {
    $n = (Get-ChildItem $dir -Directory -ErrorAction SilentlyContinue | Where-Object { Test-Path (Join-Path $_.FullName 'task.json') }).Count
    Ok "$dir  $n tasks"
  } else { Warn "$dir not present" }
}
Write-Host '  validating tasks/ ...'
$v = & node tools/validate-tasks.mjs --dir tasks 2>&1 | Select-Object -Last 3
$v | ForEach-Object { Write-Host "    $_" }
if ($v -match '0 valid') { Err 'task validation reported no valid tasks' }

Head '3. harnesses'
$h = & node tools/harness-smoke.mjs --list 2>&1
$h | Where-Object { $_ -match 'verified' } | ForEach-Object { Write-Host "    $($_.Trim())" }

Head '4. gateway self-test (offline, no key needed)'
$t = & node tools/test-gateway.mjs 2>&1 | Select-Object -Last 2
$t | ForEach-Object { Write-Host "    $_" }
if ($t -match 'FAIL') { Err 'gateway self-test failed' }

Head '5. arms'
$d = & node tools/run-experiment.mjs --dry-run --seeds 1 --only example-fix 2>&1
$d | Where-Object { $_ -match '^\s*(tasks|arms|runs)\s' } | ForEach-Object { Write-Host "    $($_.Trim())" }

Head '6. disk and state'
$free = [math]::Round((Get-PSDrive C).Free / 1GB, 1)
if ($free -lt 5) { Warn "only $free GB free on C:" } else { Ok "$free GB free" }
$gw = (Get-ChildItem results -Filter '*gateway*.jsonl' -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
Ok "gateway logs: $([math]::Round($gw/1MB,1)) MB"

Head 'verdict'
if ($fail -eq 0) { Write-Host '  [ok]   ready to run' -ForegroundColor Green }
else { Write-Host "  $fail blocking problem(s) - fix before spending anything" -ForegroundColor Red }
exit $fail
