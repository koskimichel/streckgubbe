# Malm & Monster (Mines & Monsters), version 2.4

v2.4 (mobil):
- `WW`/`WH` = världens mått (960 x 576), `LW`/`LH` = vyns mått i logiska enheter. Dator/platta: vy = värld, kameran visar hela kartan (som förut). Mobil (`PHONE`, minsta skärmsida < 520 CSS-px): vyn fyller skärmen (`LH` = 430, `LW` efter bildformat), större HUD och knappar.
- Kamera: `ZW` (zoom, ca 42 CSS-px per ruta på mobil), `camX/camY` följer gubben mjukt (`updateCamera` i `realUpdate`), får gå 4 rutor utanför kanten på mobil så att gubben inte hamnar under knapparna. Världen ritas med `g.scale(ZW) + g.translate(-cam)` i `draw`.
- Världens cacher (`mapCv`, `caveCv`, `lightCv`, `canCv`) ritas med `RSW` (= RS * ZW). Världskoordinater: använd `WW/WH`, aldrig `LW/LH`. Omvandling: `toScreen`, `toWorld` (musen), `toBox` (menyer).
- Menyer (titel, paus, smedja, död, vrid-meddelande) ritas i en 960 x 576-ruta via `inBox960` (sätter tillfälligt `LW/LH` = 960/576). Deras träffytor tar `toBox(p)`. Pekknappar i vyns hörn placeras av `layoutButtons`.
- Liten karta i hörnet på mobil (`drawMinimap`, `miniCv`): portal, monster, boss, månsten/kristall/hjärta, gul ram för vad kameran ser.

v2.3:
- Svårighet `settings.diff` (latt/medel/svar, `C.difficulty`, `DF()`): monster- och bosshälsa/skada, tid mellan bossanfall, varningstid, malm kvar efter död, antal hjälpare. Väljs på titeln (`BTN_DIFF`, pilar vänster/höger) och i pausmenyn; gäller från nästa nivå.
- Bossar: `kind` per värld (`BOSS_KIND`: golem, ape, scorpion, yeti, demon), ritas i `drawBoss` (egen form, andas, poser vid varning, yr, röd glöd i andra fasen). Andra fas vid halv hälsa (`phase2`): snabbare, stenregn (`windRain`, fx `rock`), hjälpare. Egna förmågor: ape rusar i serie (`chain`), scorpion gräver ned sig (`burrow/under/emerge`, `hidden`), yeti fryser marken (fx `ice`, `P.icy` ger halka), demon lämnar eld (fx `fire`). Namnskylt `drawBossIntro` (`bossIntro`). Mark-fx ritas i `drawGroundFx`.
- Djungeln: `treeMul` 1.9, lövtak med ljusfläckar och lianer (`canCv`), ormbunkar. Grottmörker per värld `CAVE_DARK`.
- Malm-hjälp: `forgeGoal` (Nästa: ... i HUD, Bra att köpa nu i smedjan), `canBuyAny` (! över ugnen). Lykta gratis från nivå 6; uppgraderas med månsten (`P.moon`, föremål `moon`: boss, gömd i grotta var 3:e nivå, spöken 5 %). Lykta max 4.
- Rustning syns (`drawArmor`): bröstplåt, axelskydd, hjälm, blått stål med plym, guld. Brutaler har rund kropp.
- Test: `__sg.step(sek)` spolar fram spelet utan bildrutor (panelen kör få bildrutor när den är dold).
- Balans: max 10 hjärtan (`C.items.maxHearts`, fler ger full hälsa; äldre sparningar behåller sina och visas som mätare), hjärta var 5:e nivå, malm per nivå 8 + 0,6n (max 22), svärdspris med kvadratterm (`upgradeCostSquare`), dyrare rustning/hacka, styrka per kristall ger mindre skada.
- Blixtkraft: kristall ger laddning (`P.bolts`, max `C.boltPower.max`), `castStorm` (Q eller `BTN_BOLT` på plattan) skadar alla monster, ljusblixt `stormT` (svag ton om blinkningar är av).
- Varv: `lapOf(n)` (efter nivå 25). Varv 2 kvällston, 3+ natt (multiply-ton i världen), elitmonster (`m.elite`, `C.laps`), fler hjälpare till bossen. HUD: "Nivå N, varv X".
- Hjärtan i HUD: `drawHeart` (blanka med glans), två rader om fem, röd pulserande kant vid låg hälsa.

v2.2:
- E-tangent vid köttet i HUD (dator), ät-tips vid låg hälsa (`eatHintT`).
- Fem världar (`BIOMES`, `biomeOf(n)`, byter var 5:e nivå): Ängen, Djungeln, Öknen, Snölandet, Lavalandet. Styr markfärger, träd (`drawTree`), stenar, grottor, luftpartiklar (`spawnAir`, fx-typ `a`) och musikens tonart (`LJUD.setBiome`).
- Boss var 5:e nivå (`C.boss`, typ `boss`, `updateBoss`: walk > windCharge/windSlam > charge > stun, chockvåg fx-typ `w`, hjälp vid halv hälsa, `bossDefeated` släpper malm/hjärta/kristall). Varningar ritas i `drawBossExtras`, hälsostapel i HUD.
- Nya monster: spindel (`spiderAI`, nät i `shots`, saktar ned via `P.slow`), spöke (svävar genom väggar).
- Smedjan (`state = 'forge'`, `openForge`/`buy`/`overlayForge`): svärd (max 15), rustning (`P.armor`, `hurtPlayer` minskar skada), hacka (`P.pick`), lykta (`P.lamp`). Sparas i sparfilen.
- Fler monster per nivå (config `level`). All skada på spelaren går via `hurtPlayer`. Tidigare: `../Streckgubbe v2.1` (tagg `v2.1`).

2D-monsterspel sett uppifrån. Ren HTML5-canvas och vanilla JavaScript. Inga beroenden, inget byggsteg, ingen server-backend. Svara och skriv kommentarer på svenska.

## Version 2: mål och regler
- Mål: snyggare grafik och bättre spelkänsla (ljus/skugga i grottor, variation i rutor, animerade monster, glöd, snyggare HUD, träffeffekter). Spelregler och balans ändras inte i onödan.
- Versionsregel: varje ny version är en egen mapp `Streckgubbe vN` (N = förra + 1, delversioner som `v2.1` får också egen mapp). Ändra eller radera aldrig äldre versionsmappar (v1 = `../streckgubbe`, v2 = `../Streckgubbe v2`). Git: samma repo, varje version taggas (`v1`, `v2`, ...).
- v2 körs på port **8766** och har cachenamn `streckgubbe2-*` så att den inte delar sparfil eller offline-cache med v1 (port 8765).
- Skill `game-feel` (`.claude/skills/game-feel/`): kopierad för hand från gamedev-skills/awesome-gamedev-agent-skills, commit `00a9045`, granskad 2026-11-22. Bara text. Kodexemplen är Godot/Unity: översätt till canvas (skaka kameran via `g.translate`, aldrig spelarens position; hit-stop och skak-avklingning mäts i verklig tid).
- Använd frontend-design-skillen för färgpalett och HUD. Grafiken ritas med kod, inga bildfiler eller externa resurser.

## Filer
- `config.js`: alla balansvärden (`CONFIG`). Ändra balans här, inte i `spel.js`.
- `ljud.js` (v2.1): `LJUD` med `init` (vid första tangent/tryck), `play(namn)`, `setVolumes`, `setCave`, `duck`, `suspend`/`resume`. Allt syntetiseras med Web Audio, inga ljudfiler. Musik: 96 bpm, C-Am-F-G, fast melodi (AABA), dovare i grottor.
- v2.1 i `spel.js`: `settings` (sparas i localStorage `mm-installningar`, styr `FXC` och volymer via `applySettings`), paus (`state = 'paused'`, `pauseGame`/`resumeGame`, `overlayPause`, rader i `PROWS`), auto-paus vid blur/visibilitychange, guide på nivå 1 (`guideNow`, pil + text, stängs av när nivå 2 nås). Text att läsa använder `TXT` (rak fet stil); `HAND` bara för stora rubriker. Pekknappar har ritade ikoner (`iconSwordBig`, `iconHammer`, `iconMeat`).
- `spel.js` (~1020 rader, en IIFE) i sektioner, i denna ordning. Spellogiken (generering, rörelse, strid) är samma som v1; v2 ändrade nästan bara ritningen:
  - hjälpmedel: `mulberry` (seedad slump), `dist`, `clamp`, `easeOutBack`, `hash(x,y,k)` (stabil slump per ruta för utseende), `shade`, `rr` (rundad rektangel)
  - spelstate: `newPlayer`, `damage`, `reach`, `upgradeCost`, `addTrauma`/`freeze`/`floatText` (träffkänsla), `save`/`load` (localStorage-nyckel `streckgubbe-save-v1`)
  - nivågenerering: `reachable` (malm = hinder), `openFrom` (malm = öppen), `carvePath`, `buildLevel(n, attempt)`. Seed per nivå är fast. Sätter `mapDirty`.
  - rörelse, handlingar (`attack`, `useE`), effekter (`sparks`, `bolt`, `drawBolt`), `update(dt)` (spel-tid), `realUpdate(dt)` (verklig tid: skak, toning, texter), `die`
  - rendering: `resize` (canvas skalas till fönstret, `RS` = renderingsskala, all ritning i logiska 960×576 via `setTransform`), `renderMapCache` (kartan ritas en gång per nivå till `mapCv`, grottmörker till `caveCv`; sätt `mapDirty = true` när en ruta ändras), `drawDynamicTiles` (eld, portal, glitter), `drawLighting` (mörker med ljushål via `destination-out`), figurer, `drawHud` (kritlappar via `tag`), `overlayTitle`/`overlayDead`, `draw`
  - indata (mellanslag och musklick slår direkt vid tryck), huvudloop (hit-stop pausar `update` men inte `realUpdate`/`draw`)
- Stil: "krita på sommaräng". Palett i `PAL`; blixtgult (`#ffe14d`) är enda starka accenten. Stora rubriker med `HAND` (Segoe Print, ingen skrivstilsreserv), all annan text med `TXT` (Trebuchet MS/Roboto fet). Inga versaler-rubriker.
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
- **Testa aldrig på användarens spelport (8766) eller på koski.nu.** Sparning och inställningar ligger i webbläsarens localStorage per adress, så tester där kan skriva över användarens framsteg. Använd en egen testport, **8777** (`python -m http.server 8777 --bind 127.0.0.1`), som bara används för tester. Där får localStorage rensas fritt. Stoppa testservern efteråt.
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
- Publicering: webbhotell (one.com) med https. Mappen `publicera/` (ignoreras av git) innehåller exakt det som ska upp: `index.html`, `spel.js`, `config.js`, `sw.js`, `manifest.webmanifest`, `icon.svg`, `icon-192.png`, `icon-512.png`, `ljud.js`. Aldrig `CLAUDE.md`, `.claude/`, `.git/`, `verktyg/` eller `.bat`. Bygg om mappen efter varje ändring och höj `VERSION` i `sw.js`.
