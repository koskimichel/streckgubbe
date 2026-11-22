@echo off
rem Startar en lokal server på port 8766 och öppnar spelet.
cd /d "%~dp0"
where python >nul 2>nul
if %errorlevel%==0 (
  start "" "http://localhost:8766/index.html"
  python -m http.server 8766 --bind 127.0.0.1
) else (
  where npx >nul 2>nul
  if %errorlevel%==0 (
    start "" "http://localhost:8766/index.html"
    npx --yes serve@14.2.4 -l tcp://127.0.0.1:8766 .
  ) else (
    echo Varken Python eller Node hittades. Installera Python fran python.org och forsok igen.
    pause
  )
)
