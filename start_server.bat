@echo off

echo Starting python server...

REM Start Python HTTP server in background
start cmd /k "python -m http.server"

REM Wait for a couple of seconds to allow server to start
timeout /t 10 > nul

echo Python server started...

REM Open index.html in the default browser
start http://localhost:8000/index.html