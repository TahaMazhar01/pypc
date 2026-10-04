@echo off
REM ---------------------------------------------------------------------------
REM PYPC platform - one-command setup and start (Windows)
REM
REM   Double-click this file, or run setup.bat in a terminal.
REM   Use "setup.bat --dev" for the hot-reload development server.
REM
REM The seeded database (prisma\dev.db) ships inside this folder, so the site has
REM members, plans, programmes, events and certificates the moment it starts.
REM ---------------------------------------------------------------------------
setlocal
cd /d "%~dp0"

set MODE=start
if "%~1"=="--dev" set MODE=dev

echo.
echo === Checking Node.js ===
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install Node 20 or newer from https://nodejs.org and run this again.
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do set NODEV=%%v
echo Node %NODEV% detected

echo.
echo === Installing dependencies (needs internet for this step only) ===
call npm install --no-audit --no-fund
if errorlevel 1 goto failed

echo.
echo === Preparing the database ===
if exist "prisma\dev.db" (
  echo prisma\dev.db is already present - pushing any schema changes.
) else (
  echo prisma\dev.db was missing - creating a fresh database.
)
call npm run db:generate
if errorlevel 1 goto failed
call npm run db:push -- --skip-generate
if errorlevel 1 goto failed

echo.
echo === Seeding demo accounts and content (safe to repeat) ===
call npm run db:seed
if errorlevel 1 goto failed

if "%MODE%"=="dev" (
  echo.
  echo === Starting the development server - http://localhost:3000 ===
  call npm run dev
  goto end
)

echo.
echo === Building the production bundle ===
call npm run build
if errorlevel 1 goto failed

echo.
echo === Starting the site - http://localhost:3000 ===
echo Staff sign-in: admin@pypc.org.pk / Pypc@2026
echo Press Ctrl+C to stop.
call npm start
goto end

:failed
echo.
echo Something went wrong above. Fix the message shown, then run setup.bat again.
pause

:end
endlocal
