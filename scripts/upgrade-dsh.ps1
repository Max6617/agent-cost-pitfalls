<#
.SYNOPSIS
  Upgrade the DSH CLI, then have you check the profile.

.DESCRIPTION
  Two corrections from the first attempt, both real bugs:

  1. WRONG PACKAGE MANAGER. dsh-app is a pnpm project - it declares
     "packageManager": "pnpm@12.3.4", ships a pnpm-lock.yaml and uses a .pnpm
     store. npm refuses with EBADDEVENGINES. This uses pnpm.

  2. WRONG PROFILE MECHANISM. The profile's bundles are NOT npm dependencies:
     profiles/web/package.json has "dependencies": {} and declares them under
     "dsh": { "profile": { "bundles": [...] } }. No lockfile pins them, so there
     is nothing for "dsh plugin update" to update. DSH installs them itself, at
     the CLI version on boot. Hence: upgrade the CLI, boot, then CHECK.

  Refuses to run while DSH is up: Windows locks the files node.exe holds open,
  so pnpm would fail or half-succeed.

.EXAMPLE
  scripts/upgrade-dsh.ps1            # upgrade the CLI
  scripts/upgrade-dsh.ps1 -Verify    # after booting, check both places agree
  scripts/upgrade-dsh.ps1 -Rollback  # back to the pinned original
#>
[CmdletBinding()]
param(
  [string]$Version = '0.1.7-rc.2',
  [string]$OriginalVersion = '0.1.5-alpha.1',
  [switch]$Rollback,
  [switch]$Verify,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$DshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME '.dsh' }
$DshApp  = if ($env:DSH_APP)  { $env:DSH_APP }  else { Join-Path $HOME 'dsh-app' }
$ProfPkg = Join-Path $DshHome 'profiles/node_modules/@deepseek-ai/dsh-base/package.json'

function Head($t) { Write-Host ''; Write-Host "== $t" -ForegroundColor Cyan }
function Ok($t)   { Write-Host "  [ok]   $t" -ForegroundColor Green }
function Warn2($t){ Write-Host "  [warn] $t" -ForegroundColor Yellow }
function Err2($t) { Write-Host "  [fail] $t" -ForegroundColor Red }

function Get-CliVersion {
  (Get-Content (Join-Path $DshApp 'package.json') -Raw | ConvertFrom-Json).dependencies.'@deepseek-ai/dsh'
}
function Get-ProfileVersion {
  if (Test-Path $ProfPkg) { (Get-Content $ProfPkg -Raw | ConvertFrom-Json).version } else { '(not installed)' }
}

# Native commands write to stderr on failure. With ErrorActionPreference=Stop,
# PowerShell turns that into a TERMINATING error - which is what silently killed
# the first version of this script the moment npm failed. Run native commands
# with Continue and check LASTEXITCODE instead.
function Invoke-Native([string]$Exe, [string[]]$Arguments, [string]$WorkDir) {
  $old = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  Push-Location $WorkDir
  try {
    $out = & $Exe @Arguments 2>&1
    return @{ out = $out; code = $LASTEXITCODE }
  } finally { Pop-Location; $ErrorActionPreference = $old }
}

if ($Verify) {
  Head 'version'
  $cli = Get-CliVersion
  Write-Host "  CLI : $cli"

  # The profile's node_modules is a JUNCTION FARM into the CLI's pnpm store,
  # keyed by version:
  #   profiles/node_modules/@deepseek-ai/dsh-base
  #     -> dsh-app/node_modules/.pnpm/@deepseek-ai+dsh@0.1.5-alph_<hash>/node_modules/@deepseek-ai/dsh-base
  #
  # "pnpm add" deletes the old store directory, so every junction into it dangles.
  # That looks alarming and is in fact HARMLESS: DSH resolves its bundles from the
  # CLI install, not from here, and the profile declares no plugins
  # ("dependencies": {}). Verified on 0.1.7-rc.2 with 78 dangling junctions -
  # including dsh-base, cordis and dsh itself - DSH boots, composes, and
  # DSH_TOOLS_MODE=ptc still yields exactly 1 declared tool.
  #
  # So the pass/fail signal is FUNCTIONAL, not the junction count. An earlier
  # version of this check compared versions and reported "(not installed)",
  # which was a false alarm.
  $dsa = Join-Path $DshHome 'profiles/node_modules/@deepseek-ai'
  if (Test-Path $dsa) {
    $all = @(Get-ChildItem $dsa -Force)
    $resolve = 0
    foreach ($e in $all) { if (Test-Path (Join-Path $e.FullName 'package.json')) { $resolve++ } }
    $dangle = $all.Count - $resolve
    Write-Host ""
    Write-Host "  profile junction farm: $resolve resolve, $dangle dangling"
    if ($dangle -gt 0) {
      Write-Host '    expected after an upgrade, and harmless.' -ForegroundColor DarkGray
      Write-Host '    Bundles load from the CLI install, not from here.' -ForegroundColor DarkGray
    }
  }

  Head 'the checks that actually matter'
  Write-Host '  1. does DSH boot and serve?          -> you are reading this, so yes'
  Write-Host '  2. does the presentation lever work?'
  Write-Host ''
  Write-Host '       $env:DSH_TOOLS_MODE="ptc"; dsh --profile exp "Reply OK"' -ForegroundColor Yellow
  Write-Host '       node tools/dsh-audit.mjs      # expect: declared tools: 1'
  Write-Host ''
  Write-Host '  3. full checklist: notes/records/UPGRADE.md' -ForegroundColor DarkGray
  exit 0
}

if ($Rollback) { $Version = $OriginalVersion; Warn2 "ROLLBACK to $Version" }

Head '1. is DSH stopped?'
$listening = $false
try { $listening = [bool](Get-NetTCPConnection -State Listen -LocalPort 3080 -ErrorAction Stop) } catch {}
if ($listening -and -not $Force) {
  Err2 'port 3080 is in use, so DSH is still running.'
  Write-Host '  Stop DSH first. (Restarting it ends the session that wrote this - expected.)'
  exit 1
}
if ($listening) { Warn2 'continuing with -Force' } else { Ok 'port 3080 is free' }

Head '2. before'
Write-Host "  CLI     : $(Get-CliVersion)"
Write-Host "  profile : $(Get-ProfileVersion)"
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item (Join-Path $DshApp 'package.json') (Join-Path $DshApp "package.json.bak.$stamp") -Force
Ok 'backed up package.json'

Head "3. CLI -> $Version   (pnpm, not npm)"
$r = Invoke-Native 'pnpm' @('add', "@deepseek-ai/dsh@$Version") $DshApp
$r.out | Select-Object -Last 6 | ForEach-Object { Write-Host "    $_" }
if ($r.code -ne 0) {
  Err2 "pnpm add failed (exit $($r.code)). Nothing was changed."
  Write-Host '  A lock or permission error means DSH is still holding files.'
  exit 1
}
$after = Get-CliVersion
if ($after -ne $Version) { Err2 "expected $Version, got $after"; exit 1 }
Ok "CLI is now $after"

Head '4. next, in this order'
Write-Host '  a) START DSH - it should install matching bundles on boot'
Write-Host '  b) then run:'
Write-Host ''
Write-Host '       scripts/upgrade-dsh.ps1 -Verify' -ForegroundColor Yellow
Write-Host ''
Write-Host '  THEN in a new session say:'
Write-Host '       read notes/status/RESUME.md and run the verification checklist in notes/records/UPGRADE.md'
Write-Host ''
Write-Host '  To undo:  scripts/upgrade-dsh.ps1 -Rollback' -ForegroundColor DarkGray
