@echo off
setlocal

title ⚡ Aspen Brain Launcher
color 1F

echo.
echo  ===================================================
echo    ⚡ ASPEN BRAIN
echo    Electrical Estimating ^& Field OS
echo    Aspen Electrical Services
echo  ===================================================
echo.

REM ─── FIND INSTALL DIR ─────────────────────────────────────────
set INSTALL_DIR=%~dp0
set SERVER_PORT=8080

REM ─── CHECK PYTHON ─────────────────────────────────────────────
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Python is not installed or not on your PATH.
    echo  Please install Python from https://www.python.org/downloads/
    echo  Make sure to check "Add Python to PATH" during install.
    echo.
    pause
    exit /b 1
)

REM ─── CHECK FOR CONFLICTING PROCESS ────────────────────────────
netstat -ano 2>nul | find ":%SERVER_PORT% " | find "LISTENING" >nul
if %errorlevel% equ 0 (
    echo  Port %SERVER_PORT% is already in use.
    echo  Opening browser to existing server...
    timeout /t 1 /nobreak >nul
    start "" http://localhost:%SERVER_PORT%
    echo.
    echo  TIP: If the page does not load, stop any other server
    echo       using port %SERVER_PORT% and run this launcher again.
    echo.
    pause
    exit /b 0
)

REM ─── START SERVER ─────────────────────────────────────────────
echo  Starting server on http://localhost:%SERVER_PORT% ...
echo.
echo  Instructions:
echo    • Main website:  http://localhost:%SERVER_PORT%
echo    • Admin panel:   http://localhost:%SERVER_PORT%/admin.html
echo    • Admin password: aspen2026
echo    • Press Ctrl+C in the server window to stop
echo.

cd /d "%INSTALL_DIR%"
start "Aspen Brain Server" cmd /k "title Aspen Brain Server & color 1F & echo. & echo  ⚡ ASPEN BRAIN SERVER IS RUNNING & echo. & echo  Website:  http://localhost:%SERVER_PORT% & echo  Admin:    http://localhost:%SERVER_PORT%/admin.html & echo. & echo  Press Ctrl+C to stop the server. & echo. & python -m http.server %SERVER_PORT% --bind 127.0.0.1"

echo  Waiting for server to start...
timeout /t 2 /nobreak >nul

echo  Opening browser...
start "" http://localhost:%SERVER_PORT%

echo.
echo  ✅ Aspen Brain is running!
echo     Close the server window to shut down.
echo.
pause
endlocal
