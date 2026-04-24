<#
.SYNOPSIS
    EVM Forensics Pipeline Runner
    Runs simulation, forensics, and AI analysis in sequence.

.DESCRIPTION
    1. Stops any running Anvil instances.
    2. Runs the simulation (scripts/simulations/sim_runner.mjs).
    3. Runs the forensics tool (src/index.js).
    4. Runs the AI analyst (src/ai/ollama_analyst.js).
    
    Configuration is read from 'sim.config.js'.
#>

$ErrorActionPreference = "Stop"

Write-Host "══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  EVM Forensics Pipeline" -ForegroundColor Cyan
Write-Host "  Config: sim.config.js" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

# 1. Stop Anvil
Write-Host "`n[1/3] Stopping any existing Anvil instances..." -ForegroundColor Yellow
Stop-Process -Name "anvil" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# 2. Run Simulation
Write-Host "`n[2/3] Running Simulation..." -ForegroundColor Yellow
try {
    # Using 'node go.mjs' logic but manually to ensure visibility
    # Note: run.mjs already reads sim.config.js via sim_runner
    node scripts/simulations/sim_runner.mjs --scenario reentrancy
    if ($LASTEXITCODE -ne 0) { throw "Simulation failed with exit code $LASTEXITCODE" }
} catch {
    Write-Error "Simulation failed: $_"
    exit 1
}

# 3. Find Run Directory
$runsDir = Join-Path (Get-Location) "runs"
$latestRun = Get-ChildItem -Path $runsDir -Filter "run_*" | Sort-Object CreationTime -Descending | Select-Object -First 1
if (-not $latestRun) {
    Write-Error "No run directory found in $runsDir"
    exit 1
}
$runId = $latestRun.Name
Write-Host "`nUsing run: $runId" -ForegroundColor Green

# 4. Run Forensics
Write-Host "`n[3/3] Running Forensics..." -ForegroundColor Yellow
$rawRoot = "$($latestRun.FullName)\client\01_raw"
$outputDir = "$($latestRun.FullName)\forensic_bundle"

if (-not (Test-Path $rawRoot)) {
    Write-Error "Raw data not found at $rawRoot. Simulation may have failed to export data."
    exit 1
}

try {
    node src/index.js --mode raw_import --raw-root $rawRoot --output-dir $outputDir
    if ($LASTEXITCODE -ne 0) { throw "Forensics failed with exit code $LASTEXITCODE" }
} catch {
    Write-Error "Forensics failed: $_"
    exit 1
}

# 5. Run AI (Optional)
Write-Host "`n[Optional] Running AI Summary..." -ForegroundColor Yellow
try {
    node src/ai/ollama_analyst.js --bundle-dir $outputDir
    # Don't fail pipeline if AI fails (Ollama might be down)
} catch {
    Write-Warning "AI summary failed (Ollama not running?). Skipping."
}

Write-Host "`n══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  PIPELINE COMPLETE" -ForegroundColor Green
Write-Host "  Report: $outputDir\02_forensic_bundle\05_reports\forensic_report.md" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
