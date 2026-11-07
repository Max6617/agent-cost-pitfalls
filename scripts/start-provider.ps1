<#
.SYNOPSIS
  Start a measurement gateway for one provider, reading the key from the local key file.

.DESCRIPTION
  The key is read inside this script so it NEVER appears on a command line, in a
  process listing, or in a background job's label. Passing it as --api-key would put
  it in all three.

.EXAMPLE
  scripts/start-provider.ps1 -Provider anthropic
  scripts/start-provider.ps1 -Provider zai -Port 8788
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)][ValidateSet('anthropic','zai','qwen','openai','deepseek')][string]$Provider,
  [int]$Port,
  [string]$Model,
  [int]$Ceiling,
  [string]$Log,
  # ---- the Anthropic cache conditions. See notes/plans/PLANNED-cache-ab.md and the note at the
  # injection site in tools/measure-gateway.mjs. Default (neither switch) = the static
  # system+last-tool breakpoints, which is the condition EVERY existing Anthropic number
  # in this repo was collected under.
  [switch]$NoCacheBreakpoints,   # send no cache_control at all - the harness's own behaviour
  [switch]$AutoCache,            # also send the top-level field that carries it forward
  # REASONING EFFORT IS A TREATMENT VARIABLE, and this script could not set it.
  # Batch 1 forced effort=high on DeepSeek and on GLM (14,751 and 3,363 requests), and the gateway
  # records that as a deviation - so it is recoverable from the log, but only after the fact. A
  # matrix launched through this script without the flag runs at whatever the model defaults to,
  # and the launcher says nothing about it. That is how a treatment quietly stops being held
  # constant. Pass -Effort high to match batch 1, or -Effort none to send the field explicitly.
  [string]$Effort
)

$ErrorActionPreference = 'Stop'
# scripts/ is not the repository root. tools/keys.mjs and tools/measure-gateway.mjs are resolved from here.
$Repo = if ($PSScriptRoot) { Split-Path $PSScriptRoot -Parent } else { (Get-Location).Path }
Set-Location $Repo

# Provider table. Upstreams and models are the ones actually verified for this study.
$cfg = @{
  anthropic = @{ port = 8789; upstream = 'https://api.anthropic.com';                      model = 'claude-haiku-4.5';  ceiling = 32768; log = 'results/anthropic-gateway.jsonl' }
  zai       = @{ port = 8788; upstream = 'https://api.z.ai/api/anthropic';                model = 'glm-5.3';           ceiling = 32768; log = 'results/glm53-gateway.jsonl' }
  qwen      = @{ port = 8790; upstream = 'https://dashscope-intl.aliyuncs.com/apps/anthropic'; model = 'qwen3.8-flash'; ceiling = 32768; log = 'results/qwen-gateway.jsonl' }
  openai    = @{ port = 8791; upstream = 'https://api.openai.com';                        model = 'gpt-6-luna';        ceiling = 32768; log = 'results/openai-gateway.jsonl' }
  deepseek  = @{ port = 8787; upstream = 'https://api.deepseek.com';                      model = 'deepseek-flash';    ceiling = $null; log = 'results/gateway.jsonl' }
}[$Provider]

if ($Port)    { $cfg.port = $Port }
if ($Model)   { $cfg.model = $Model }
if ($Ceiling) { $cfg.ceiling = $Ceiling }
# A per-condition log file, so a condition's requests cannot be confused with another's.
if ($Log)     { $cfg.log = $Log }

# Read the key here, never from the caller.
$keyJson = node -e "import('./tools/keys.mjs').then(m=>{const k=m.loadKeys();process.stdout.write(k['$Provider']||'')})"
if (-not $keyJson) { Write-Error "no usable key for '$Provider' in .keys.json or FILL-IN-KEYS.json"; exit 1 }
$env:DEEPSEEK_API_KEY = $keyJson      # the gateway reads this env var for the upstream key

# NOTE ON ORDER: $gwArgs is built first and everything appends to it. The first version
# of this script appended --workspace-id to $args BEFORE $args was assigned, so the
# assignment silently overwrote it and the flag never reached the gateway. The launcher
# printed "workspace id: supplied" while the gateway never received it - a message that
# described the intent rather than the effect.
$gwArgs = @('tools/measure-gateway.mjs', '--port', $cfg.port, '--upstream', $cfg.upstream,
          '--log', $cfg.log, '--force-model', $cfg.model)
if ($cfg.ceiling) { $gwArgs += @('--max-tokens-ceiling', $cfg.ceiling) }
if ($Effort) { $gwArgs += @('--force-effort', $Effort) }
if ($NoCacheBreakpoints) { $gwArgs += '--no-cache-breakpoints' }
if ($AutoCache)          { $gwArgs += '--auto-cache' }

# An Anthropic key that is not scoped to a workspace needs this header, or every
# request answers 400 asking for it. Read from the same file; never printed.
if ($Provider -eq 'anthropic') {
  $ws = node -e "import('./tools/keys.mjs').then(m=>{const k=m.loadKeys();process.stdout.write(k['anthropic_workspace']||'')})"
  if ($ws) { $gwArgs += @('--workspace-id', $ws) }
  else { Write-Host "  WARNING: no workspace id - requests will 400 if the key is unscoped" -ForegroundColor Yellow }
}
# Where the Messages API actually lives differs per provider, and getting it wrong
# produces a 404 that looks like the protocol mismatch which broke DSH 0.1.7:
#   DeepSeek  root + /anthropic       -> https://api.deepseek.com/anthropic/v1/messages
#   Z.AI      the path IS /anthropic  -> https://api.z.ai/api/anthropic/v1/messages
#   Anthropic NO segment at all       -> https://api.anthropic.com/v1/messages
# The gateway handles the first two by default; a root-level Messages API needs the flag.
if ($Provider -eq 'anthropic') { $gwArgs += '--native-messages' }
if ($Provider -eq 'zai') { $gwArgs += @('--upstream-openai', 'https://api.z.ai/api/coding/paas/v4') }
if ($Provider -eq 'qwen') {
  $gwArgs += '--native-messages'
  $gwArgs += @('--upstream-openai', 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1')
}
if ($Provider -eq 'openai') { $gwArgs += @('--upstream-openai', 'https://api.openai.com/v1') }

$cacheMode = if ($NoCacheBreakpoints) { 'NONE (harness behaviour)' } elseif ($AutoCache) { 'STATIC + AUTOMATIC top-level' } else { 'STATIC breakpoints (the study default)' }
Write-Host ""
Write-Host "  starting $Provider gateway on port $($cfg.port), enforcing $($cfg.model)" -ForegroundColor Cyan
Write-Host "  cache condition: $cacheMode" -ForegroundColor Cyan
Write-Host "  log: $($cfg.log)" -ForegroundColor Cyan
Write-Host ""
& node @gwArgs
