@echo off
echo Starting CashBook Local Server...
echo.
echo Server will be available at:
echo   http://localhost:3000
echo   http://127.0.0.1:3000
echo.
echo Opening browser...
start http://localhost:3000
python -m http.server 3000
pause
