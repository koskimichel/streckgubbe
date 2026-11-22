#!/bin/bash
# Molnmiljö för Streckgubbe. Körs som root på Ubuntu 24.04 innan Claude startar.
# Klistra in i fältet "Setup script" i molnmiljöns inställningar.
# Spelet har inga beroenden; detta lägger bara till ett testverktyg.
set -euo pipefail
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1   # variabler är inte satta medan skriptet körs

# Låst version, hämtas bara från npm-registret
npm install -g --no-audit --no-fund playwright-core@1.48.2 \
  || echo "playwright-core kunde inte installeras, fortsätter utan"

python3 --version
node --version
/usr/bin/google-chrome --version || true
