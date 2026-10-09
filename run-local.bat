@echo off
rem Nico Agustin portfolio: build the site and run it on this PC.
rem Double-click this file. The first time it installs what the site needs; every time it builds the site,
rem starts it and opens http://localhost:3002 in your browser (or the next free port, 3003 to 3010, when another
rem program already uses 3002; port 3000 belongs to another app on this PC). Close this window (or Ctrl+C) to stop.
rem A specific port:  run-local.bat 3005
rem (No labels or GOTO on purpose, so it also runs correctly if the file ever ends up with LF line endings.)

setlocal EnableExtensions
cd /d "%~dp0"
title Nico Agustin portfolio
set "PORT=%~1"

echo.
echo   Nico Agustin portfolio - local preview
echo   --------------------------------------
echo.

rem --- 1. Node.js -----------------------------------------------------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo   [X] Node.js is not installed.
  echo       Install the LTS version from https://nodejs.org and run this file again.
  echo.
  pause
  exit /b 1
)
for /f "usebackq delims=" %%v in (`node -p "process.versions.node"`) do set "NODE_VERSION=%%v"
for /f "tokens=1 delims=." %%m in ("%NODE_VERSION%") do set "NODE_MAJOR=%%m"
if %NODE_MAJOR% LSS 20 (
  echo   [X] Node.js %NODE_VERSION% is too old: the site needs Node.js 20.9 or newer.
  echo       Install the LTS version from https://nodejs.org and run this file again.
  echo.
  pause
  exit /b 1
)
echo   [ok] Node.js %NODE_VERSION%

rem --- 2. pnpm --------------------------------------------------------------------------
where pnpm >nul 2>nul
if errorlevel 1 (
  where corepack >nul 2>nul
  if not errorlevel 1 (
    echo   [..] pnpm was not found. Trying to turn it on with Corepack...
    call corepack enable >nul 2>nul
  )
)
where pnpm >nul 2>nul
if errorlevel 1 (
  echo   [X] pnpm is not installed.
  echo       Open PowerShell and run:  npm install -g pnpm@12.9.1
  echo       If that says "access denied", open PowerShell with "Run as administrator" and try again.
  echo       Then run this file again.
  echo.
  pause
  exit /b 1
)
for /f "usebackq delims=" %%v in (`pnpm --version`) do set "PNPM_VERSION=%%v"
echo   [ok] pnpm %PNPM_VERSION%

rem --- 3. Dependencies: install when node_modules is missing or older than pnpm-lock.yaml ----
set "DEPS=stale"
if exist "node_modules\.modules.yaml" (
  for /f "usebackq delims=" %%s in (`node -e "const fs = require('fs'); console.log(fs.statSync('pnpm-lock.yaml').mtimeMs <= fs.statSync('node_modules/.modules.yaml').mtimeMs ? 'fresh' : 'stale')"`) do set "DEPS=%%s"
)
if "%DEPS%"=="stale" (
  echo   [..] Installing dependencies. The first time this can take a few minutes...
  call pnpm install --frozen-lockfile
  if errorlevel 1 (
    echo.
    echo   [X] Installing the dependencies failed. The messages above say why.
    echo.
    pause
    exit /b 1
  )
) else (
  echo   [ok] Dependencies are up to date
)

rem --- 4. Contact form status (it needs CONTACT_WEBHOOK_URL and CONTACT_SECRET in .env.local) ---
for /f "usebackq delims=" %%s in (`node -e "let t = ''; try { t = require('fs').readFileSync('.env.local', 'utf8') } catch {} const has = (k) => new RegExp('^' + k + '=.', 'm').test(t); console.log(has('CONTACT_WEBHOOK_URL') && has('CONTACT_SECRET') ? 'on' : 'off')"`) do set "CONTACT=%%s"
if "%CONTACT%"=="on" (
  echo   [ok] Contact form: connected via .env.local - messages are really emailed to Nico
) else (
  echo   [--] Contact form: not connected yet, so the site shows "Email me instead".
  echo        To connect it, follow docs\CONTACT-SETUP.md.
)

rem --- 5. Build (CIRCLE_NODE_TOTAL=3 keeps Next.js to 3 build workers: this PC has little free memory) ---
echo   [..] Building the site...
echo.
set "CIRCLE_NODE_TOTAL=3"
call pnpm build
if errorlevel 1 (
  echo.
  echo   [X] The build failed. The messages above say why.
  echo.
  pause
  exit /b 1
)
echo.
echo   [ok] Built

rem --- 6. Port: the one given, else 3002, else the next free one up to 3010 --------------------
if "%~1"=="" (
  for /l %%p in (3002,1,3010) do (
    if not defined PORT (
      netstat -ano | findstr /r /c:":%%p .*LISTENING" >nul || set "PORT=%%p"
    )
  )
)
if "%PORT%"=="" (
  echo   [X] Ports 3002 to 3010 are all in use. Close a program, or choose a port:  run-local.bat 3100
  echo.
  pause
  exit /b 1
)
netstat -ano | findstr /r /c:":%PORT% .*LISTENING" >nul
if not errorlevel 1 (
  echo   [X] Port %PORT% is already in use by another program.
  echo       Close that program, or start the site on another port:  run-local.bat 3005
  echo.
  pause
  exit /b 1
)
if "%~1"=="" if not "%PORT%"=="3002" (
  echo   [i] Port 3002 is already used by another program, so the site starts on port %PORT% instead.
)
set "URL=http://localhost:%PORT%"

rem --- 7. Start, and open the browser once the site answers ---------------------------------
echo.
echo   Starting the site at %URL%
echo   It opens in your browser when it's ready. To stop it, close this window or press Ctrl+C.
echo.
start "" /b powershell -NoProfile -ExecutionPolicy Bypass -Command "$u = '%URL%'; for ($i = 0; $i -lt 120; $i++) { try { if ((Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200) { if ($env:RUN_LOCAL_NO_BROWSER) { Write-Host ('  [ok] ' + $u + ' answers 200') } else { Start-Process $u }; exit 0 } } catch {}; Start-Sleep -Milliseconds 500 }; Write-Host ('  [!] ' + $u + ' did not answer within 60 seconds. Look for errors above.')"
call pnpm exec next start -p %PORT%
if errorlevel 1 (
  echo.
  echo   [X] The site stopped with an error. The messages above say why.
) else (
  echo.
  echo   The site has stopped.
)
echo.
pause
