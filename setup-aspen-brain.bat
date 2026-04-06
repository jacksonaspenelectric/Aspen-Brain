@echo off
setlocal enabledelayedexpansion

title Aspen Brain – Setup
color 1F

echo.
echo  ===================================================
echo    ⚡ ASPEN BRAIN – FRESH SETUP
echo    Aspen Electrical Services
echo  ===================================================
echo.

REM ─── CONFIGURATION ─────────────────────────────────────────────
set FOLDER_NAME=Aspen-Brain
set INSTALL_DIR=%USERPROFILE%\Documents\%FOLDER_NAME%
set REPO_URL=https://github.com/jacksonaspenelectric/Aspen-Brain/archive/refs/heads/main.zip
set TEMP_ZIP=%TEMP%\aspen-brain-latest.zip
set DESKTOP=%USERPROFILE%\Desktop
set LAUNCHER=%INSTALL_DIR%\START-ASPEN-BRAIN.bat
set SHORTCUT=%DESKTOP%\START-ASPEN-BRAIN.lnk
set SERVER_PORT=8080

echo [1/6] Checking requirements...
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Python is not installed or not on your PATH.
    echo  Please install Python from https://www.python.org/downloads/
    echo  Make sure to check "Add Python to PATH" during install.
    echo.
    pause
    exit /b 1
)
echo   Python found. OK.
echo.

REM ─── STEP 2: REMOVE OLD INSTALL ────────────────────────────────
echo [2/6] Removing old installation (if any)...
if exist "%INSTALL_DIR%" (
    echo   Deleting old folder: %INSTALL_DIR%
    rmdir /s /q "%INSTALL_DIR%"
    if exist "%INSTALL_DIR%" (
        echo  ERROR: Could not remove old folder. Close any open files and try again.
        pause
        exit /b 1
    )
)
echo   Clean. OK.
echo.

REM ─── STEP 3: DOWNLOAD LATEST ───────────────────────────────────
echo [3/6] Downloading latest Aspen Brain from GitHub...
powershell -NoProfile -Command ^
    "try { Invoke-WebRequest -Uri '%REPO_URL%' -OutFile '%TEMP_ZIP%' -UseBasicParsing; Write-Host '  Download complete. OK.' } catch { Write-Host ('  ERROR: ' + $_.Exception.Message); exit 1 }"
if %errorlevel% neq 0 (
    echo.
    echo  Download failed. Check your internet connection and try again.
    pause
    exit /b 1
)
echo.

REM ─── STEP 4: EXTRACT ───────────────────────────────────────────
echo [4/6] Extracting files...
powershell -NoProfile -Command ^
    "try { Expand-Archive -Path '%TEMP_ZIP%' -DestinationPath '%USERPROFILE%\Documents' -Force; Write-Host '  Extraction complete. OK.' } catch { Write-Host ('  ERROR: ' + $_.Exception.Message); exit 1 }"
if %errorlevel% neq 0 (
    echo.
    echo  Extraction failed. Try running as Administrator.
    pause
    exit /b 1
)

REM The zip extracts as "Aspen-Brain-main", rename to "Aspen-Brain"
if exist "%USERPROFILE%\Documents\Aspen-Brain-main" (
    rename "%USERPROFILE%\Documents\Aspen-Brain-main" "%FOLDER_NAME%"
)
del /q "%TEMP_ZIP%" 2>nul
echo.

REM ─── STEP 5: CREATE DESKTOP SHORTCUT ───────────────────────────
echo [5/6] Creating desktop shortcut...
powershell -NoProfile -Command ^
    "$WS = New-Object -ComObject WScript.Shell; " ^
    "$SC = $WS.CreateShortcut('%SHORTCUT%'); " ^
    "$SC.TargetPath = '%LAUNCHER%'; " ^
    "$SC.WorkingDirectory = '%INSTALL_DIR%'; " ^
    "$SC.Description = 'Launch Aspen Brain – Electrical Estimating System'; " ^
    "$SC.WindowStyle = 1; " ^
    "$SC.Save(); " ^
    "Write-Host '  Desktop shortcut created. OK.'"

if exist "%SHORTCUT%" (
    echo   Shortcut placed at: %SHORTCUT%
) else (
    echo   NOTE: Shortcut creation may have failed. You can manually run:
    echo         %LAUNCHER%
)
echo.

REM ─── STEP 6: LAUNCH SERVER ─────────────────────────────────────
echo [6/6] Starting server on http://localhost:%SERVER_PORT% ...
cd /d "%INSTALL_DIR%"
start "Aspen Brain Server" cmd /k "title Aspen Brain Server & echo. & echo  ⚡ ASPEN BRAIN SERVER & echo  Running at http://localhost:%SERVER_PORT% & echo  Press Ctrl+C to stop. & echo. & python -m http.server %SERVER_PORT% --bind 127.0.0.1"
timeout /t 3 /nobreak >nul
start "" http://localhost:%SERVER_PORT%

echo.
echo  ===================================================
echo    ✅ SETUP COMPLETE!
echo  ===================================================
echo.
echo   Files installed to:  %INSTALL_DIR%
echo   Desktop shortcut:    %SHORTCUT%
echo   Website running at:  http://localhost:%SERVER_PORT%
echo   Admin panel:         http://localhost:%SERVER_PORT%/admin.html
echo   Admin password:      aspen2026
echo.
echo   TIP: Double-click "START-ASPEN-BRAIN" on your desktop
echo        anytime to relaunch the server.
echo.
pause
endlocal
