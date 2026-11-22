# Malm & Monster (Mines & Monsters)

Ett 2D-monsterspel i webbläsaren. En streckgubbe hackar malm, smider svärd vid ugnen, slåss mot monster i grottor och blir starkare. Fungerar med tangentbord och mus, och med pekskärm på plattor. Kan installeras som app (PWA) och spelas offline.

## Versioner
- **v2.3** (denna): svårighetsgrader, nya bossar med andra fas, tydligare djungel, månsten och lykta, synlig rustning, malm-hjälp.
- **v2.2**: taggen [`v2.2`](../../tree/v2.2), fem världar, boss var femte nivå, spindlar och spöken, fler monster, smedjan (svärd till nivå 15, rustning, hacka, lykta), ät-tips.
- **v2.1**: taggen [`v2.1`](../../tree/v2.1), ljud och musik, paus och inställningar, guide på nivå 1, tydligare pekknappar.
- **v2**: taggen [`v2`](../../tree/v2), ny grafik, ljus i grottor, träffkänsla, pekskärmsstyrning, nytt namn.
- **v1**: taggen [`v1`](../../tree/v1), första versionen under namnet Streckgubbe.

## Starta lokalt
Dubbelklicka `starta-spelet.bat`. Spelet öppnas på http://localhost:8766/index.html. Låt det svarta fönstret vara öppet medan du spelar. Mer i `LASMIG.md`.

## Publicera
Ladda upp filerna `index.html`, `spel.js`, `config.js`, `sw.js`, `manifest.webmanifest`, `icon.svg`, `icon-192.png`, `icon-512.png` och `ljud.js` till en webbplats med https.

## Molnmiljö
Använd `verktyg/moln-setup.sh` som Setup script i molnmiljöns inställningar. Filen har Unix-radslut (LF).

## Licenser
Skillen i `.claude/skills/game-feel/` är Apache-2.0, se `KALLA.md` och `LICENSE` i den mappen.
