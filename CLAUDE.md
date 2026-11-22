# Streckgubbe

2D-monsterspel sett uppifrån. Ren HTML5-canvas och vanilla JavaScript. Inga beroenden, inget byggsteg, ingen server-backend. Svara och skriv kommentarer på svenska.

## Filer
- `config.js`: alla balansvärden (`CONFIG`). Ändra balans här, inte i `spel.js`.
- `spel.js` (~520 rader, en IIFE) i sektioner, i denna ordning:
  - hjälpmedel: `mulberry` (seedad slump), `dist`, `clamp`
  - spelstate: `newPlayer`, `damage`, `reach`, `upgradeCost`, `save`/`load` (localStorage-nyckel `streckgubbe-save-v1`)
  - nivågenerering: `reachable` (malm = hinder), `openFrom` (malm = öppen), `carvePath`, `buildLevel(n, attempt)`. Seed per nivå är fast.
  - rörelse: `blockedAt`, `move`
  - handlingar: `attack` (slå + hacka malm), `useE` (smida/äta)
  - effekter, `update(dt)`, `die`, ritning (`drawMap`, `drawPlayer`, `drawMonsters`, `drawItems`, `drawHud`, `overlay`), indata, huvudloop
- `sw.js`: offline-cache (network-first, bara egen origin och `r.ok`). **Höj `VERSION` när någon spelfil ändras.**
- `index.html`, `manifest.webmanifest`, `icon.svg`: PWA-skal.
- `starta-spelet.bat`: lokal server på `127.0.0.1:8765` (Python, annars låst `serve@14.2.4`).
- `verktyg/moln-setup.sh`: setup-skript för Claude Code-molnmiljön (LF-radslut, se `.gitattributes`).

Rutor: `GRASS 0, STONE 1, TREE 2, CAVE 3, ORE 4, SMELT 5, EXIT 6`. Karta 30×18 rutor à 32 px. Start (2,2), smältstation (4,2), portal (27,15).

## Invarianter
- Allt som placeras (monster, föremål, portal) måste gå att nå från start (`openFrom`). Annars låser sig nivån eftersom portalen kräver att alla monster dör.
- Dela aldrig med ett avstånd som kan bli 0.
- Inga externa beroenden eller CDN-anrop utan att fråga användaren.

## Testa billigt
Starta `python -m http.server <port> --bind 127.0.0.1` i mappen och öppna sidan i webbläsarpanelen. Använd `window.__sg` i stället för skärmdumpar:
`P`, `state` ('title'|'play'|'dead'), `level`, `mons`, `items`, `map`, `build(n)` (bygger nivå n utan att starta den).
Kontrollera nåbarhet för många nivåer med en loop över `build(n)`. Stoppa servern efteråt. Den inbyggda webbläsaren blockerar service workers; felet "unknown error when fetching the script" därifrån är väntat.

## Arbetssätt
- Kostnadseffektivt: små ändringar görs direkt. Delegera bara stora, avgränsade uppgifter, och till billigast lämpliga modell.
- Säkerhet: inga dolda filer, hooks eller skript som körs automatiskt. Granska skills och kod från GitHub innan installation. Fråga innan nya filer sparas.
