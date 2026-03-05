@echo off
echo Starting mIRC LLM Simulator servers...
echo.

REM Start HTTP server on port 1337
echo [1/2] Starting HTTP server on port 1337...
start "mIRC HTTP Server" cmd /k "python -m http.server 1337"
timeout /t 2 /nobreak >nul

REM Start CORS proxy on port 5000
echo [2/2] Starting CORS proxy on port 5000...
start "mIRC CORS Proxy" cmd /k "python cors_proxy.py"
timeout /t 2 /nobreak >nul

echo.
echo ===================================
echo Both servers started!
echo ===================================
echo.
echo App:         http://localhost:1337
echo CORS Proxy:  http://localhost:5000
echo.
echo Press any key to open the app in your browser...
pause >nul

REM Open browser
start http://localhost:1337

echo.
echo NOTE: Keep the server windows open while using the app.
echo Close them when you're done.
