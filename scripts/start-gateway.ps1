<#
.SYNOPSIS
  Start the measurement gateway, reading the API key from the DSH credential store.

.DESCRIPTION
  The gateway sits between every harness and the provider. It is the measurement
  instrument for the whole study: per-request usage, the cache hit/miss split,
  model enforcement, and run attribution all live here. Nothing can be measured
  without it.

  The key is read from ~/.dsh/.credentials.yaml and is NEVER printed. Only a
  masked form appears in the banner, and the gateway never forwards a synthetic
  exp-* key upstream.

.EXAMPLE
  scripts/start-gateway.ps1
  scripts/start-gateway.ps1 -Port 8790
  scripts/start-gateway.ps1 -Model deepseek-pro
#>
[CmdletBinding()]
param(
  [int]$Port = 8787,
  [string]$Model = 'deepseek-flash',
  [string]$Effort = 'high',
  [string]$Log = 'results/gateway.jsonl',
  # The gateway injects cache_control breakpoints into any /messages request, and for the
  # Anthropic A/B that is the treatment. For DeepSeek and z.ai it is an invention: those
  # providers cache automatically, their batch-1 matrices were collected with NO injection
  # (their logs carry no cache_control deviation), and injecting now would change a treatment
  # while claiming to repeat an experiment.
  [switch]$NoCacheBreakpoints
)

$ErrorActionPreference = 'Stop'
# scripts/ is not the repository root. tools/measure-gateway.mjs is resolved after Push-Location.
$RepoRoot = Split-Path $PSScriptRoot -Parent
$DshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME '.dsh' }
$CredFile = Join-Path $DshHome '.credentials.yaml'

function Head($t) { Write-Host ''; Write-Host "== $t" -ForegroundColor Cyan }
function Ok($t)   { Write-Host "  [ok]   $t" -ForegroundColor Green }
function Warn2($t){ Write-Host "  [warn] $t" -ForegroundColor Yellow }
function Err2($t) { Write-Host "  [fail] $t" -ForegroundColor Red }

Head '1. is the port free?'
$busy = $false
try { $busy = [bool](Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop) } catch {}
if ($busy) {
  # Distinguish "already running, nothing to do" from "something else has the port".
  # The first version reported only that the port was busy, which reads as a failure
  # and sends you off to fix a gateway that was working fine.
  $alive = $null
  try { $alive = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/__stats" -TimeoutSec 4 } catch {}
  if ($alive -and $alive.enforced) {
    Ok "a gateway is ALREADY RUNNING on port $Port - nothing to do."
    Write-Host ''
    Write-Host ('  enforcing    : ' + $alive.enforced.model + '   effort ' + $alive.enforced.reasoning_effort)
    Write-Host ('  upstream key : ' + $alive.upstreamKeyMasked)
    Write-Host ('  key usable   : ' + $alive.upstreamKeyConfigured)
    if (-not $alive.upstreamKeyConfigured) {
      Warn2 'but it has NO usable upstream key - every run would 503. Restart it.'
    }
    Write-Host ''
    Write-Host '  To replace it with a fresh one:' -ForegroundColor DarkGray
    Write-Host ('    Get-NetTCPConnection -State Listen -LocalPort {0} | ForEach-Object {{ Stop-Process -Id $_.OwningProcess -Force }}' -f $Port) -ForegroundColor DarkGray
    Write-Host '    scripts/start-gateway.ps1' -ForegroundColor DarkGray
    exit 0
  }
  Err2 "port $Port is in use, but it is NOT answering as a gateway."
  Write-Host '  Something else holds the port. Find it with:'
  Write-Host "    Get-NetTCPConnection -State Listen -LocalPort $Port | Select-Object OwningProcess"
  Write-Host '  Or start on a different port:  scripts/start-gateway.ps1 -Port 8790'
  exit 1
}
Ok "port $Port is free"

Head '2. credential'
if (-not (Test-Path $CredFile)) { Err2 "no credential store at $CredFile"; exit 1 }
# Read the refs block. Masked output only - this file leaked a key into a chat
# transcript once because a masking regex assumed the field name started a line.
$key = $null
$inRefs = $false
foreach ($line in Get-Content $CredFile) {
  $indent = $line.Length - $line.TrimStart().Length
  $t = $line.Trim()
  if ($t -match '^refs:\s*$') { $inRefs = $true; continue }
  if ($inRefs -and $indent -eq 0 -and $t) { $inRefs = $false }
  if (-not $inRefs) { continue }
  if ($t -match '^DEEPSEEK_API_KEY:\s*(\S+)') { $key = $Matches[1] }
}
if (-not $key) { Err2 'DEEPSEEK_API_KEY not found under refs: in the credential store'; exit 1 }
if ($key -notmatch '^sk-') { Err2 ('the stored key does not look like a real key (starts with "' + $key.Substring(0, [Math]::Min(4, $key.Length)) + '")'); exit 1 }
Ok ('found ' + $key.Substring(0,3) + '...' + $key.Substring($key.Length - 4) + '  (' + $key.Length + ' chars)')

Head '3. starting'
Write-Host "  port    : $Port"
Write-Host "  model   : $Model (enforced for every harness under test)"
Write-Host "  effort  : $Effort"
Write-Host "  log     : $Log"
Write-Host ''
Write-Host '  Press Ctrl+C to stop.' -ForegroundColor DarkGray
Write-Host ''

$env:DEEPSEEK_API_KEY = $key
Push-Location $RepoRoot
try {
  $gwArgs = @('tools/measure-gateway.mjs', '--port', $Port, '--log', $Log, '--force-model', $Model, '--force-effort', $Effort)
if ($NoCacheBreakpoints) { $gwArgs += '--no-cache-breakpoints' }
& node @gwArgs
} finally {
  Pop-Location
}
