# Malm & Monster (Mines & Monsters), version 2

2D-monsterspel sett uppifrån. Ren HTML5-canvas och vanilla JavaScript. Inga beroenden, inget byggsteg, ingen server-backend. Svara och skriv kommentarer på svenska.

## Version 2: mål och regler
- Mål: snyggare grafik och bättre spelkänsla (ljus/skugga i grottor, variation i rutor, animerade monster, glöd, snyggare HUD, träffeffekter). Spelregler och balans ändras inte i onödan.
- Versionsregel: varje ny version är en egen mapp `Streckgubbe vN` (N = förra + 1). Ändra eller radera aldrig äldre versionsmappar (v1 = `../streckgubbe`).
- v2 körs på port **8766** och har cachenamn `streckgubbe2-*` så att den inte delar sparfil eller offline-cache med v1 (port 8765).
- Skill `game-feel` (`.claude/skills/game-feel/`): kopierad för hand från gamedev-skills/awesome-gamedev-agent-skills, commit `00a9045`, granskad 2026-11-22. Bara text. Kodexemplen är Godot/Unity: översätt till canvas (skaka kameran via `g.translate`, aldrig spelarens position; hit-stop och skak-avklingning mäts i verklig tid).
- Använd frontend-design-skillen för färgpalett och HUD. Grafiken ritas med kod, inga bildfiler eller externa resurser.

## Filer
- `config.js`: alla balansvärden (`CONFIG`). Ändra balans här, inte i `spel.js`.
- `spel.js` (~1020 rader, en IIFE) i sektioner, i denna ordning. Spellogiken (generering, rörelse, strid) är samma som v1; v2 ändrade nästan bara ritningen:
  - hjälpmedel: `mulberry` (seedad slump), `dist`, `clamp`, `easeOutBack`, `hash(x,y,k)` (stabil slump per ruta för utseende), `shade`, `rr` (rundad rektangel)
  - spelstate: `newPlayer`, `damage`, `reach`, `upgradeCost`, `addTrauma`/`freeze`/`floatText` (träffkänsla), `save`/`load` (localStorage-nyckel `streckgubbe-save-v1`)
  - nivågenerering: `reachable` (malm = hinder), `openFrom` (malm = öppen), `carvePath`, `buildLevel(n, attempt)`. Seed per nivå är fast. Sätter `mapDirty`.
  - rörelse, handlingar (`attack`, `useE`), effekter (`sparks`, `bolt`, `drawBolt`), `update(dt)` (spel-tid), `realUpdate(dt)` (verklig tid: skak, toning, texter), `die`
  - rendering: `resize` (canvas skalas till fönstret, `RS` = renderingsskala, all ritning i logiska 960×576 via `setTransform`), `renderMapCache` (kartan ritas en gång per nivå till `mapCv`, grottmörker till `caveCv`; sätt `mapDirty = true` när en ruta ändras), `drawDynamicTiles` (eld, portal, glitter), `drawLighting` (mörker med ljushål via `destination-out`), figurer, `drawHud` (kritlappar via `tag`), `overlayTitle`/`overlayDead`, `draw`
  - indata (mellanslag och musklick slår direkt vid tryck), huvudloop (hit-stop pausar `update` men inte `realUpdate`/`draw`)
- Stil: "krita på sommaräng". Palett i `PAL`; blixtgult (`#ffe14d`) är enda starka accenten. Texter i spelet med `HAND` (Segoe Print), övrigt `UI` (Segoe UI). Inga versaler-rubriker.
- `config.js`: `effects` (shake, hitStop, flash, damageNumbers) styr träffkänslan och tillgänglighet.
- `sw.js`: offline-cache (network-first, bara egen origin och `r.ok`). **Höj `VERSION` när någon spelfil ändras.**
- `index.html`, `manifest.webmanifest`, `icon.svg`: PWA-skal.
- `starta-spelet.bat`: lokal server på `127.0.0.1:8766` (Python, annars låst `serve@14.2.4`).
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

## Pekskärm (Android-plattor)
- `touchMode` slås på av `(pointer: coarse)` eller första touch. Pointer-händelser med `pointerType !== 'mouse'` hanteras i indata-sektionen; musen har egen hantering och ignorerar låtsas-musklick inom 800 ms efter touch.
- Vänstra halvan: flytande joystick (`touch.jx/jy`, radie `JOY_R`, analog fart). Högra halvan: slå (med `aimNearest` när man står still). `BTN_E`: smid/ät. Titel: tryck = fortsätt, `BTN_NEW` = nytt spel. Död: tryck (spärr 700 ms).
- Stående läge visar "Vrid plattan". Manifestet: `display: fullscreen`, `orientation: landscape`.
- Testa: emulera bredd < 768 i webbläsarpanelen och skicka `PointerEvent` med `pointerType: 'touch'` till canvasen. Panelen pausar nästan bilduppdateringen när den är dold; mät rörelse över ~2 s.
- Publicering: webbhotell (one.com) med https. Mappen `publicera/` (ignoreras av git) innehåller exakt det som ska upp: `index.html`, `spel.js`, `config.js`, `sw.js`, `manifest.webmanifest`, `icon.svg`, `icon-192.png`, `icon-512.png`. Aldrig `CLAUDE.md`, `.claude/`, `.git/`, `verktyg/` eller `.bat`. Bygg om mappen efter varje ändring och höj `VERSION` i `sw.js`.
