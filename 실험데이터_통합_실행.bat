@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

powershell.exe -ExecutionPolicy Bypass -File "%SCRIPT_DIR%run_latest_experiment_merge.ps1"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if "%EXIT_CODE%"=="0" goto success

echo Merge failed.
echo Check the 3 input files in the samples folder.
echo Check whether Node.js is installed.
goto done

:success
echo Merge completed.
echo Check the outputs folder for the result file.

:done
echo.
pause
exit /b %EXIT_CODE%
