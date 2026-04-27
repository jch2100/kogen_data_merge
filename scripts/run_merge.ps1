param(
    [string]$InputDir = "",
    [string]$OutputDir = "",
    [int]$Latest = 3,
    [switch]$TodayOnly
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$skillRoot = Split-Path -Parent $scriptDir

if ([string]::IsNullOrWhiteSpace($InputDir)) {
    $InputDir = Join-Path $skillRoot "samples"
}

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    $OutputDir = Join-Path $skillRoot "outputs"
}

$preferredNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$preferredModules = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules"

if (-not (Test-Path $preferredNode)) {
    throw "Codex bundled Node runtime was not found. Expected path: $preferredNode"
}

if (-not (Test-Path $preferredModules)) {
    throw "Codex bundled node_modules was not found. Expected path: $preferredModules"
}

$localModules = Join-Path $skillRoot "node_modules"
if (-not (Test-Path $localModules)) {
    New-Item -ItemType Junction -Path $localModules -Target $preferredModules | Out-Null
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$args = @(
    (Join-Path $scriptDir "merge_experiment_results.mjs"),
    "--input-dir=$InputDir",
    "--output-dir=$OutputDir",
    "--latest=$Latest"
)

if ($TodayOnly) {
    $args += "--today-only"
}

& $preferredNode @args
