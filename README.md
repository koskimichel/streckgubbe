# Malm & Monster (Mines & Monsters)

Ett 2D-monsterspel i webbläsaren. En streckgubbe hackar malm, smider svärd vid ugnen, slåss mot monster i grottor och blir starkare. Fungerar med tangentbord och mus, och med pekskärm på plattor. Kan installeras som app (PWA) och spelas offline.

## Versioner
- **v2** (denna): ny grafik, ljus i grottor, träffkänsla, pekskärmsstyrning, nytt namn.
- **v1**: taggen [`v1`](../../tree/v1), första versionen under namnet Streckgubbe.

## Starta lokalt
Dubbelklicka `starta-spelet.bat`. Spelet öppnas på http://localhost:8766/index.html. Låt det svarta fönstret vara öppet medan du spelar. Mer i `LASMIG.md`.

## Publicera
Ladda upp filerna `index.html`, `spel.js`, `config.js`, `sw.js`, `manifest.webmanifest`, `icon.svg`, `icon-192.png` och `icon-512.png` till en webbplats med https.

## Molnmiljö
Använd `verktyg/moln-setup.sh` som Setup script i molnmiljöns inställningar. Filen har Unix-radslut (LF).

## Licenser
Skillen i `.claude/skills/game-feel/` är Apache-2.0, se `KALLA.md` och `LICENSE` i den mappen.
