@echo off
echo Starting Aspen Brain Server...
echo.
python -m http.server 8080 --bind 192.168.1.100
echo.
echo Server running at http://192.168.1.100:8080
pause
