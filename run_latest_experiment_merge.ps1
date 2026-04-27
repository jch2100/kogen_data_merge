$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

node .\merge_experiment_results.mjs --input-dir="$scriptDir\samples" --output-dir="$scriptDir\outputs" --latest=3

Write-Host ""
Write-Host "Latest 3 experiment files were merged."
