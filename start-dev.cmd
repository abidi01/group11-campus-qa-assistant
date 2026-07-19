@echo off
setlocal

title Campus QA Assistant Launcher
cd /d "%~dp0"

echo ========================================
echo   Campus QA Assistant - Development
echo ========================================
echo.

where uv >nul 2>nul
if errorlevel 1 (
  echo [ERROR] uv was not found. Install uv and reopen this script.
  echo         https://docs.astral.sh/uv/getting-started/installation/
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found. Install Node.js and reopen this script.
  echo         https://nodejs.org/
  echo.
  pause
  exit /b 1
)

if not exist "%~dp0backend\.env" (
  echo [WARNING] backend\.env was not found.
  echo           Copy backend\.env.example to backend\.env and configure it if startup fails.
  echo.
)

if /i "%~1"=="--check" (
  echo Environment check passed.
  exit /b 0
)

echo [1/4] Starting backend at http://127.0.0.1:8000 ...
start "Campus QA - Backend" cmd /k "cd /d ""%~dp0backend"" && uv run uvicorn app.main:app --reload --port 8000"

echo [2/4] Waiting for the backend to become ready ...
powershell.exe -NoProfile -Command "$deadline = (Get-Date).AddSeconds(120); while ((Get-Date) -lt $deadline) { try { $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/api/health' -TimeoutSec 2; if ($response.StatusCode -eq 200) { exit 0 } } catch {}; Start-Sleep -Seconds 1 }; exit 1"
if errorlevel 1 (
  echo.
  echo [ERROR] The backend did not become ready within 120 seconds.
  echo         Check the Campus QA - Backend window for the detailed error.
  echo.
  pause
  exit /b 1
)

echo [3/4] Starting frontend at http://127.0.0.1:5173 ...
start "Campus QA - Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev -- --host 127.0.0.1 --port 5173 --strictPort"

echo [4/4] Waiting for the frontend and opening the application ...
powershell.exe -NoProfile -Command "$deadline = (Get-Date).AddSeconds(60); while ((Get-Date) -lt $deadline) { try { $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:5173' -TimeoutSec 2; if ($response.StatusCode -eq 200) { exit 0 } } catch {}; Start-Sleep -Seconds 1 }; exit 1"
if errorlevel 1 (
  echo.
  echo [ERROR] The frontend did not become ready within 60 seconds.
  echo         Check the Campus QA - Frontend window for the detailed error.
  echo.
  pause
  exit /b 1
)

start "" "http://127.0.0.1:5173"

echo.
echo Startup commands have been sent.
echo Keep the Backend and Frontend windows open while using the application.
echo You may now close this launcher window.
echo.
pause

endlocal
