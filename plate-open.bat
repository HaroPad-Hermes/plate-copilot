@echo off
setlocal enabledelayedexpansion
set "PORT=3000"
set "URL=http://localhost:%PORT%/editor"
set "PROJECT_DIR=C:\Users\HaroPad_\Documents\plate-playground"

if "%~1"=="" (
    echo Usage: plate-open.bat "C:\path\to\file.md"
    pause
    goto :eof
)

REM Check if dev server is already running and ready
curl -s -o nul -w "%%{http_code}" "%URL%" 2>nul | findstr "200" >nul 2>&1
if %errorlevel% neq 0 (
    echo Plate Playground not running. Starting it...
    start "Plate Playground" /MIN cmd /c "cd /d %PROJECT_DIR% && bun dev"

    REM Wait for server to actually be ready (not just port bound)
    echo Waiting for server...
    set /a TRIES=0
    :wait
    timeout /t 2 >nul
    curl -s -o nul -w "%%{http_code}" "%URL%" 2>nul | findstr "200" >nul 2>&1
    if %errorlevel% neq 0 (
        set /a TRIES+=1
        if !TRIES! lss 30 goto wait
        echo Server failed to start after 60s.
        pause
        goto :eof
    )
)

REM URL-encode the file path using PowerShell
for /f "delims=" %%a in ('powershell -Command "[uri]::EscapeDataString('%~1')"') do set "ENCODED=%%a"

start "" "%URL%?file=%ENCODED%"
