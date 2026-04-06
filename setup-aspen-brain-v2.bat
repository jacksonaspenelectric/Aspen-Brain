@echo off
setlocal

REM Set the folder name
set FOLDER_NAME=Aspen-Brain
set DOCUMENTS_FOLDER=%USERPROFILE%\Documents\%FOLDER_NAME%

REM Step 1: Delete old Aspen-Brain folder if it exists
if exist "%DOCUMENTS_FOLDER%" (
    echo Deleting old %FOLDER_NAME% folder...
    rmdir /s /q "%DOCUMENTS_FOLDER%"
)

REM Step 2: Download latest from GitHub
echo Downloading the latest version of %FOLDER_NAME%...
set REPO_URL=https://github.com/jacksonaspenelectric/Aspen-Brain/archive/refs/heads/main.zip
set TEMP_ZIP=%TEMP%\aspen-brain-latest.zip
powershell -Command "Invoke-WebRequest -Uri %REPO_URL% -OutFile %TEMP_ZIP%"

REM Step 3: Extract to Documents
echo Extracting files...
powershell -Command "Expand-Archive -Path %TEMP_ZIP% -DestinationPath %USERPROFILE%\Documents"
DEL %TEMP_ZIP%

REM Step 4: Start the server on localhost:8080
cd "%DOCUMENTS_FOLDER%"
start cmd /k "python -m http.server 8080"

REM Step 5: Auto-open browser to admin.html
timeout /t 5
start http://localhost:8080/admin.html

echo Setup complete! Press any key to exit...
pause