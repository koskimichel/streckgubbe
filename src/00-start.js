// Malm & Monster (Mines & Monsters), version 3.7.2 - 2D-monsterfighting med en streckgubbe. Ren canvas, inga beroenden.
// v2.1 nytt: ljud och musik (ljud.js), paus med inställningar, auto-paus, guide på nivå 1.
// v2.2 nytt: visar hur man äter (E-tangent i HUD, tips vid låg hälsa).
// Byggs av src/ med verktyg/bygg.py. Ändra i src/, aldrig direkt i spel.js.
// v3.7.2 nytt: dyrare koger, sköldknuff på snabbt tryck, snyggare snurrslag och kraftpil, Så gör du för krafterna.
// v3.7.1 nytt: monster efter värld, spring och ork (kraften Uthållighet), egen styrning på datorn.
// v3.7 nytt: krafter med månsten (snurrslag, sköldknuff, kraftpil), handgjorda blockpussel med mur och isblock i Snölandet.
// v3.6 nytt: balans per svårighet (pris och malm), sköld som studsar och yrar monster, lykta av metall, mörkare grottor och nätter.
// v3.5 nytt: kogret har tre steg (färre pilar i början), koden delad i src/.
// v3.4 nytt: tre sparplatser med spara fil och hämta fil, tydligare lin, annat byte från monster.
// v3.3 nytt: lin, damm och fiske, jaktkniv och bytesdjur, portal tillbaka, smedjan med två flikar.
// v3.2 nytt: snällare Lätt (svagare monster, behåll all malm, läkning när det är lugnt, längre skydd efter träff).
// v3.1 nytt: stenhacka krävs för koppar, sköld (parera), pilbåge med pilar och auto-sikte.
// v3.0 nytt: hantverk (trä och fyra malmsorter, hackan styr vad som går att bryta, recept i smedjan), ny skadebalans, skattkammare med runstenar och block.
// v2.4 nytt: mobilanpassning (kamera som följer gubben, större knappar och text, karta i hörnet).
// v2.3 nytt: svårighetsgrader, bossar med andra fas och eget utseende, tydligare djungel, månsten och lykta, synlig rustning.
// Stil: "krita på sommaräng". Kritvit hjälte, målad äng, blåsvarta grottor. Blixtgult är enda starka accenten.
// v2 nytt: förrenderad karta, ljus i grottor, skuggor, animerade figurer, träffkänsla (skak, hit-stop, skadetal), ny HUD.
(function () {
  'use strict';
  var C = CONFIG, TS = C.tile, W = C.cols, H = C.rows, FXC = C.effects || {};
  var WW = W * TS, WH = H * TS;                       // världen i pixlar (960 x 576)
  var LW = WW, LH = WH;                               // vyn (skärmen) i logiska enheter; större på mobil
  var ZW = 1, camX = 0, camY = 0, camSnap = true, PHONE = false, BOX = { s: 1, ox: 0, oy: 0 };   // kamera och menyruta
  var cv = document.getElementById('c'), g = cv.getContext('2d');
  var GRASS = 0, STONE = 1, TREE = 2, CAVE = 3, ORE = 4, SMELT = 5, EXIT = 6, DOOR = 7, FLAX = 8, WATER = 9, BACK = 10;
  var pond = null, prey = [], goalLast = '', goalUntil = 0;   // v3.3: dammen, bytesdjuren, Nästa-rutan
  var SAVE_KEY = 'streckgubbe-save-v1';
  var HAND = '"Segoe Print", "Trebuchet MS", Roboto, sans-serif';   // bara stora rubriker; ingen skrivstilsreserv (Android)
  var TXT = '"Trebuchet MS", "Segoe UI", Roboto, Arial, sans-serif'; // all text som ska läsas snabbt, även av barn
  var UI = '"Segoe UI", Arial, sans-serif';
  var PAL = { chalk: '#fafaf2', bolt: '#ffe14d', gold: '#f0c94a', heart: '#ff4d6a', night: '#1a1c2b', forest: '#1f4f1d' };

  // ---------- hjälpmedel ----------
  function mulberry(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function easeOutBack(k) { var c1 = 1.70158, c3 = c1 + 1, m = k - 1; return 1 + c3 * m * m * m + c1 * m * m; }
  function easeOutCubic(k) { return 1 - Math.pow(1 - k, 3); }
  var mapSeed = 1;
  function hash(x, y, k) {                             // stabil slump per ruta, för utseende
    var h = Math.imul(x + 7, 374761393) + Math.imul(y + 13, 668265263) + Math.imul(k + 1, 1274126177) + Math.imul(mapSeed, 1013904223) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function shade(hex, f) {                             // f > 0 ljusare, f < 0 mörkare
    var n = parseInt(hex.slice(1), 16), r = n >> 16, gg = n >> 8 & 255, b = n & 255;
    if (f > 0) { r += (255 - r) * f; gg += (255 - gg) * f; b += (255 - b) * f; } else { r *= 1 + f; gg *= 1 + f; b *= 1 + f; }
    return 'rgb(' + (r | 0) + ',' + (gg | 0) + ',' + (b | 0) + ')';
  }
  function rr(c, x, y, w, h, r) {                      // rundad rektangel
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function fmt(v) { return String(Math.round(v * 10) / 10); }

