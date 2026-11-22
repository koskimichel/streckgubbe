# Malm & Monster (Mines & Monsters), version 2.4

Nytt i 2.4: spelet fungerar på mobil. På små skärmar fyller spelet hela skärmen, kameran zoomar in och följer gubben, knappar och text blir större och en liten karta i hörnet visar portalen och monstren. På dator och platta är allt som förut.

Nytt i 2.3: svårighetsgrad (Lätt, Medel, Svår) på titelskärmen och i pausmenyn, bossar med eget utseende, andra fas och egna förmågor, en tydligare djungel, mörkare grottor längre fram, lyktan får du i Djungeln och uppgraderar med sällsynt månsten, ugnen visar ! när du har råd med något, och rustningen syns på gubben. Dessutom: max 10 hjärtan, mindre malm och dyrare uppgraderingar så att det tar längre tid att bli max, kristaller ger blixtkraft (Q eller Blixt-knappen slår ned blixtar på alla monster), och efter nivå 25 kommer varv 2 med kvällsljus och elitmonster.

Nytt i 2.2: fem världar (äng, djungel, öken, snö, lava), en boss var femte nivå, spindlar som skjuter nät och spöken som går genom väggar, fler monster, smedjan vid ugnen (svärd upp till nivå 15, rustning, hacka, lykta) och tips om att äta när hälsan är låg.

Nytt i 2.1: ljud och bakgrundsmusik, paus med inställningar (musik, ljud, skak, blinkningar, skadetal, guide), automatisk paus när appen hamnar i bakgrunden, en guide på nivå 1 och tydligare knappar på plattan.

2D-monsterfighting i webbläsaren. Streckgubbe med hacka, malm, smältstation, blixtar och monster i grottor.

Nytt i v2: snyggare grafik (målad äng, mörka grottor med ljus runt dig, skuggor, animerade monster), träffkänsla (skärmskak, kort frysning vid träff, flygande skadetal) och spelet fyller hela fönstret. v2 har egen sparfil och kör på port 8766, så v1 påverkas inte.

## Starta
1. Dubbelklicka `starta-spelet.bat` (kräver Python, eller Node för `npx serve`). Spelet öppnas på http://localhost:8766/index.html. Låt det svarta fönstret vara öppet medan du spelar.
2. Enter för att starta. Har du ett sparat spel fortsätter det. Tryck N för nytt spel.

## Installera som app
Öppna adressen ovan i Edge eller Chrome och välj installera-ikonen i adressfältet (eller Meny, Appar, Installera). Efter första besöket fungerar spelet offline från cachen.

## Styrning
- Piltangenter eller WASD: gå
- Mellanslag eller musklick (håll nere): slå och hacka. Du slår dit du går, eller mot musen om du står still.
- E: vid smältstationen smider/uppgraderar du svärdet, annars äter du en köttklubba.

## Spelet
- Hacka malm (3 slag per block), smid svärd vid smältstationen (4 malm), uppgradera med mer malm.
- Köttklubbor (från monster eller på marken) ger hälsa. Hjärtan ger större maxhälsa. Kristaller ger styrka.
- Ju starkare du blir, desto mer lyser och gnistrar gubben. Blixtar slår ut när du tar en kristall eller smider svärdet.
- Besegra alla monster på nivån, gå sedan in i portalen längst ned till höger.
- Dör du börjar du om nivån och förlorar halva malmen. Framsteg sparas i webbläsarens localStorage.

## Justera balansen
Alla tal ligger i `config.js`. Där finns också `effects`: sätt `shake: 0` för att stänga av skärmskak, eller `hitStop`, `flash` och `damageNumbers` till `false` om något känns obehagligt. Höj versionen `VERSION` i `sw.js` efter ändringar så att appen laddar om cachen.

## Spela på Android-platta
Spelet måste ligga på en webbplats med https (till exempel ditt webbhotell). Öppna adressen i Chrome på plattan och välj "Lägg till på startskärmen" eller "Installera app".
- Vänster tumme: dra var som helst på vänstra halvan för att gå.
- Höger tumme: tryck på högra halvan för att slå och hacka. Står du still siktar gubben själv mot närmaste monster.
- Knappen "smid"/"ät": smider vid ugnen, annars äter du kött.
- Håll plattan i liggande läge.
