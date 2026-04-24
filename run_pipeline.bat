@echo off
echo Starting EVM Forensics Pipeline...
powershell -ExecutionPolicy Bypass -File run_pipeline.ps1
if %errorlevel% neq 0 (
    echo Pipeline failed with error code %errorlevel%
    pause
    exit /b %errorlevel%
)
echo Pipeline completed successfully.
pause
