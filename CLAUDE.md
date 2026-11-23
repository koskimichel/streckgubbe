# Malm & Monster (Mines & Monsters), version 3.5

v3.5:
- **Koden ligger i `src/` (12 delar i nummerordning, en sektion var). `spel.js` byggs av dem: `python -I verktyg/bygg.py`. Ändra alltid i `src/`, aldrig direkt i `spel.js`.** `--kolla` kontrollerar att `spel.js` stämmer med `src/`, `--publicera` bygger och kopierar spelets filer till `publicera/`. Delarna är bitar av samma IIFE och är inte giltig JS var för sig; patchskript ska rikta sig mot `src/`-filen där koden finns.
  `00-start` hjälpmedel, `01-spelstate` spelare och sparning, `02-nivaer` nivåer och natur, `03-skattkammare` (+ `continueGame`), `04-handlingar` rörelse, slag, effekter, `05-uppdatering` update och monster, `06-karta` skala, kartcache, ljus, `07-figurer`, `08-hud`, `09-titel` titel, sparplatser, pekknappar, `10-meny` paus, smedja, guide, `11-indata` tangenter, huvudloop, `__sg`.
- Kogret har steg 0-3 (`P.quiver`, recept `crafting.quiver[1..3]`, rad Större koger / Läderkoger / Stort koger i Verktyg). `maxArrows(q)` = `DF().quiverCap || C.bow.quiverCap`: 5/10/20/30, på Lätt 10/15/25/40. Sparningen har `quiverV: 2`; äldre sparningar med stort koger får steg 3. Pilar över taket behålls (taket hindrar bara nya).

v3.4:
- Tre sparplatser: localStorage `mm-plats-1..3` (`slotKey`, `slot`, `slots`, `loadSlot`, `refreshSlots`, `playSlot`). Gamla `streckgubbe-save-v1` flyttas till första lediga plats (`migrateOldSave`). Sparningen innehåller `diff`, och `continueGame` sätter svårigheten från platsen. `settings.slot` minns senaste plats.
- Titeln (`overlayTitle`, `titleHit`, `cardRect`, `cardBtns`): kort per plats med Spara fil (`exportSlot`, laddar ned `.mms` med {game, v, save}) och Radera (`askDelete`, tryck två gånger inom 3 s), tom plats har Hämta fil (`openImport`, dold `fileIn`, kontrollerar innehållet; på pekskärm öppnas den vid pointerup via `importPending`). Varje kort har en stor knapp (Fortsätt spela eller Starta nytt spel, `titleButton`) och en liten Fler val (`moreSlot`) med Spara en kopia, Radera spelet och Hämta en sparad kopia, var och en med förklarande text; på en tom plats väljer man svårighet i kortet (`newPick`, `diffSel`, `startNew`, `chooseSlot`). Tangenter: vänster/höger plats, Enter spela, Delete radera; i svårighetsvalet vänster/höger och Enter, Esc avbryter.
- Fix: `ensureOre` ger bara metaller som världen redan lämnat bakom sig (sorten <= lägsta sorten i världens `oreMix`), aldrig guld i Ängen när man har järnhacka.
- Pausmenyns andra knapp är Till titeln (`askNew` sparar och går till titeln).
- Lin ritas som en tuva med stora blå blommor och frökapslar; första gången nära lin förklaras det (`P.flaxSeen`).
- Byte från monster (`dropLoot`, `C.drops`): kött 15 %, annars metall (`lootMetal`, världens blandning) eller två pilar; spindlar tappar lin. Föremål `arrows` och `flax`.

v3.3:
- Nya rutor: `FLAX 8` (lin, går att gå på, ett slag ger `P.flax`), `WATER 9` (damm, fast hinder), `BACK 10` (portal tillbaka vid (1,1) från nivå 2). `placePond` (var 3:e nivå, n % 3 === 2, egen slump, kontrollerar nåbarhet och strand), `placeFlax` (egen slump), `pond.fish` fiskar kvar.
- Fiske: `P.rod`, E vid vatten (`waterNear`, `fishE`), `P.fish` = {phase wait/bite}, napp i `C.fishing.biteWindow` (längre på Lätt), fisk = +1 kött. Ritas i `drawRodLine`.
- Bytesdjur i `prey` (inte i `mons`, räknas inte till kvoten) på nivåer utan damm: kanin, ödla, hare, salamander efter värld (`PREY_KIND`). `updatePrey` (flyr, blir trött), `catchPrey` (svärd, pil; `shoot` siktar på djur om inget monster finns), `skinPrey` kräver `P.knife`, ger kött och ibland skinn (`P.hide`). Skinn används till `quiver` (stort koger, `maxArrows()`).
- E gör olika saker (`eMode`: forge, skin, fish, eat); pekknappen byter ikon. `drawEHint` visar en lapp på datorn.
- Portal tillbaka: `P.maxLevel` (högsta nivån), `exitOpen()` (kvot klar eller tidigare nivå), `startLevel(n, back)` sätter gubben vid utgången och `P.portalLock` tills man gått av portalen. Ingen boss på nivåer under `maxLevel`.
- Sparning: `P.chests` (lista, ersätter `chestDone`; äldre sparningar via `oldChests`), `P.minedMap` (per nivå, ersätter `mined`/`minedLevel`, nivåer < maxLevel - 12 glöms), `flax`, `hide`, `rod`, `knife`, `quiver`, `maxLevel`, `backSeen`.
- Smedjan har två flikar (`forgeTab`, `TABS`, `allRows`/`forgeRows`, `switchTab`, Tab/vänster/höger): Vapen och skydd (svärd, rustning, sköld, båge, pilar) och Verktyg (hacka, lykta, fiskespö, jaktkniv, stort koger). Fliken med något köpbart får ett !.
- Pilar kostar trä + sten (ingen metall). Pilspetsar (`P.arrowHead` 0-4, recept `arrowHead`, rad `head`) ger skada `C.bow.headDmg` x `bowMul` (`arrowDamage`, minst som förut med svärdets skada). Första fliken har sex rader.
- Aldrig fastna: `ensureOre(n)` gör om malm till den metall som svärdet eller hackan behöver om du saknar den (minst `C.bow.scarceOre` stenar, egen slump). Kopparn tar annars slut från Öknen (nivå 11).
- När man går till en tidigare nivå genom en portal raderas `P.minedMap` för den nivån: malm, träd, sten och lin växer tillbaka.
- Nästa-rutan i HUD visas 6 s när målet ändras och alltid när du har råd (`goalLast`, `goalUntil`).
- Fix: rustningsikonen i smedjan ritades aldrig färdigt (`//`-kommentar mitt på raden).

v3.2:
- Lätt är snällare (`C.difficulty.latt`): monster 70 % hälsa och 60 % skada, boss 70 % hälsa, längre tid mellan bossanfall och längre varning, all malm kvar vid död, 2 hjälpare. `regen` (hjärtan/s) läker när `P.calmT` > 3 s och inget monster är inom 170 px; `invMul` förlänger skyddet efter träff. Medel och Svår oförändrade.

v3.1:
- Stenhacka (`P.hasPick`, recept `stonePick`) krävs för all malm; äldre sparningar får `hasPick = true`. Hackraden i smedjan visar nivå 0-4 (0 = ingen hacka).
- Sköld (`P.shield` 0-4, recept `shield`, `C.shield.block`): håll Shift, höger musknapp eller `BTN_SHIELD` (`P.blocking`). Långsammare, inget slag. `hurtPlayer(dmg, sx, sy)` + `blockedFrom` minskar skada framifrån; stoppar också spindelnät.
- Pilbåge (`P.bow` 0-3, recept `bow`) och pilar (`P.arrows`, max 30, recept `arrows` ger 5): F eller `BTN_BOW`, `shoot` siktar på närmaste monster, pilar i `arrows` (`drawArrows`).
- Smedjan har sju rader (`FSTEP` 51, tangent 1-7).
- Utseende: `drawShieldShape` (sköld med spets, emblem per material: koppar nitar, järn blått kors, guld röd ädelsten, stjärnmalm stjärna), `drawBowShape` (lemmar, handtag, sträng, `pull`, pil på strängen), `drawQuiver`. Koger, båge och sköld bärs på ryggen (ritas före `stick`); vid parering hålls skölden framför och bakre armen går dit (`stick(..., offH)`), vid skott (`P.shotT`) spänns bågen i handen och svärdet göms en stund. Ikonerna använder samma ritfunktioner.


v3.0 (hantverk och skattkammare):
- Material: trä (`P.wood`, hugg träd: `treeHp`, `C.crafting.treeHits`), sten (`P.stone`, bryt grå stenar inne på kartan: `stoneHp`, `breakableStone` utesluter kanten och skattkammarens väggar), metall i fyra sorter (`MET`: 0 koppar = `P.ore`, 1 järn `P.iron`, 2 guld `P.gold`, 3 stjärnmalm `P.star`; `metalAmt`/`addMetal`). Malmsort per ruta i `oreT`, blandning per värld `C.crafting.oreMix`. Hackans nivå (`P.pick`, `PICK_NAME`) avgör vilken sort som går att bryta (sort <= hacka), annars meddelandet "För hård!".
- Recept i `C.crafting` (kostnad för att NÅ en nivå): `sword` (1-2 stensvärd av trä + sten, malm kräver minst stensvärd; 3-5 koppar, 6-8 järn, 9-11 guld, 12-15 stjärnmalm), `pick`, `armor`, `lantern0`; lyktans högre nivåer kostar månsten. Smedjan: `recipe`, `forgeRows`, `canAfford`, `costText`, `missingText`, `pay`, `forgeGoal` (föreslår hackan om svärdet kräver malm man inte kan bryta).
- Skadebalans: svärd 2.5 + 1.0 per nivå, monstrens hpPerLevel höjda; mål 2-4 slag per vanligt monster med världens svärd.
- Svärdets utseende följer materialet (`swordLook`): trä (brunt, ådring), koppar, järn, guld (sken), stjärnmalm (blått, glitter). Rustningen har fyra delar (`ARMOR_PART`: bröstplåt, hjälm, axelskydd, benskydd) som byggs och byts en i taget: nivå 1-4 koppar, 5-8 järn, 9-12 guld, 13-16 stjärnmalm (`armorPartTier`, `ARMOR_MAT`); hel rustning av guld eller bättre glimmar. Äldre sparningar (utan `armorV: 2`) räknas om. Guidetexten (`drawGuideText`) ligger nere i mitten och visas 5 s när instruktionen ändras (`guideShowT`); pilen finns kvar.
- Sparningen minns besegrad boss (`P.bossDone`), tagen kista (`P.chestDone`) och brutna rutor (`P.mined` + `P.minedLevel`, `markMined`) för nivån, så att omladdning inte ger belöningen igen; `buildLevel` hoppar då över bossen/kammaren.
- Skattkammare: en per värld, nivå `tw*5 + 1 + hash%4` (aldrig boss). `placeTreasure` ristar rum 7x4 (stenväggar, `DOOR`-ruta, kista) + plan 7x5 och kontrollerar nåbarhet (ångrar annars). `puzzle.kind` växlar per värld: `runes` (`runeHit`, ordning `seq` visas med toner `LJUD.note`) eller `blocks` (`pushBlocks`, `blockAt` i `blockedAt`, block låses på platta, spaken `resetBlocks`). `solvePuzzle` öppnar dörren, `openChest` ger trä, metall av nästa sort och månsten (+2 vid perfekt). Första gången visas en notis (`P.treasureSeen`), sedan ingen varning; kistan syns på minikartan när kammaren hittats.

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
- Blixtkraft: kristall ger laddning (v3.0: och ingen styrka längre, styrka visas inte i HUD) (`P.bolts`, max `C.boltPower.max`), `castStorm` (Q eller `BTN_BOLT` på plattan) skadar alla monster, ljusblixt `stormT` (svag ton om blinkningar är av).
- Varv: `lapOf(n)` (efter nivå 25). Varv 2 kvällston, 3+ natt (multiply-ton i världen), elitmonster (`m.elite`, `C.laps`), fler hjälpare till bossen. HUD: "Nivå N, varv X".
- Hjärtan i HUD: `drawHeart` (blanka med glans, tomma hjärtan har ljus kontur), två rader om fem, röd pulserande kant vid låg hälsa.

v2.2:
- E-tangent vid köttet i HUD (dator), ät-tips vid låg hälsa (`eatHintT`).
- Fem världar (`BIOMES`, `biomeOf(n)`, byter var 5:e nivå): Ängen, Djungeln, Öknen, Snölandet, Lavalandet. Styr markfärger, träd (`drawTree`), stenar, grottor, luftpartiklar (`spawnAir`, fx-typ `a`) och musikens tonart (`LJUD.setBiome`).
- Boss var 5:e nivå (`C.boss`, typ `boss`, `updateBoss`: walk > windCharge/windSlam > charge > stun, chockvåg fx-typ `w`, hjälp vid halv hälsa, `bossDefeated` släpper malm/hjärta/kristall). Varningar ritas i `drawBossExtras`, hälsostapel i HUD.
- Nya monster: spindel (`spiderAI`, nät i `shots`, saktar ned via `P.slow`), spöke (svävar genom väggar).
- Smedjan (`state = 'forge'`, `openForge`/`buy`/`overlayForge`): svärd (max 15), rustning (`P.armor`, `hurtPlayer` minskar skada), hacka (`P.pick`), lykta (`P.lamp`). Sparas i sparfilen.
- Fler monster per nivå (config `level`). All skada på spelaren går via `hurtPlayer`. Tidigare: `../Streckgubbe v2.1` (tagg `v2.1`).

2D-monsterspel sett uppifrån. Ren HTML5-canvas och vanilla JavaScript. Inga beroenden, ingen server-backend. Enda byggsteget är `verktyg/bygg.py` som sätter ihop `src/` till `spel.js` (från v3.5). Svara och skriv kommentarer på svenska.

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
- **Automatiska tester: `test.html`** (bara för utvecklaren, finns aldrig i `publicera/`). Starta testservern och öppna `http://localhost:8777/test.html`, tryck Kör alla tester (eller kör `window.__runTests()` och läs `window.__testDone` / `window.__testResults`). Sidan vägrar köra på andra portar och laddar då inte ens spelet. Den kör spelet i en iframe och kontrollerar: recept och inställningar, nivå 1-100 (nåbarhet, dammar, boss, portal tillbaka), malm per värld och `ensureOre`, smedjans kostnader, strid/sköld/pilar, hacka/lin/fiske/jakt, portaler, sparning och omladdning, gammal sparning, sparplatser (radera, hämta fil). Tar ca 3 s. Kör den efter varje ändring och lägg till en kontroll när något nytt byggs. Obs: efter en träff fryser spelet kort (hit-stop), så `step` behöver minst 0,2 s innan nästa kontroll.
Starta `python -m http.server <port> --bind 127.0.0.1` i mappen och öppna sidan i webbläsarpanelen. Använd `window.__sg` i stället för skärmdumpar:
`P`, `state` ('title'|'play'|'dead'), `level`, `mons`, `items`, `map`, `build(n)` (bygger nivå n utan att starta den).
Kontrollera nåbarhet för många nivåer med en loop över `build(n)`. Stoppa servern efteråt. Den inbyggda webbläsaren blockerar service workers; felet "unknown error when fetching the script" därifrån är väntat.

## Arbetssätt
- Kommentarer med // får aldrig hamna mitt på en rad med flera satser (resten av raden blir kommentar). Använd /* */ eller lägg kommentaren sist. Testa alltid att ett sparat spel läses in rätt (spara, ladda om, Enter, jämför alla fält i P) efter ändringar i save/continueGame.
- Kostnadseffektivt: små ändringar görs direkt. Delegera bara stora, avgränsade uppgifter, och till billigast lämpliga modell.
- Säkerhet: inga dolda filer, hooks eller skript som körs automatiskt. Granska skills och kod från GitHub innan installation. Fråga innan nya filer sparas.

## Pekskärm (Android-plattor)
- `touchMode` slås på av `(pointer: coarse)` eller första touch. Pointer-händelser med `pointerType !== 'mouse'` hanteras i indata-sektionen; musen har egen hantering och ignorerar låtsas-musklick inom 800 ms efter touch.
- Vänstra halvan: flytande joystick (`touch.jx/jy`, radie `JOY_R`, analog fart). Högra halvan: slå (med `aimNearest` när man står still). `BTN_E`: smid/ät. Titel: tryck = fortsätt, `BTN_NEW` = nytt spel. Död: tryck (spärr 700 ms).
- Stående läge visar "Vrid plattan". Manifestet: `display: fullscreen`, `orientation: landscape`.
- Testa: emulera bredd < 768 i webbläsarpanelen och skicka `PointerEvent` med `pointerType: 'touch'` till canvasen. Panelen pausar nästan bilduppdateringen när den är dold; mät rörelse över ~2 s.
- Publicering: webbhotell (one.com) med https. Mappen `publicera/` (ignoreras av git) innehåller exakt det som ska upp: `index.html`, `spel.js`, `config.js`, `sw.js`, `manifest.webmanifest`, `icon.svg`, `icon-192.png`, `icon-512.png`, `ljud.js`. Aldrig `CLAUDE.md`, `.claude/`, `.git/`, `verktyg/` eller `.bat`. Bygg om mappen efter varje ändring (`python -I verktyg/bygg.py --publicera`) och höj `VERSION` i `sw.js`.
