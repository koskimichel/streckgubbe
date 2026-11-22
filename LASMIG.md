# Streckgubbe

2D-monsterfighting i webbläsaren. Streckgubbe med hacka, malm, smältstation, blixtar och monster i grottor.

## Starta
1. Dubbelklicka `starta-spelet.bat` (kräver Python, eller Node för `npx serve`). Spelet öppnas på http://localhost:8765/index.html. Låt det svarta fönstret vara öppet medan du spelar.
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
- Blixtarna runt dig växer med styrka och svärdsnivå.
- Besegra alla monster på nivån, gå sedan in i portalen längst ned till höger.
- Dör du börjar du om nivån och förlorar halva malmen. Framsteg sparas i webbläsarens localStorage.

## Justera balansen
Alla tal ligger i `config.js`. Höj versionen `VERSION` i `sw.js` efter ändringar så att appen laddar om cachen.
