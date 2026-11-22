// Malm & Monster (Mines & Monsters), version 3.0 - 2D-monsterfighting med en streckgubbe. Ren canvas, inga beroenden.
// v2.1 nytt: ljud och musik (ljud.js), paus med inställningar, auto-paus, guide på nivå 1.
// v2.2 nytt: visar hur man äter (E-tangent i HUD, tips vid låg hälsa).
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
  var GRASS = 0, STONE = 1, TREE = 2, CAVE = 3, ORE = 4, SMELT = 5, EXIT = 6, DOOR = 7;
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

  // ---------- spelstate ----------
  var P, level, map, isCave, oreHp, mons, items, state, msg = '', msgT = 0, fx = [], kills, quota, time = 0;
  var oreT = {}, treeHp = {}, stoneHp = {}, puzzle = null, pushT = 0;      // v3.0: malmsort per ruta, trädens hälsa, skattkammarens pussel
  var keys = {}, mouse = { x: 0, y: 0, down: false, has: false };
  var trauma = 0, shakeT = 0, hitStop = 0, fade = 0, texts = [];
  // pekskärm: joystick under vänster tumme, knappar för höger tumme
  var touchMode = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches), lastTouch = 0, deadAt = 0;
  var touch = { joyId: null, jx0: 0, jy0: 0, jx: 0, jy: 0, atkId: null, eId: null };
  var JOY_R = 56, BTN_ATK = { x: LW - 96, y: LH - 96, r: 56 }, BTN_E = { x: LW - 214, y: LH - 66, r: 42 }, BTN_PAUSE = { x: LW - 30, y: 23, r: 17 }, BTN_DIFF = { x: LW / 2 - 200, y: LH - 44, w: 200, h: 40 }, BTN_BOLT = { x: LW - 96, y: LH - 202, r: 38 }, BTN_NEW = { x: LW / 2, y: LH - 44, w: 170, h: 40 };

  // inställningar som spelaren ändrar i pausmenyn (sparas per enhet)
  var SET_KEY = 'mm-installningar';
  var settings = { music: 0.5, sfx: 0.8, shake: FXC.shake == null ? 1 : FXC.shake, flash: FXC.flash !== false, numbers: FXC.damageNumbers !== false, guide: true, diff: 'latt' };
  try { var ss = JSON.parse(localStorage.getItem(SET_KEY)); if (ss) Object.keys(settings).forEach(function (k) { if (ss[k] !== undefined) settings[k] = ss[k]; }); } catch (e) {}
  function applySettings() {
    FXC.shake = settings.shake; FXC.flash = settings.flash; FXC.damageNumbers = settings.numbers;
    if (window.LJUD) LJUD.setVolumes(settings.music, settings.sfx);
    try { localStorage.setItem(SET_KEY, JSON.stringify(settings)); } catch (e) {}
  }
  function sfx(n) { if (window.LJUD) LJUD.play(n); }
  var guideMoved = 0, eatHintT = 0;                      // eatHintT: sekunder till nästa ät-tips
  var shots = [], ambientT = 0, forgeSel = 0;              // v2.2: nätskott, luftpartiklar, val i smedjan

  // v2.2: fem världar, var femte nivå. Bara utseende, musik och boss skiljer; monstren blir svårare med nivån.
  var BIOMES = [
    { name: 'Ängen', boss: 'Grottkungen', bossColor: '#8a6a4a', ground: ['#3d8c38', '#40913a', '#3a8735', '#43933c'], blade: ['#2f7a2c', '#62b255'],
      flowers: ['#ffffff', '#ffe14d', '#ff9ec7', '#b9a6ff'], tree: 'leaf', stone: ['#a4a8b2', '#5c6069'], rim: '#5d6170', cave: ['#232536', '#262839'], air: null },
    { name: 'Djungeln', boss: 'Djungeljätten', bossColor: '#4f7a2a', ground: ['#2c6b2a', '#2f722c', '#296526', '#33782f'], blade: ['#1d5220', '#4f9a3c'],
      flowers: ['#ff5a3c', '#ffb02e', '#ff7ad1'], tree: 'jungle', stone: ['#7f9a78', '#3e5a3c'], rim: '#4a5e46', cave: ['#1d2a22', '#202e25'], air: 'fireflies' },
    { name: 'Öknen', boss: 'Sandkungen', bossColor: '#c08a3a', ground: ['#e2c07a', '#e6c582', '#dcb872', '#e9ca8a'], blade: ['#c9a25c', '#f2d99c'],
      flowers: null, tree: 'cactus', stone: ['#e0b27a', '#9a6b3a'], rim: '#a07a4a', cave: ['#2e2418', '#33281b'], air: 'sand' },
    { name: 'Snölandet', boss: 'Isjätten', bossColor: '#7fb0e0', ground: ['#e8eef5', '#eef3f8', '#e2e9f1', '#f2f6fa'], blade: ['#c5d3e3', '#ffffff'],
      flowers: null, tree: 'pine', stone: ['#d4e0ee', '#7d8ea6'], rim: '#8a9bb2', cave: ['#1f2a3d', '#223047'], air: 'snow' },
    { name: 'Lavalandet', boss: 'Lavaherren', bossColor: '#d0402a', ground: ['#3b2f2c', '#41332f', '#372b28', '#45362f'], blade: ['#2a1f1c', '#5a4038'],
      flowers: null, tree: 'dead', stone: ['#6d5650', '#2b201d'], rim: '#4a3a36', cave: ['#1d1416', '#21171a'], air: 'embers', cracks: true }
  ];
  BIOMES.forEach(function (b, i) { b.i = i; });
  function lapOf(n) { return Math.floor((n - 1) / 25); }        // varv: 0 = första, 1 = kväll, 2+ = natt
  function biomeOf(n) { return BIOMES[Math.floor((n - 1) / 5) % BIOMES.length]; }
  var biome = BIOMES[0];
  var AIR_RATE = { snow: 0.05, sand: 0.09, embers: 0.12, fireflies: 0.45 };
  BIOMES[1].treeMul = 1.9; BIOMES[1].canopy = true;           // djungeln: tät skog och lövtak
  var CAVE_DARK = [0.62, 0.76, 0.83, 0.88, 0.93];              // grottorna blir mörkare för varje värld
  var BOSS_KIND = ['golem', 'ape', 'scorpion', 'yeti', 'demon'];
  var MET = [                                                  // v3.0: malmsorter
    { name: 'koppar', c1: '#ffc49a', c2: '#e0763a', c3: '#7a3414' },
    { name: 'järn', c1: '#f4f7fb', c2: '#aeb6c2', c3: '#545c6a' },
    { name: 'guld', c1: '#fff1a8', c2: '#f0c94a', c3: '#a8781f' },
    { name: 'stjärnmalm', c1: '#e6f5ff', c2: '#6ab8ff', c3: '#2a5aa0' }
  ];
  var PICK_NAME = ['stenhacka', 'kopparhacka', 'järnhacka', 'guldhacka'];
  var DIFF_ORDER = ['latt', 'medel', 'svar'], DIFF_NAME = { latt: 'Lätt', medel: 'Medel', svar: 'Svår' };
  function DF() { return C.difficulty[settings.diff] || C.difficulty.latt; }
  function cycleDiff(dir) {
    var i = DIFF_ORDER.indexOf(settings.diff); if (i < 0) i = 0;
    settings.diff = DIFF_ORDER[(i + (dir || 1) + 3) % 3]; applySettings(); sfx('click');
  }
  var bossIntro = 0, stormT = 0;

  function newPlayer() {
    return {
      x: 2.5 * TS, y: 2.5 * TS, r: 10, hearts: C.player.startHearts,
      hp: C.player.startHearts * C.player.hpPerHeart,
      str: C.player.startStrength, ore: 0, meat: 1, sword: 0,
      fx: 1, fy: 0, cd: 0, inv: 0, swing: 0, walk: 0, moving: false, pu: 0, spk: 0, armor: 0, pick: 0, lamp: 0, slow: 0, moon: 0, moonEver: false, vx: 0, vy: 0, icy: 0, bolts: 0, wood: 0, stone: 0, iron: 0, gold: 0, star: 0, treasureSeen: false, bossDone: 0, chestDone: 0, mined: [], minedLevel: 0
    };
  }
  function maxHp() { return P.hearts * C.player.hpPerHeart; }
  function metalAmt(t) { return [P.ore, P.iron, P.gold, P.star][t] || 0; }   // P.ore = koppar (gamla malmen)
  function addMetal(t, n) { if (t === 0) P.ore += n; else if (t === 1) P.iron += n; else if (t === 2) P.gold += n; else P.star += n; }
  function damage() {
    var base = P.sword > 0 ? C.weapon.swordBaseDamage + C.weapon.damagePerSwordLevel * (P.sword - 1) : C.weapon.stickDamage;
    return base + C.weapon.damagePerStrength * (P.str - 1);
  }
  function power() { return P.sword + P.str - 1; }          // styr blixtarnas storlek
  function reach() { return C.player.baseReach + Math.min(power(), 12) * 2; }
  function upgradeCost() {
    return P.sword === 0 ? C.weapon.craftCost : Math.round(C.weapon.upgradeCostBase + C.weapon.upgradeCostStep * P.sword + (C.weapon.upgradeCostSquare || 0) * P.sword * P.sword);
  }
  function say(t) { msg = t; msgT = 3; }

  // träffkänsla (se .claude/skills/game-feel): trauma ger skak, hit-stop fryser spelet kort
  function addTrauma(a) { trauma = Math.min(1, trauma + a); }
  function freeze(s) { if (FXC.hitStop !== false) hitStop = Math.max(hitStop, s); }
  function floatText(x, y, txt, col) {
    if (FXC.damageNumbers === false) return;
    texts.push({ x: x, y: y, txt: txt, col: col, t: 0, life: 0.9, vx: (Math.random() - 0.5) * 30 });
  }
  // Power-up: blixtarna används bara här, som en kort smäll när gubben blir starkare.
  function powerUp() {
    P.pu = 0.6; addTrauma(0.25); sfx('powerup');
    for (var i = 0; i < 6; i++) {
      var a = i / 6 * 6.283 + Math.random() * 0.4;
      bolt(P.x + Math.cos(a) * 8, P.y - 3 + Math.sin(a) * 8, P.x + Math.cos(a) * 52, P.y - 3 + Math.sin(a) * 52, 2);
    }
    fx.push({ k: 'r', x: P.x, y: P.y - 3, t: 0.45, life: 0.45 });
    sparks(P.x, P.y, PAL.bolt, 16);
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        level: level, hearts: P.hearts, str: P.str, ore: P.ore, meat: P.meat, sword: P.sword, armor: P.armor, pick: P.pick, lamp: P.lamp, moon: P.moon, moonEver: P.moonEver, bolts: P.bolts, armorV: 2, bossDone: P.bossDone, chestDone: P.chestDone, minedLevel: P.minedLevel, mined: P.mined, wood: P.wood, stone: P.stone, iron: P.iron, gold: P.gold, star: P.star, treasureSeen: P.treasureSeen
      }));
    } catch (e) {}
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && s.level >= 1) return s;
    } catch (e) {}
    return null;
  }

  // ---------- nivågenerering ----------
  function solid(t) { return t === STONE || t === TREE || t === ORE || t === SMELT || t === DOOR; }

  function reachable(sx, sy, tx, ty) {
    var seen = {}, q = [[sx, sy]]; seen[sx + ',' + sy] = 1;
    while (q.length) {
      var c = q.shift();
      if (c[0] === tx && c[1] === ty) return true;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nx = c[0] + d[0], ny = c[1] + d[1], k = nx + ',' + ny;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[k]) return;
        if (solid(map[ny][nx])) return;
        seen[k] = 1; q.push([nx, ny]);
      });
    }
    return false;
  }

  // Rutor spelaren kan nå från start. Malm räknas som öppen (den går att hacka bort).
  function openFrom(sx, sy) {
    var open = [], q = [[sx, sy]], y, x;
    for (y = 0; y < H; y++) { open[y] = []; for (x = 0; x < W; x++) open[y][x] = false; }
    open[sy][sx] = true;
    while (q.length) {
      var c = q.pop();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nx = c[0] + d[0], ny = c[1] + d[1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || open[ny][nx]) return;
        var t = map[ny][nx];
        if (t === STONE || t === TREE || t === SMELT || t === DOOR) return;
        open[ny][nx] = true; q.push([nx, ny]);
      });
    }
    return open;
  }

  // Nödutväg: hugg upp en väg från start till portalen om slumpen aldrig gav en.
  function carvePath(sx, sy, tx, ty) {
    var x = sx, y = sy;
    function clear() {
      var t = map[y][x];
      if (t === STONE || t === TREE || t === ORE) { map[y][x] = isCave[y][x] ? CAVE : GRASS; delete oreHp[x + ',' + y]; }
    }
    while (x !== tx) { clear(); x += x < tx ? 1 : -1; }
    while (y !== ty) { clear(); y += y < ty ? 1 : -1; }
  }

  function buildLevel(n, attempt) {
    var rnd = mulberry(n * 7919 + attempt * 104729 + 13), L = C.level;
    map = []; isCave = []; oreHp = {}; oreT = {}; treeHp = {}; stoneHp = {}; puzzle = null;
    var x, y;
    for (y = 0; y < H; y++) { map[y] = []; isCave[y] = []; for (x = 0; x < W; x++) { map[y][x] = GRASS; isCave[y][x] = false; } }
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) { map[y][x] = STONE; continue; }
      var r = rnd();
      var td = L.treeDensity * (biomeOf(n).treeMul || 1);
      if (r < td) map[y][x] = TREE; else if (r < td + L.stoneDensity) map[y][x] = STONE;
    }
    // grottor
    var caves = [];
    for (var i = 0; i < L.caves; i++) {
      var cw = 5 + Math.floor(rnd() * 4), ch = 4 + Math.floor(rnd() * 3);
      var cx = 8 + Math.floor(rnd() * (W - 8 - cw - 3)), cy = 2 + Math.floor(rnd() * (H - 4 - ch));
      caves.push({ x: cx, y: cy, w: cw, h: ch });
      for (y = cy; y < cy + ch; y++) for (x = cx; x < cx + cw; x++) { map[y][x] = CAVE; isCave[y][x] = true; }
      // malm i grottans kant
      for (x = cx; x < cx + cw; x++) { if (rnd() < 0.45) { map[cy][x] = ORE; } if (rnd() < 0.45) { map[cy + ch - 1][x] = ORE; } }
    }
    // extra malm på marken, intill sten
    var oreWanted = Math.min(L.maxOre || 99, Math.round(L.baseOre + L.orePerLevel * n)), placed = 0, tries = 0;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (map[y][x] === ORE) placed++;
    while (placed < oreWanted && tries++ < 2000) {
      x = 2 + Math.floor(rnd() * (W - 4)); y = 2 + Math.floor(rnd() * (H - 4));
      if (map[y][x] === GRASS && (x > 6 || y > 6)) { map[y][x] = ORE; placed++; }
    }
    // startyta, smältstation, utgång
    for (y = 1; y <= 4; y++) for (x = 1; x <= 5; x++) { map[y][x] = GRASS; isCave[y][x] = false; }
    map[2][4] = SMELT;
    var ex = W - 3, ey = H - 3;
    for (y = ey - 1; y <= ey + 1; y++) for (x = ex - 1; x <= ex + 1; x++) { if (y < H - 1 && x < W - 1) { map[y][x] = GRASS; isCave[y][x] = false; } }
    map[ey][ex] = EXIT;
    var mix = C.crafting.oreMix[lapOf(n) > 0 ? 4 : Math.min(4, Math.floor((n - 1) / 5))];
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      if (map[y][x] === ORE) {                                   // malmsort efter världens blandning
        oreHp[x + ',' + y] = C.mining.hitsPerOre;
        var rv = rnd(), acc = 0, kk = 3;
        for (var mi = 0; mi < 4; mi++) { acc += mix[mi]; if (rv < acc) { kk = mi; break; } }
        oreT[x + ',' + y] = kk;
      } else if (map[y][x] === TREE) treeHp[x + ',' + y] = C.crafting.treeHits;
    }
    if (!reachable(2, 2, ex, ey)) {
      if (attempt < 30) return buildLevel(n, attempt + 1);
      carvePath(2, 3, ex, ey);                          // rad 3 går förbi smältstationen på rad 2
    }
    if (P && P.minedLevel === n && P.mined) P.mined.forEach(function (k) {   // redan bruten malm, huggna träd och brutna stenar
      var q = k.split(','), mx = +q[0], my = +q[1];
      if (map[my] && (map[my][mx] === ORE || map[my][mx] === TREE || map[my][mx] === STONE)) { map[my][mx] = isCave[my][mx] ? CAVE : GRASS; delete oreHp[k]; delete treeHp[k]; delete stoneHp[k]; }
    });
    var tw = Math.floor((n - 1) / 5), tLvl = tw * 5 + 1 + ((Math.imul(tw + 1, 2654435761) >>> 0) % 4);
    if (n === tLvl && !(P && P.chestDone === n)) placeTreasure(n, rnd, tw);   // inte om kistan redan är tagen                     // en skattkammare per värld
    var open = openFrom(2, 2);

    // monster
    mons = []; items = [];
    var count = Math.min(C.level.maxMonsters, Math.round(L.baseMonsters + L.monstersPerLevel * n));
    if (n % C.boss.every === 0) count = Math.ceil(count / 2);         // bossnivå: färre vanliga monster
    var types = []; Object.keys(C.monsters).forEach(function (k) {
      var m = C.monsters[k]; if (m && m.from && m.from <= n) types.push(k);
    });
    function pickType() {
      var tot = 0; types.forEach(function (k) { tot += C.monsters[k].weight; });
      var v = rnd() * tot; for (var j = 0; j < types.length; j++) { v -= C.monsters[types[j]].weight; if (v <= 0) return types[j]; }
      return types[0];
    }
    function freeSpot(wantCave) {
      for (var t = 0; t < 300; t++) {
        var px = 1 + Math.floor(rnd() * (W - 2)), py = 1 + Math.floor(rnd() * (H - 2));
        if (solid(map[py][px]) || map[py][px] === EXIT || !open[py][px]) continue;
        if (wantCave && !isCave[py][px]) continue;
        if (Math.hypot(px - 2, py - 2) < 8) continue;
        return { x: (px + 0.5) * TS, y: (py + 0.5) * TS };
      }
      return null;
    }
    for (i = 0; i < count; i++) {
      var s = freeSpot(rnd() < 0.65) || freeSpot(false); if (!s) continue;
      var k = pickType(), d = C.monsters[k];
      var hp = (d.hpBase + d.hpPerLevel * n) * DF().mHp;
      mons.push({ type: k, x: s.x, y: s.y, r: d.radius, hp: hp, maxHp: hp, dmg: (d.dmgBase + d.dmgPerLevel * n) * DF().mDmg,
        speed: Math.min(d.maxSpeed, d.speed + d.speedPerLevel * n), cd: 0, kx: 0, ky: 0, hit: 0, pop: 9, ph: rnd() * 6 });
      var eC = Math.min(C.laps.eliteMax, lapOf(n) * C.laps.eliteChancePerLap);
      if (eC > 0 && rnd() < eC) { var em = mons[mons.length - 1]; em.elite = true; em.hp *= C.laps.eliteHp; em.maxHp = em.hp; em.dmg *= C.laps.eliteDmg; }
    }
    if (n % C.boss.every === 0 && !(P && P.bossDone === n)) {        // boss långt från start (inte om den redan är besegrad), med plats runt sig
      var bs = null;
      for (var bt = 0; bt < 300 && !bs; bt++) {
        var c2 = freeSpot(false);
        if (c2 && Math.hypot(c2.x - 2.5 * TS, c2.y - 2.5 * TS) > 12 * TS && !blockedAt(c2.x, c2.y, C.boss.radius)) bs = c2;
      }
      if (!bs) {                                                       // nödläge: röj en plats mitt till höger
        var fx0 = W - 8, fy0 = Math.floor(H / 2);
        for (var yy = fy0 - 1; yy <= fy0 + 1; yy++) for (var xx = fx0 - 1; xx <= fx0 + 1; xx++) if (map[yy][xx] !== EXIT) { map[yy][xx] = isCave[yy][xx] ? CAVE : GRASS; delete oreHp[xx + ',' + yy]; }
        bs = { x: (fx0 + 0.5) * TS, y: (fy0 + 0.5) * TS };
      }
      var BB = C.boss, bhp = (BB.hpBase + BB.hpPerLevel * n) * DF().bHp;
      mons.push({ type: 'boss', x: bs.x, y: bs.y, r: BB.radius, hp: bhp, maxHp: bhp, dmg: (BB.dmgBase + BB.dmgPerLevel * n) * DF().mDmg, speed: BB.speed,
        cd: 0, kx: 0, ky: 0, hit: 0, pop: 9, ph: 0, ai: 'walk', aiT: 2.5, summoned: false, dirx: 1, diry: 0, kind: BOSS_KIND[biomeOf(n).i], phase2: false, chain: 0, hidden: 0 });
    }
    kills = 0; quota = mons.length;
    // föremål: kristaller i grottor, hjärta, kött
    for (i = 0; i < L.crystalsPerLevel; i++) { var c1 = freeSpot(true) || freeSpot(false); if (c1) items.push({ t: 'crystal', x: c1.x, y: c1.y }); }
    if (n % L.heartEveryNLevels === 0) { var h1 = freeSpot(true) || freeSpot(false); if (h1) items.push({ t: 'heart', x: h1.x, y: h1.y }); }
    for (i = 0; i < L.extraMeat; i++) { var m1 = freeSpot(false); if (m1) items.push({ t: 'meat', x: m1.x, y: m1.y }); }
    if (n >= 2 && n % 3 === 0) {                                 // gömd månsten längst in i en grotta
      var mbest = null, mbd = 0;
      for (y = 1; y < H - 1; y++) for (x = 1; x < W - 1; x++) if (isCave[y][x] && map[y][x] === CAVE && open[y][x]) { var mdd = Math.hypot(x - 2, y - 2); if (mdd > mbd) { mbd = mdd; mbest = { x: x, y: y }; } }
      if (mbest) items.push({ t: 'moon', x: (mbest.x + 0.5) * TS, y: (mbest.y + 0.5) * TS });
    }
    mapSeed = n; mapDirty = true; biome = biomeOf(n);
  }

  // ---------- skattkammare (v3.0) ----------
  // Ett rum (7 x 4 med stenväggar och en dörr) med en plan framför (7 x 5) där pusslet finns. Dörren öppnas när pusslet är löst.
  function placeTreasure(n, rnd, tw) {
    var kind = tw % 2 === 0 ? 'runes' : 'blocks', wi = tw % 5, lap = lapOf(n);
    for (var tries = 0; tries < 60; tries++) {
      var x0 = 7 + Math.floor(rnd() * (W - 15)), ry = 1 + Math.floor(rnd() * (H - 11)), x, y;
      if (x0 + 6 >= W - 1 || ry + 8 >= H - 1) continue;
      if (x0 + 6 >= W - 5 && ry + 8 >= H - 5) continue;               // inte vid portalen
      var bm = map.map(function (r) { return r.slice(); }), bc = isCave.map(function (r) { return r.slice(); });
      for (y = ry; y <= ry + 8; y++) for (x = x0; x <= x0 + 6; x++) {
        var wall = y <= ry + 3 && (x === x0 || x === x0 + 6 || y === ry || y === ry + 3);
        map[y][x] = wall ? STONE : GRASS; isCave[y][x] = false; delete oreHp[x + ',' + y]; delete treeHp[x + ',' + y]; delete oreT[x + ',' + y];
      }
      map[ry + 3][x0 + 3] = DOOR;
      if (reachable(2, 2, W - 3, H - 3)) {
        var op = openFrom(2, 2);
        if (op[ry + 4][x0 + 3] && op[ry + 8][x0 + 1] && op[ry + 8][x0 + 5]) { buildPuzzle(kind, x0, ry, wi, lap, rnd); return; }
      }
      map = bm; isCave = bc;                                     // ångra och prova en annan plats
    }
  }
  function buildPuzzle(kind, x0, ry, wi, lap, rnd) {
    var y0 = ry + 4, i;
    puzzle = { kind: kind, x0: x0, ry: ry, doorX: x0 + 3, doorY: ry + 3, solved: false, found: false, perfect: true, started: false,
      chest: { x: (x0 + 3.5) * TS, y: (ry + 1.5) * TS, taken: false } };
    if (kind === 'runes') {                                      // runstenar i en rad; ordningen visas med ljus och toner
      var nR = Math.min(7, [3, 4, 4, 5, 5][wi] + lap), runes = [], seq = [];
      for (i = 0; i < nR; i++) { var col = nR > 1 ? Math.round(i * 6 / (nR - 1)) : 3; runes.push({ x: (x0 + col + 0.5) * TS, y: (y0 + 2 + 0.5) * TS, lit: 0, bad: 0 }); seq.push(i); }
      for (i = seq.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), tmp = seq[i]; seq[i] = seq[j]; seq[j] = tmp; }
      puzzle.runes = runes; puzzle.seq = seq; puzzle.input = []; puzzle.show = null; puzzle.speed = Math.max(0.45, 0.75 - wi * 0.06);
    } else {                                                     // block knuffas rakt upp på plattorna; spaken ställer tillbaka
      var nB = [1, 2, 2, 3, 3][wi], cols = nB === 1 ? [3] : nB === 2 ? [1, 5] : [1, 3, 5];
      puzzle.plates = cols.map(function (c) { return { tx: x0 + c, ty: y0 + 1 }; });
      puzzle.blocks = cols.map(function (c) { return { tx: x0 + c, ty: y0 + 3, sx: x0 + c, sy: y0 + 3, ox: 0, oy: 0 }; });
      puzzle.lever = { x: (x0 + 0.5) * TS, y: (y0 + 3 + 0.5) * TS, flip: 0 };
    }
  }
  function markMined(x, y) {                                     // minns vad som brutits på nivån (sparas)
    if (P.minedLevel !== level) { P.minedLevel = level; P.mined = []; }
    P.mined.push(x + ',' + y);
  }
  function breakableStone(x, y) {                               // kantstenar och skattkammarens väggar går inte att bryta
    if (x <= 0 || y <= 0 || x >= W - 1 || y >= H - 1) return false;
    if (puzzle && x >= puzzle.x0 && x <= puzzle.x0 + 6 && y >= puzzle.ry && y <= puzzle.ry + 3) return false;
    return true;
  }
  function blockAt(tx, ty) {
    if (!puzzle || !puzzle.blocks) return null;
    for (var i = 0; i < puzzle.blocks.length; i++) { var b = puzzle.blocks[i]; if (b.tx === tx && b.ty === ty) return b; }
    return null;
  }
  function updatePuzzle(dt) {
    var pz = puzzle; if (!pz) return;
    var near = Math.hypot((pz.doorX + 0.5) * TS - P.x, (pz.doorY + 3) * TS - P.y) < 5 * TS;
    if (near && !pz.found) {
      pz.found = true;
      say(pz.kind === 'runes' ? 'En skattkammare! Slå på runstenarna i samma ordning som de lyser.' : 'En skattkammare! Knuffa blocken upp på de runda plattorna. Spaken ställer tillbaka dem.');
    }
    if (pz.kind === 'runes') {
      pz.runes.forEach(function (ru) { if (ru.lit > 0) ru.lit -= dt; if (ru.bad > 0) ru.bad -= dt; });
      if (!pz.solved && near && !pz.started) { pz.started = true; pz.show = { active: true, i: -1, t: 0.9 }; }
      var sh = pz.show;
      if (sh && sh.active) {
        sh.t -= dt;
        if (sh.t <= 0) {
          sh.i++;
          if (sh.i < pz.seq.length) { var ri = pz.seq[sh.i]; pz.runes[ri].lit = pz.speed * 0.8; if (window.LJUD) LJUD.note(ri); sh.t = pz.speed; }
          else sh.active = false;
        }
      }
    } else {
      pz.blocks.forEach(function (b) { var v = 220 * dt; b.ox = b.ox > 0 ? Math.max(0, b.ox - v) : Math.min(0, b.ox + v); b.oy = b.oy > 0 ? Math.max(0, b.oy - v) : Math.min(0, b.oy + v); });
      if (pz.lever.flip > 0) pz.lever.flip -= dt;
      if (!pz.solved) pushBlocks(dt);
    }
    if (pz.solved && !pz.chest.taken && Math.hypot(pz.chest.x - P.x, pz.chest.y - P.y) < 22) openChest();
  }
  function pushBlocks(dt) {
    if (!P.moving) { pushT = 0; return; }
    var horiz = Math.abs(P.fx) > Math.abs(P.fy), dx = horiz ? Math.sign(P.fx) : 0, dy = horiz ? 0 : Math.sign(P.fy);
    var t = tileAt(P.x + dx * (P.r + 6), P.y + dy * (P.r + 6)), b = blockAt(t.x, t.y);
    if (!b) { pushT = 0; return; }
    if (puzzle.plates.some(function (pl) { return pl.tx === b.tx && pl.ty === b.ty; })) { pushT = 0; return; }   // block på platta sitter fast
    pushT += dt; if (pushT < 0.16) return; pushT = 0;
    var nx = b.tx + dx, ny = b.ty + dy;
    if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1 || solid(map[ny][nx]) || map[ny][nx] === EXIT || blockAt(nx, ny)) {
      if (msgT <= 0) say('Blocket fastnar. Slå på spaken så kommer blocken tillbaka.');
      return;
    }
    b.tx = nx; b.ty = ny; b.ox = -dx * TS; b.oy = -dy * TS; sfx('push');
    if (puzzle.plates.every(function (pl) { return !!blockAt(pl.tx, pl.ty); })) solvePuzzle();
    else if (puzzle.plates.some(function (pl) { return pl.tx === nx && pl.ty === ny; })) sfx('click');
  }
  function puzzleHit(rc) {                                       // slag på runsten eller spak
    var pz = puzzle, targets = pz.kind === 'runes' ? pz.runes.map(function (r, i) { return { x: r.x, y: r.y, i: i }; }) : [{ x: pz.lever.x, y: pz.lever.y, i: -1 }];
    var best = null, bd = rc + 10;
    targets.forEach(function (q) {
      var dx = q.x - P.x, dy = q.y - P.y, d = Math.hypot(dx, dy); if (d > bd) return;
      var dot = d > 0 ? (dx * P.fx + dy * P.fy) / d : 1; if (dot < 0.3 && d > 18) return;
      bd = d; best = q;
    });
    if (!best) return;
    if (pz.kind === 'runes') runeHit(best.i); else resetBlocks();
  }
  function runeHit(i) {
    var pz = puzzle; if (pz.show && pz.show.active) return;     // vänta tills ordningen har visats
    pz.started = true;
    if (pz.seq[pz.input.length] === i) {
      pz.input.push(i); pz.runes[i].lit = 0.45; if (window.LJUD) LJUD.note(i); sparks(pz.runes[i].x, pz.runes[i].y - 4, PAL.bolt, 6);
      if (pz.input.length === pz.seq.length) solvePuzzle();
    } else {
      pz.runes[i].bad = 0.6; pz.input = []; pz.perfect = false; sfx('deny'); say('Fel ordning! Titta igen.');
      pz.show = { active: true, i: -1, t: 1.0 };
      if (settings.diff === 'svar') {                            // på Svår kommer ett monster vid fel
        var d0 = C.monsters.slime, hp0 = (d0.hpBase + d0.hpPerLevel * level) * DF().mHp, sx = P.x + 50, sy = P.y;
        if (blockedAt(sx, sy, d0.radius)) { sx = P.x; sy = P.y - 40; }
        mons.push({ type: 'slime', x: sx, y: sy, r: d0.radius, hp: hp0, maxHp: hp0, dmg: (d0.dmgBase + d0.dmgPerLevel * level) * DF().mDmg, speed: d0.speed, cd: 1, kx: 0, ky: 0, hit: 0, pop: 0, ph: 0 });
        quota++; sparks(sx, sy, '#c9bfff', 12);
      }
    }
  }
  function resetBlocks() {
    var pz = puzzle; pz.blocks.forEach(function (b) { b.tx = b.sx; b.ty = b.sy; b.ox = 0; b.oy = 0; });
    pz.perfect = false; pz.lever.flip = 0.5; sfx('click'); say('Blocken är tillbaka.');
  }
  function solvePuzzle() {
    var pz = puzzle; pz.solved = true; map[pz.doorY][pz.doorX] = GRASS; mapDirty = true;
    var dx = (pz.doorX + 0.5) * TS, dy = (pz.doorY + 0.5) * TS;
    sparks(dx, dy, PAL.bolt, 24); addTrauma(0.35); sfx('powerup'); fx.push({ k: 'r', x: dx, y: dy, t: 0.6, life: 0.6 });
    say(pz.perfect ? 'Perfekt! Dörren till skattkammaren öppnas.' : 'Dörren till skattkammaren öppnas!');
  }
  function openChest() {
    var pz = puzzle, ch = pz.chest, wi = Math.floor((level - 1) / 5) % 5, tier = Math.min(3, wi + 1 + lapOf(level)), n = 4 + wi + (pz.perfect ? 2 : 0);
    ch.taken = true; P.chestDone = level; P.wood += C.treasure.chestWood; addMetal(tier, n); P.moon += C.treasure.moon; P.moonEver = true;
    sfx('bossdown'); addTrauma(0.4); sparks(ch.x, ch.y, PAL.bolt, 30); fx.push({ k: 'r', x: ch.x, y: ch.y, t: 0.6, life: 0.6 });
    floatText(ch.x, ch.y - 30, '+' + n + ' ' + MET[tier].name, MET[tier].c2);
    floatText(ch.x - 34, ch.y - 12, '+' + C.treasure.chestWood + ' trä', '#d9a46a'); floatText(ch.x + 34, ch.y - 12, '+1 månsten', '#cfe6ff');
    say('Skatten! ' + n + ' ' + MET[tier].name + (pz.perfect ? ' (perfekt-bonus)' : '') + ', ' + C.treasure.chestWood + ' trä och en månsten.'); save();
  }

  function startLevel(n) {
    level = n; buildLevel(n, 0);
    P.x = 2.5 * TS; P.y = 3.5 * TS; P.inv = 1; camSnap = true; fx = []; texts = []; fade = 1; shots = []; P.slow = 0;
    state = 'play'; save(); sfx('level');
    if (n >= 2 && settings.guide) { settings.guide = false; applySettings(); }   // guiden behövs bara första gången
    var bossLvl = n % C.boss.every === 0 && P.bossDone !== n, firstInWorld = (n - 1) % 5 === 0;
    say(bossLvl ? 'Nivå ' + n + ': ' + biome.boss + ' väntar!' : (firstInWorld ? 'Välkommen till ' + biome.name + (lapOf(n) ? ', varv ' + (lapOf(n) + 1) : '') + '! ' : '') + 'Nivå ' + n + ': besegra ' + quota + ' monster');
    if (window.LJUD) LJUD.setBiome(biome.i);
    if (puzzle && !P.treasureSeen) { P.treasureSeen = true; say('En skattkammare finns på den här nivån! Leta efter en stängd dörr.'); save(); }
    if (n >= 6 && P.lamp === 0) { P.lamp = 1; say('Du hittade en lykta! Den lyser upp de mörka grottorna.'); powerUp(); save(); }
    bossIntro = bossLvl ? 2.4 : 0;
  }

  function newGame() { P = newPlayer(); settings.guide = true; applySettings(); if (window.LJUD) LJUD.duck(false); startLevel(1); }
  function continueGame(s) {
    P = newPlayer(); P.hearts = s.hearts; P.str = s.str; P.ore = s.ore; P.meat = s.meat; P.sword = Math.min(s.sword, C.weapon.maxSwordLevel); P.armor = s.armor || 0; if (s.armorV !== 2 && P.armor > 0) P.armor = [0, 3, 6, 10, 13, 16][Math.min(5, P.armor)]; /* äldre sparningar: samma skydd i nya skalan */ P.pick = s.pick || 0; P.lamp = s.lamp || 0; P.moon = s.moon || 0; P.moonEver = !!s.moonEver; P.bolts = s.bolts || 0; P.wood = s.wood || 0; P.stone = s.stone || 0; P.bossDone = s.bossDone || 0; P.chestDone = s.chestDone || 0; P.mined = s.mined || []; P.minedLevel = s.minedLevel || 0; P.iron = s.iron || 0; P.gold = s.gold || 0; P.star = s.star || 0; P.treasureSeen = !!s.treasureSeen; P.hp = maxHp();
    startLevel(s.level);
  }

  // ---------- rörelse och kollision ----------
  function blockedAt(px, py, r) {
    var x0 = Math.floor((px - r) / TS), x1 = Math.floor((px + r) / TS), y0 = Math.floor((py - r) / TS), y1 = Math.floor((py + r) / TS);
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) return true;
      if (solid(map[y][x])) return true;
      if (puzzle && puzzle.blocks && blockAt(x, y)) return true;   // tunga block
    }
    return false;
  }
  function move(o, dx, dy) {
    if (!blockedAt(o.x + dx, o.y, o.r)) o.x += dx;
    if (!blockedAt(o.x, o.y + dy, o.r)) o.y += dy;
  }

  // ---------- handlingar ----------
  function tileAt(px, py) { return { x: Math.floor(px / TS), y: Math.floor(py / TS) }; }

  function attack() {
    if (P.cd > 0 || state !== 'play') return;
    P.cd = C.player.attackCooldown; P.swing = 0.18; sfx('swing');
    var rc = reach(), hitAny = false, dmg = damage();
    mons.forEach(function (m) {
      if (m.hidden) return;                                    // bossen under sanden går inte att träffa
      var dx = m.x - P.x, dy = m.y - P.y, d = Math.hypot(dx, dy);
      if (d > rc + m.r) return;
      var dot = d > 0 ? (dx * P.fx + dy * P.fy) / d : 1;
      if (dot < 0.2 && d > m.r + 14) return;      // bara framför spelaren (generös båge)
      m.hp -= dmg; m.hit = 0.12; m.pop = 0; hitAny = true;
      var kb = C.monsters.knockback * (m.type === 'boss' ? 0.25 : 1);
      if (d > 0) { m.kx = dx / d * kb; m.ky = dy / d * kb; }
      sparks(m.x, m.y, PAL.bolt, 6);
      floatText(m.x, m.y - m.r - 8, fmt(dmg), '#ffffff');
    });
    if (hitAny) { addTrauma(0.32); freeze(0.05); sfx('hit'); }
    if (puzzle && !puzzle.solved) puzzleHit(rc);
    // hugg träd och hacka malm framför
    var tx = P.x + P.fx * (P.r + 10), ty = P.y + P.fy * (P.r + 10), t = tileAt(tx, ty);
    if (t.x >= 0 && t.y >= 0 && t.x < W && t.y < H) {
      var tile = map[t.y][t.x], key = t.x + ',' + t.y, cx2 = (t.x + 0.5) * TS, cy2 = (t.y + 0.5) * TS;
      if (tile === TREE) {
        treeHp[key] = (treeHp[key] == null ? C.crafting.treeHits : treeHp[key]) - (1 + Math.floor(P.pick / 2));
        sparks(cx2, cy2 - 6, '#8a5a2b', 6); sparks(cx2, cy2 - 8, '#3f8a38', 4); addTrauma(0.08); sfx('chop');
        if (treeHp[key] <= 0) {
          map[t.y][t.x] = GRASS; delete treeHp[key]; mapDirty = true; P.wood += C.crafting.woodPerTree; markMined(t.x, t.y);
          sparks(cx2, cy2, '#5aa64e', 14); sfx('ore'); floatText(cx2, t.y * TS, '+' + C.crafting.woodPerTree + ' trä', '#d9a46a'); save();
        }
      } else if (tile === STONE && breakableStone(t.x, t.y)) {   // grå sten inne på kartan ger sten
        stoneHp[key] = (stoneHp[key] == null ? C.crafting.stoneHits : stoneHp[key]) - 1;
        sparks(cx2, cy2, '#b4b8c2', 6); addTrauma(0.08); sfx('mine');
        if (stoneHp[key] <= 0) {
          map[t.y][t.x] = isCave[t.y][t.x] ? CAVE : GRASS; delete stoneHp[key]; mapDirty = true; P.stone += 1; markMined(t.x, t.y);
          sparks(cx2, cy2, '#9a9ea6', 14); sfx('ore'); floatText(cx2, t.y * TS, '+1 sten', '#d8dbe0'); save();
        }
      } else if (tile === ORE) {
        var ot = oreT[key] || 0;
        if (P.sword < 1) {                                     // malm kräver minst ett stensvärd
          sparks(cx2, cy2, '#cfd6e0', 5); sfx('deny');
          if (msgT <= 0 || msg.indexOf('stensvärd') < 0) say('Du behöver ett stensvärd för att bryta ' + MET[ot].name + '. Smid det vid ugnen.');
        } else if (P.pick < ot) {                                     // för hård malm: visar vad man behöver
          sparks(cx2, cy2, '#cfd6e0', 5); sfx('deny');
          if (msgT <= 0 || msg.indexOf('För hård') < 0) say('För hård! Du behöver en ' + PICK_NAME[ot] + ' för ' + MET[ot].name + '.');
        } else {
          oreHp[key] -= C.mining.hitsPerOre / Math.max(1, C.mining.hitsPerOre - (P.pick - ot));
          sparks(cx2, cy2, MET[ot].c2, 7); addTrauma(0.1); sfx('mine');
          if (oreHp[key] <= 0.001) {
            map[t.y][t.x] = isCave[t.y][t.x] ? CAVE : GRASS; delete oreHp[key]; mapDirty = true; markMined(t.x, t.y);
            sparks(cx2, cy2, '#9a9ea6', 12);
            var yieldN = C.mining.oreYield + (P.pick - ot >= 2 ? 1 : 0); addMetal(ot, yieldN); sfx('ore');
            floatText(cx2, t.y * TS, '+' + yieldN + ' ' + MET[ot].name, MET[ot].c2); save();
          }
        }
      }
    }
  }

  function useE() {
    if (state !== 'play') return;
    if (smeltPos && Math.hypot(smeltPos.x - P.x, smeltPos.y - P.y) < TS * 2) {
      openForge(); return;
    }
    if (P.meat > 0 && P.hp < maxHp()) {
      P.meat--; P.hp = Math.min(maxHp(), P.hp + C.items.meatHeal); say('Mums! + hälsa'); sparks(P.x, P.y, '#ff7a7a', 8); sfx('eat');
      floatText(P.x, P.y - 24, '+' + C.items.meatHeal, '#7dff8a'); save();
    } else if (P.meat > 0) say('Full hälsa'); else say('Ingen mat. Stå vid smältstationen för att smida.');
  }

  // ---------- effekter ----------
  function sparks(x, y, col, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.283, v = 40 + Math.random() * 140, life = 0.35 + Math.random() * 0.3;
      fx.push({ k: 'p', x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, t: life, life: life, col: col, s: 1.5 + Math.random() * 2.2 });
    }
  }
  function bolt(x1, y1, x2, y2, life) {
    fx.push({ k: 'b', x1: x1, y1: y1, x2: x2, y2: y2, t: 0.15 * life, seed: Math.random() * 1000 });
  }
  function drawBolt(x1, y1, x2, y2, seed, w) {
    var n = 6, dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    g.beginPath(); g.moveTo(x1, y1);
    for (var i = 1; i < n; i++) {
      var f = i / n, off = (Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453 % 1) * 14 * (w > 1.5 ? 1.4 : 1);
      g.lineTo(x1 + dx * f + nx * off, y1 + dy * f + ny * off);
    }
    g.lineTo(x2, y2);
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(255,225,77,0.35)'; g.lineWidth = w + 5; g.stroke();
    g.strokeStyle = '#fff6b0'; g.lineWidth = w; g.stroke();
    g.restore();
  }

  // ---------- uppdatering ----------
  function update(dt) {
    time += dt; if (msgT > 0) msgT -= dt;
    if (state !== 'play') return;
    P.cd -= dt; P.inv -= dt; P.swing -= dt; if (P.pu > 0) P.pu -= dt; if (P.slow > 0) P.slow -= dt; if (P.icy > 0) P.icy -= dt; if (bossIntro > 0) bossIntro -= dt;
    // gnistor runt gubben, fler ju starkare han är
    var pw = power();
    if (pw >= 1) {
      P.spk += dt * Math.min(1.2 + pw * 0.9, 12);
      while (P.spk >= 1) {
        P.spk -= 1;
        var sa = Math.random() * 6.283, sr = 8 + Math.random() * (10 + Math.min(pw, 12));
        fx.push({ k: 's', x: P.x + Math.cos(sa) * sr, y: P.y - 4 + Math.sin(sa) * sr * 0.8, vx: (Math.random() - 0.5) * 8, vy: -14 - Math.random() * 10,
          t: 0.7, life: 0.7, s: 1.6 + Math.random() * Math.min(1 + pw * 0.15, 2.4), col: pw >= 10 ? '#ffffff' : PAL.bolt });
      }
    }
    var ax = 0, ay = 0;
    if (keys.ArrowLeft || keys.a) ax -= 1; if (keys.ArrowRight || keys.d) ax += 1;
    if (keys.ArrowUp || keys.w) ay -= 1; if (keys.ArrowDown || keys.s) ay += 1;
    if (touch.joyId !== null && Math.hypot(touch.jx, touch.jy) > 0.18) { ax = touch.jx; ay = touch.jy; }
    P.moving = !!(ax || ay);
    if (ax || ay) {
      var l = Math.hypot(ax, ay), sp = Math.min(1, l * 1.4); ax /= l; ay /= l; P.fx = ax; P.fy = ay;
      var slowK = P.slow > 0 ? C.spider.slowFactor : 1;               // fast i spindelnät
      var tvx = ax * C.player.speed * sp * slowK, tvy = ay * C.player.speed * sp * slowK;
      if (P.icy > 0) { var ik = Math.min(1, 1.6 * dt); P.vx += (tvx - P.vx) * ik; P.vy += (tvy - P.vy) * ik; } else { P.vx = tvx; P.vy = tvy; }   // halt på is
      move(P, P.vx * dt, P.vy * dt);
      P.walk += dt * 12 * sp; if (level === 1) guideMoved += C.player.speed * sp * dt;
    } else if (mouse.has && mouse.down) {
      var mwp = toWorld(mouse.x, mouse.y), mdx = mwp.x - P.x, mdy = mwp.y - P.y, ml = Math.hypot(mdx, mdy) || 1; P.fx = mdx / ml; P.fy = mdy / ml;
    }
    if (!P.moving) {                                             // på is glider man vidare en stund
      if (P.icy > 0 && Math.abs(P.vx) + Math.abs(P.vy) > 5) { var fk = 1 - Math.min(1, 1.2 * dt); P.vx *= fk; P.vy *= fk; move(P, P.vx * dt, P.vy * dt); }
      else { P.vx = 0; P.vy = 0; }
    }
    if (window.LJUD) LJUD.setCave(isCave[clamp(Math.floor(P.y / TS), 0, H - 1)][clamp(Math.floor(P.x / TS), 0, W - 1)]);
    if (touch.atkId !== null && !P.moving) aimNearest();
    if (keys[' '] || mouse.down || touch.atkId !== null) attack();

    // monster
    mons.forEach(function (m) {
      m.hit -= dt; m.cd -= dt; m.pop += dt;
      var d = dist(m, P) || 0.01, inCave = isCave[clamp(Math.floor(m.y / TS), 0, H - 1)][clamp(Math.floor(m.x / TS), 0, W - 1)];
      if (m.type === 'boss') { updateBoss(m, dt, d); return; }
      var range = inCave ? C.monsters.caveAggroRange : C.monsters.aggroRange;
      if (m.type === 'spider' && spiderAI(m, dt, d)) return;
      var vx = m.kx, vy = m.ky; m.kx *= 0.85; m.ky *= 0.85;
      if (d < range) {
        var s = m.speed * (m.type === 'bat' ? 1 + 0.3 * Math.sin(time * 6 + m.ph) : 1);
        vx += (P.x - m.x) / d * s; vy += (P.y - m.y) / d * s;
      } else {
        vx += Math.cos(time * 0.7 + m.ph) * 12; vy += Math.sin(time * 0.9 + m.ph) * 12;
      }
      if (m.type === 'ghost') {                              // spöken svävar genom väggar
        m.x = clamp(m.x + vx * dt, TS * 1.5, WW - TS * 1.5); m.y = clamp(m.y + vy * dt, TS * 1.5, WH - TS * 1.5);
      } else {
        var ox = m.x, oy = m.y; move(m, vx * dt, vy * dt);
        if (m.x === ox && m.y === oy && d < range) {          // fastnat: försök glida runt hinder
          move(m, (P.y - m.y) / d * m.speed * dt, -(P.x - m.x) / d * m.speed * dt);
        }
      }
      if (d < m.r + P.r + 3 && m.cd <= 0 && P.inv <= 0) { m.cd = C.monsters.attackCooldown; hurtPlayer(m.dmg); }
    });
    // spindelnät i luften
    shots = shots.filter(function (sh) {
      sh.t -= dt; sh.x += sh.vx * dt; sh.y += sh.vy * dt;
      if (sh.t <= 0 || blockedAt(sh.x, sh.y, 2)) { sparks(sh.x, sh.y, '#e8e8f0', 4); return false; }
      if (Math.hypot(sh.x - P.x, sh.y - P.y) < P.r + 5) {
        P.slow = C.spider.slowTime; sparks(sh.x, sh.y, '#ffffff', 8); sfx('webhit');
        floatText(P.x, P.y - 40, 'fast i nät!', '#e8e8f0'); hurtPlayer(C.spider.shotDamage);
        return false;
      }
      return true;
    });
    if (state !== 'play') return;                              // spelaren kan ha dött av nätet
    // luft: snö, sand, glöd eller eldflugor beroende på värld
    if (biome.air) { ambientT -= dt; while (ambientT <= 0) { ambientT += AIR_RATE[biome.air]; spawnAir(); } }
    // tips: låg hälsa och kött i fickan
    if (eatHintT > 0) eatHintT -= dt;
    if (P.meat > 0 && P.hp <= maxHp() * 0.5 && eatHintT <= 0 && msgT <= 0) {
      say(touchMode ? 'Lite hälsa! Tryck på köttet för att äta.' : 'Lite hälsa! Tryck E för att äta kött.'); eatHintT = 25;
    }
    // döda
    mons = mons.filter(function (m) {
      if (m.hp > 0) return true;
      kills++; sparks(m.x, m.y, monColor(m), 18); sparks(m.x, m.y, PAL.bolt, 6);
      if (m.type === 'boss') { bossDefeated(m); return false; }
      addTrauma(0.3); freeze(0.08); sfx('kill');
      if (Math.random() < C.items.meatDropChance) items.push({ t: 'meat', x: m.x, y: m.y });
      if (m.type === 'ghost' && Math.random() < 0.05) items.push({ t: 'moon', x: m.x, y: m.y });   // sällsynt månsten
      return false;
    });
    // plocka upp
    items = items.filter(function (it) {
      if (Math.hypot(it.x - P.x, it.y - P.y) > 18) return true;
      if (it.t === 'meat') { if (P.meat >= C.items.maxMeat) return true; P.meat++; say('+ köttklubba'); sfx('meat'); floatText(it.x, it.y - 14, '+1 kött', '#ffb38a'); }
      else if (it.t === 'moon') { P.moon++; P.moonEver = true; say('Månsten! Lyktan kan bli starkare i smedjan.'); sfx('heart'); floatText(it.x, it.y - 14, '+1 månsten', '#cfe6ff'); }
      else if (it.t === 'ore') { var okk = it.k || 0; addMetal(okk, 1); sfx('ore'); floatText(it.x, it.y - 14, '+1 ' + MET[okk].name, MET[okk].c2); }
      else if (it.t === 'heart') {
        if (P.hearts >= C.items.maxHearts) { P.hp = maxHp(); say('Full hälsa! Du har redan max antal hjärtan'); floatText(it.x, it.y - 14, 'full hälsa', PAL.heart); }
        else { P.hearts += C.items.heartMaxHpGain; P.hp += C.player.hpPerHeart * C.items.heartMaxHpGain; say('+ hjärta! Maxhälsan ökade'); floatText(it.x, it.y - 14, '+ hjärta', PAL.heart); }
        sfx('heart');
      }
      else if (it.t === 'crystal') {
        P.str += C.items.crystalStrengthGain; P.bolts = Math.min(C.boltPower.max, P.bolts + 1);
        say('+ kristall! Blixtkraft ' + P.bolts + ' av ' + C.boltPower.max + (touchMode ? '. Tryck på Blixt.' : '. Tryck Q.'));
        floatText(it.x, it.y - 14, '+ blixt', PAL.bolt); powerUp();
      }
      sparks(it.x, it.y, '#ffffff', 12); save(); return false;
    });
    updatePuzzle(dt);
    // utgång
    var et = tileAt(P.x, P.y);
    if (map[et.y] && map[et.y][et.x] === EXIT) {
      if (kills >= quota) {
        P.hp = Math.min(maxHp(), P.hp + maxHp() * C.player.levelClearHeal);
        startLevel(level + 1);
      } else if (msgT <= 0) say('Portalen är låst: ' + (quota - kills) + ' monster kvar');
    }
    // effekter
    fx = fx.filter(function (f) {
      f.t -= dt;
      if (f.k === 'p') { var drag = Math.max(0, 1 - 3.5 * dt); f.vx *= drag; f.vy = f.vy * drag + 220 * dt; f.x += f.vx * dt; f.y += f.vy * dt; }
      else if (f.k === 's') { f.x += f.vx * dt; f.y += f.vy * dt; }
      else if (f.k === 'a') {
        f.x += (f.vx + (f.wob ? Math.sin(time * 2 + f.life * 7 + f.s * 3) * 12 : 0)) * dt; f.y += f.vy * dt;
        if (f.x < -10 || f.x > WW + 10 || f.y < -10 || f.y > WH + 10) f.t = 0;
      } else if (f.k === 'w') {                              // chockvåg från bossen
        var wr = f.R * (1 - f.t / f.life);
        var pd = Math.hypot(P.x - f.x, P.y - f.y);           // träffar alla som vågen har passerat, inom ringen
        if (!f.hitDone && pd < wr + 16 && pd <= f.R + 10) { f.hitDone = true; hurtPlayer(f.dmg); }
      }
      else if (f.k === 'rock') { if (f.t <= 0) { sparks(f.x, f.y, '#9a9ea6', 10); addTrauma(0.15); sfx('hit'); if (Math.hypot(P.x - f.x, P.y - f.y) < 24) hurtPlayer(f.dmg); } }
      else if (f.k === 'ice') { if (Math.hypot(P.x - f.x, P.y - f.y) < f.R) P.icy = 0.3; }
      else if (f.k === 'fire') { if (Math.hypot(P.x - f.x, P.y - f.y) < 13) hurtPlayer(f.dmg); }
      return f.t > 0;
    });
  }

  // saker som går i verklig tid, även under hit-stop
  function realUpdate(dt) {
    trauma = Math.max(0, trauma - 1.3 * dt); shakeT += dt * 30; if (P) updateCamera(dt);
    if (fade > 0) fade = Math.max(0, fade - dt * 2.2);
    if (confirmNew > 0) confirmNew = Math.max(0, confirmNew - dt);
    if (stormT > 0) stormT = Math.max(0, stormT - dt);
    if (guideShowT > 0) guideShowT -= dt;
    texts = texts.filter(function (t) { t.t += dt; t.y -= 32 * dt; t.x += t.vx * dt; return t.t < t.life; });
  }

  // på pekskärm finns ingen mus att sikta med: vänd dig mot närmaste monster inom räckhåll
  function aimNearest() {
    var best = null, bd = reach() * 1.8;
    mons.forEach(function (m) { if (m.hidden) return; var d = dist(m, P); if (d < bd) { bd = d; best = m; } });
    if (best && bd > 0) { P.fx = (best.x - P.x) / bd; P.fy = (best.y - P.y) / bd; }
  }

  // ---------- v2.2: skada, boss, spindel, luft ----------
  function monColor(m) { return m.type === 'boss' ? biome.bossColor : C.monsters[m.type].color; }
  function hurtPlayer(dmg) {                                  // rustningen minskar all skada
    if (P.inv > 0 || state !== 'play') return false;
    var d = dmg * (1 - C.upgrades.armor.reducePerLevel * P.armor);
    P.hp -= d; P.inv = C.player.invulnAfterHit;
    addTrauma(0.5); sparks(P.x, P.y, '#ff4d4d', 10); sfx('hurt');
    floatText(P.x, P.y - 26, '-' + fmt(d), '#ff6b6b');
    if (P.hp <= 0) die();
    return true;
  }
  function updateBoss(m, dt, d) {
    var B = C.boss, Df = DF(), sp = m.speed * (m.phase2 ? 1.35 : 1);
    if (bossIntro > 0) return;                                    // väntar medan namnet visas
    m.aiT -= dt;
    var kx = m.kx, ky = m.ky; m.kx *= 0.8; m.ky *= 0.8;
    if (m.kind === 'demon' && (m.ai === 'walk' || m.ai === 'charge')) {   // Lavaherren lämnar eld efter sig
      m.fireT = (m.fireT || 0) - dt;
      if (m.fireT <= 0) { m.fireT = m.ai === 'charge' ? 0.08 : 0.35; fx.push({ k: 'fire', x: m.x, y: m.y + m.r * 0.6, t: 3, life: 3, dmg: m.dmg * 0.3 }); }
    }
    if (m.ai === 'walk') {
      move(m, ((P.x - m.x) / d * sp + kx) * dt, ((P.y - m.y) / d * sp + ky) * dt);
      if (m.aiT <= 0 && d < 400) {                                // välj anfall, alltid med varning först
        var opts = ['windCharge', 'windSlam'];
        if (m.phase2) opts.push('windRain');
        if (m.kind === 'scorpion') opts.push('burrow');
        var pick = (d > 220 && m.kind !== 'scorpion') ? 'windCharge' : opts[Math.floor(Math.random() * opts.length)];
        m.ai = pick; m.aiT = { windCharge: 0.75, windSlam: 0.85, windRain: 0.7, burrow: 0.5 }[pick] * Df.wind;
        m.dirx = (P.x - m.x) / d; m.diry = (P.y - m.y) / d;
        m.chain = m.kind === 'ape' ? (m.phase2 ? 3 : 2) : 0;       // Djungeljätten rusar flera gånger
      }
    } else if (m.ai === 'windCharge') {
      m.dirx = (P.x - m.x) / d; m.diry = (P.y - m.y) / d;
      if (m.aiT <= 0) { m.ai = 'charge'; m.aiT = 0.65; sfx('charge'); }
    } else if (m.ai === 'charge') {
      var cs = B.chargeSpeed * (m.phase2 ? 1.15 : 1), ox = m.x, oy = m.y;
      move(m, m.dirx * cs * dt, m.diry * cs * dt);
      if (Math.random() < 0.5) sparks(m.x, m.y + m.r * 0.8, shade(biome.ground[0], -0.3), 1);
      var stuck = m.x === ox && m.y === oy;
      if (stuck || m.aiT <= 0) {
        if (!stuck && m.chain > 1) { m.chain--; m.ai = 'windCharge'; m.aiT = 0.35 * Df.wind; }
        else { m.ai = 'stun'; m.aiT = stuck ? 1.4 : 0.5; if (stuck) { addTrauma(0.4); sfx('slam'); } }
      }
    } else if (m.ai === 'windSlam') {
      if (m.aiT <= 0) {
        m.ai = 'stun'; m.aiT = 0.7; addTrauma(0.6); sfx('slam');
        fx.push({ k: 'w', x: m.x, y: m.y + 6, t: 0.5, life: 0.5, R: B.slamRadius, hitDone: false, dmg: m.dmg * 0.8 });
        if (m.kind === 'yeti') fx.push({ k: 'ice', x: m.x, y: m.y + 6, t: 5, life: 5, R: B.slamRadius * 0.9 });   // Isjätten fryser marken
      }
    } else if (m.ai === 'windRain') {                             // stenregn: skuggor visar var stenarna landar
      if (m.aiT <= 0) {
        m.ai = 'stun'; m.aiT = 0.9; sfx('summon');
        var nRocks = 5 + (Df.minions - 3);
        for (var ri = 0; ri < nRocks; ri++) {
          var rx = ri === 0 ? P.x : clamp(P.x + (Math.random() - 0.5) * 220, TS * 1.5, WW - TS * 1.5);
          var ry = ri === 0 ? P.y : clamp(P.y + (Math.random() - 0.5) * 160, TS * 1.5, WH - TS * 1.5);
          fx.push({ k: 'rock', x: rx, y: ry, t: 1 + ri * 0.12, life: 1 + ri * 0.12, dmg: m.dmg * 0.6 });
        }
      }
    } else if (m.ai === 'burrow') {                               // Sandkungen gräver ned sig
      if (m.aiT <= 0) { m.ai = 'under'; m.aiT = 1.6; m.hidden = 1; sfx('charge'); }
    } else if (m.ai === 'under') {
      move(m, (P.x - m.x) / d * sp * 2.2 * dt, (P.y - m.y) / d * sp * 2.2 * dt);
      if (Math.random() < 0.6) sparks(m.x, m.y + 6, '#d9b56a', 1);
      if (m.aiT <= 0) { m.ai = 'emerge'; m.aiT = 0.7 * Df.wind; m.ex = P.x; m.ey = P.y; }
    } else if (m.ai === 'emerge') {                               // dyker upp där spelaren stod
      if (m.aiT <= 0) {
        if (!blockedAt(m.ex, m.ey, m.r)) { m.x = m.ex; m.y = m.ey; }
        m.hidden = 0; m.ai = 'stun'; m.aiT = 1; addTrauma(0.6); sfx('slam'); sparks(m.x, m.y, '#e2c07a', 24);
        if (Math.hypot(P.x - m.x, P.y - m.y) < 46) hurtPlayer(m.dmg * 1.2);
      }
    } else if (m.aiT <= 0) { m.ai = 'walk'; m.aiT = (Df.gap[0] + Math.random() * (Df.gap[1] - Df.gap[0])) * (m.phase2 ? 0.7 : 1); }
    if (!m.hidden && d < m.r + P.r + 3 && m.cd <= 0 && hurtPlayer(m.ai === 'charge' ? m.dmg * 1.4 : m.dmg)) m.cd = 0.8;
    if (!m.phase2 && m.hp < m.maxHp / 2) {                        // andra fasen: snabbare, stenregn och hjälpare
      m.phase2 = true; say(biome.boss + ' blir rasande och kallar på hjälp!'); sfx('summon'); addTrauma(0.5);
      for (var i = 0; i < Df.minions + lapOf(level); i++) {
        var k = i % 2 ? 'bat' : 'slime', md = C.monsters[k], a = i * 2.1 + 0.5;
        var x = m.x + Math.cos(a) * 44, y = m.y + Math.sin(a) * 44;
        if (blockedAt(x, y, md.radius)) { x = m.x; y = m.y; }
        var hp = (md.hpBase + md.hpPerLevel * level * 0.6) * Df.mHp;
        mons.push({ type: k, x: x, y: y, r: md.radius, hp: hp, maxHp: hp, dmg: (md.dmgBase + md.dmgPerLevel * level * 0.6) * Df.mDmg,
          speed: Math.min(md.maxSpeed, md.speed + md.speedPerLevel * level), cd: 0.5, kx: 0, ky: 0, hit: 0, pop: 0, ph: Math.random() * 6 });
        quota++; sparks(x, y, '#c9bfff', 12);
      }
    }
  }
  function bossDefeated(m) {
    P.bossDone = level; save();                                   // bossen kommer inte tillbaka vid omladdning
    addTrauma(1); freeze(0.15); sfx('bossdown');
    sparks(m.x, m.y, PAL.bolt, 30); fx.push({ k: 'r', x: m.x, y: m.y, t: 0.6, life: 0.6 });
    say(biome.boss + ' är besegrad!');
    function drop(t, x, y) { if (blockedAt(x, y, 4)) { x = m.x; y = m.y; } items.push({ t: t, x: x, y: y }); }
    for (var i = 0; i < C.boss.rewardOre; i++) { var a = i / C.boss.rewardOre * 6.283; drop('ore', m.x + Math.cos(a) * 26, m.y + Math.sin(a) * 26); items[items.length - 1].k = Math.min(3, Math.floor((level - 1) / 5) % 5 + (i % 2) + lapOf(level)); }
    drop('heart', m.x - 10, m.y); drop('crystal', m.x + 10, m.y); drop('moon', m.x, m.y + 14);
  }
  function spiderAI(m, dt, d) {                               // håller avstånd och skjuter nät
    var S = C.spider; if (d > S.range) return false;
    m.shot = (m.shot == null ? 1 : m.shot) - dt;
    var want = d < 110 ? -1 : d > 170 ? 1 : 0, side = Math.sin(time * 1.3 + m.ph) > 0 ? 1 : -1;
    var ux = (P.x - m.x) / d, uy = (P.y - m.y) / d;
    var vx = (ux * want - uy * side * 0.6) * m.speed + m.kx, vy = (uy * want + ux * side * 0.6) * m.speed + m.ky;
    m.kx *= 0.85; m.ky *= 0.85; move(m, vx * dt, vy * dt);
    if (m.shot <= 0) {
      m.shot = S.shotCooldown * (0.8 + Math.random() * 0.4);
      shots.push({ x: m.x, y: m.y, vx: ux * S.shotSpeed, vy: uy * S.shotSpeed, t: 2 }); sfx('web');
    }
    if (d < m.r + P.r + 3 && m.cd <= 0 && P.inv <= 0) { m.cd = C.monsters.attackCooldown; hurtPlayer(m.dmg); }
    return true;
  }
  function spawnAir() {
    var a = biome.air, f;
    if (a === 'snow') f = { x: Math.random() * WW, y: -4, vx: (Math.random() - 0.5) * 20, vy: 30 + Math.random() * 25, t: 14, s: 1.2 + Math.random() * 1.6, col: 'rgba(255,255,255,0.9)', wob: 1 };
    else if (a === 'sand') f = { x: -4, y: Math.random() * WH, vx: 70 + Math.random() * 40, vy: (Math.random() - 0.5) * 10, t: 14, s: 1 + Math.random(), col: 'rgba(235,205,150,0.75)' };
    else if (a === 'embers') f = { x: Math.random() * WW, y: WH + 4, vx: (Math.random() - 0.5) * 16, vy: -30 - Math.random() * 30, t: 12, s: 1 + Math.random() * 1.5, col: 'rgba(255,140,40,0.9)', glow: 1, wob: 1 };
    else f = { x: Math.random() * WW, y: 40 + Math.random() * (WH - 60), vx: (Math.random() - 0.5) * 14, vy: (Math.random() - 0.5) * 14, t: 6, s: 1.6, col: 'rgba(210,255,120,0.95)', glow: 1, blink: 1, wob: 1 };
    f.k = 'a'; f.life = f.t; fx.push(f);
  }

  function castStorm() {                                     // blixtkraft: en laddning slår ned blixtar på alla monster
    if (state !== 'play') return;
    if (P.bolts <= 0) { say('Ingen blixtkraft. Hitta kristaller!'); sfx('deny'); return; }
    P.bolts--; save();
    var BP = C.boltPower, dmg = BP.damageBase + BP.damagePerLevel * level, hits = 0;
    mons.forEach(function (m) {
      if (m.hidden) return;
      m.hp -= dmg; m.hit = 0.2; m.pop = 0; hits++;
      bolt(m.x + (Math.random() - 0.5) * 40, -10, m.x, m.y, 3);
      sparks(m.x, m.y, PAL.bolt, 10); floatText(m.x, m.y - m.r - 10, fmt(dmg), PAL.bolt);
    });
    stormT = 0.5; addTrauma(0.8); freeze(0.1); sfx('storm'); P.pu = 0.6;
    say(hits ? 'Blixtstorm! ' + hits + ' träffar' : 'Blixtstorm!');
  }

  function die() {
    state = 'dead'; deadAt = performance.now();
    var kp = DF().keep; P.ore = Math.floor(P.ore * kp); P.iron = Math.floor(P.iron * kp); P.gold = Math.floor(P.gold * kp); P.star = Math.floor(P.star * kp); P.wood = Math.floor(P.wood * kp); P.stone = Math.floor(P.stone * kp); save();
    addTrauma(1); sparks(P.x, P.y, '#ffffff', 26); sfx('death');
  }

  // ---------- skala till fönstret (skarp grafik på alla skärmar) ----------
  var RS = 1, RSW = 1, mapDirty = true, vignette = null;   // RS = vyns upplösning, RSW = världens
  var miniCv = document.createElement('canvas'), mn = miniCv.getContext('2d');   // liten karta i hörnet (mobil)
  var mapCv = document.createElement('canvas'), mg = mapCv.getContext('2d');
  var caveCv = document.createElement('canvas'), cg = caveCv.getContext('2d');
  var lightCv = document.createElement('canvas'), lg = lightCv.getContext('2d');
  var canCv = document.createElement('canvas'), ng = canCv.getContext('2d');   // djungelns lövtak
  var oreTiles = [], smeltPos = null, exitPos = null;

  function resize() {
    var dpr = window.devicePixelRatio || 1, cw = window.innerWidth, ch = window.innerHeight, unit;
    PHONE = Math.min(cw, ch) < 520;                              // mobil: liten skärm
    if (PHONE) {                                                 // vyn fyller skärmen, kameran zoomar in och följer gubben
      LH = 430; LW = Math.max(200, Math.round(LH * cw / ch)); unit = ch / LH;
      ZW = clamp(42 / (TS * unit), 1, 2.2);                      // en ruta blir ungefär 42 skärmpixlar
      cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    } else {                                                     // dator och platta: hela kartan som förut
      LW = WW; LH = WH; unit = Math.min(cw / LW, ch / LH); if (!(unit > 0)) unit = 1; ZW = 1;
      cv.style.width = Math.floor(LW * unit) + 'px'; cv.style.height = Math.floor(LH * unit) + 'px';
    }
    BOX.s = Math.min(LW / 960, LH / 576); BOX.ox = (LW - 960 * BOX.s) / 2; BOX.oy = (LH - 576 * BOX.s) / 2;
    layoutButtons();
    var rs = clamp(unit * dpr, 1, 3), rsw = clamp(rs * ZW, 1, PHONE ? 2.2 : 3);
    if (Math.abs(rs - RS) > 0.01 || Math.abs(rsw - RSW) > 0.01 || cv.width !== Math.round(LW * rs) || cv.height !== Math.round(LH * rs)) {
      RS = rs; RSW = rsw; cv.width = Math.round(LW * RS); cv.height = Math.round(LH * RS); mapDirty = true; vignette = null;
    }
    camSnap = true;
  }
  function layoutButtons() {                                     // pekknappar sitter i vyns hörn
    BTN_ATK.x = LW - 96; BTN_ATK.y = LH - 96; BTN_E.x = LW - 214; BTN_E.y = LH - 66;
    BTN_PAUSE.x = LW - 30; BTN_BOLT.x = LW - 96; BTN_BOLT.y = LH - 202;
  }
  // kamera, skärm och värld
  function camTarget() {
    var vw = LW / ZW, vh = LH / ZW;
    var mg2 = PHONE ? 4 * TS : 0;                               // på mobil får kameran gå lite utanför kanten, så att gubben inte hamnar under knapparna
    return { x: vw >= WW ? (WW - vw) / 2 : clamp(P.x - vw / 2, -mg2, WW - vw + mg2), y: vh >= WH ? (WH - vh) / 2 : clamp(P.y - vh / 2, -mg2, WH - vh + mg2) };
  }
  function updateCamera(dt) {
    var t = camTarget();
    if (camSnap) { camX = t.x; camY = t.y; camSnap = false; }
    else { var k = Math.min(1, dt * 7); camX += (t.x - camX) * k; camY += (t.y - camY) * k; }
  }
  function toScreen(x, y) { return { x: (x - camX) * ZW, y: (y - camY) * ZW }; }
  function toWorld(x, y) { return { x: x / ZW + camX, y: y / ZW + camY }; }
  function toBox(q) { return { x: (q.x - BOX.ox) / BOX.s, y: (q.y - BOX.oy) / BOX.s }; }
  function inBox960(fn) {                                        // menyer ritas i sin 960 x 576-ruta, skalad till skärmen
    var lw = LW, lh = LH;
    if (BOX.ox > 0.5 || BOX.oy > 0.5) { g.fillStyle = 'rgba(8,16,10,0.55)'; g.fillRect(0, 0, LW, LH); }
    LW = 960; LH = 576;
    g.save(); g.translate(BOX.ox, BOX.oy); g.scale(BOX.s, BOX.s);
    try { fn(); } finally { g.restore(); LW = lw; LH = lh; }
  }
  function drawMinimap() {                                       // liten karta: portal, monster, föremål, vad kameran ser
    var mw = 150, mh = mw * WH / WW, x = LW - mw - 12, y = 46, k = mw / WW;
    g.save(); g.globalAlpha = 0.92;
    tag(x - 5, y - 5, mw + 10, mh + 10);
    g.drawImage(miniCv, x, y, mw, mh); g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(x, y, mw, mh);
    if (exitPos) { g.fillStyle = kills >= quota ? '#c9bfff' : '#8a8a8a'; g.beginPath(); g.arc(x + exitPos.x * k, y + exitPos.y * k, 3.5, 0, 7); g.fill(); }
    items.forEach(function (it) {
      if (it.t !== 'moon' && it.t !== 'crystal' && it.t !== 'heart') return;
      g.fillStyle = it.t === 'moon' ? '#dcecff' : it.t === 'heart' ? PAL.heart : '#8ff0ff'; g.fillRect(x + it.x * k - 1.6, y + it.y * k - 1.6, 3.2, 3.2);
    });
    mons.forEach(function (m) {
      if (m.hidden) return; var b = m.type === 'boss';
      g.fillStyle = b ? '#ff3b3b' : '#ff8a7a'; g.beginPath(); g.arc(x + m.x * k, y + m.y * k, b ? 3.6 : 1.6, 0, 7); g.fill();
    });
    if (puzzle && puzzle.found && !puzzle.chest.taken) { g.fillStyle = '#ffd23f'; g.fillRect(x + puzzle.chest.x * k - 3, y + puzzle.chest.y * k - 3, 6, 6); }
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x + P.x * k, y + P.y * k, 2.8, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,225,77,0.85)'; g.lineWidth = 1; g.strokeRect(x + Math.max(0, camX) * k, y + Math.max(0, camY) * k, Math.min(WW, LW / ZW) * k, Math.min(WH, LH / ZW) * k);
    g.restore();
  }
  window.addEventListener('resize', resize);

  // ---------- kartan ritas en gång per nivå ----------
  function renderMapCache() {
    var pw = Math.round(WW * RSW), ph = Math.round(WH * RSW), x, y;
    [mapCv, caveCv, lightCv, canCv].forEach(function (c) { if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; } });
    mg.setTransform(RSW, 0, 0, RSW, 0, 0); mg.clearRect(0, 0, WW, WH);
    oreTiles = []; smeltPos = null; exitPos = null;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) drawGround(mg, x, y);
    drawCaveRims(mg);
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var t = map[y][x];
      if (t === ORE) oreTiles.push({ x: x, y: y });
      else if (t === SMELT) smeltPos = { x: (x + 0.5) * TS, y: (y + 0.5) * TS };
      else if (t === EXIT) exitPos = { x: (x + 0.5) * TS, y: (y + 0.5) * TS };
      drawObject(mg, t, x, y);
    }
    // mörker över grottorna, mjuka kanter
    cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, pw, ph);
    cg.setTransform(RSW, 0, 0, RSW, 0, 0);
    cg.filter = 'blur(' + Math.round(9 * RSW) + 'px)';
    cg.fillStyle = 'rgba(6,7,18,' + CAVE_DARK[biome.i] + ')';
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (isCave[y][x]) cg.fillRect(x * TS - 3, y * TS - 3, TS + 6, TS + 6);
    cg.filter = 'none';
    ng.setTransform(1, 0, 0, 1, 0, 0); ng.clearRect(0, 0, pw, ph);
    if (biome.canopy) {                                          // skugga från trädkronor med ljusfläckar och lianer
      ng.setTransform(RSW, 0, 0, RSW, 0, 0);
      ng.fillStyle = 'rgba(6,34,10,0.34)'; ng.fillRect(0, 0, WW, WH);
      ng.globalCompositeOperation = 'destination-out';
      for (var ci = 0; ci < 28; ci++) {
        var lx = hash(ci, 3, 300) * WW, ly = hash(ci, 5, 301) * WH, lr = 30 + hash(ci, 7, 302) * 55;
        var lgr = ng.createRadialGradient(lx, ly, lr * 0.2, lx, ly, lr); lgr.addColorStop(0, 'rgba(0,0,0,0.9)'); lgr.addColorStop(1, 'rgba(0,0,0,0)');
        ng.fillStyle = lgr; ng.beginPath(); ng.arc(lx, ly, lr, 0, 7); ng.fill();
      }
      ng.globalCompositeOperation = 'source-over';
      for (ci = 0; ci < 20; ci++) {
        var vx = hash(ci, 9, 303) * WW, vl = 24 + hash(ci, 11, 304) * 70;
        ng.strokeStyle = '#1f5a22'; ng.lineWidth = 2; ng.beginPath(); ng.moveTo(vx, 0); ng.quadraticCurveTo(vx + 8, vl * 0.5, vx, vl); ng.stroke();
        ng.fillStyle = '#2f7a2a'; for (var lf = 8; lf < vl; lf += 10) { ng.beginPath(); ng.ellipse(vx + (lf % 20 ? 4 : -4), lf, 4.5, 2, lf % 20 ? 0.6 : -0.6, 0, 7); ng.fill(); }
      }
      for (ci = 0; ci < 14; ci++) {                              // stora blad längs kanterna
        var side = ci % 4, bx2 = side === 0 ? hash(ci, 1, 305) * WW : side === 1 ? hash(ci, 1, 305) * WW : side === 2 ? 0 : WW;
        var by2 = side === 0 ? 0 : side === 1 ? WH : hash(ci, 2, 306) * WH, ba = Math.atan2(WH / 2 - by2, WW / 2 - bx2);
        ng.save(); ng.translate(bx2, by2); ng.rotate(ba);
        ng.fillStyle = ci % 2 ? '#1c4f1f' : '#2a6a28'; ng.beginPath(); ng.ellipse(22, 0, 26, 9, 0, 0, 7); ng.fill();
        ng.strokeStyle = 'rgba(120,200,100,0.35)'; ng.lineWidth = 1; ng.beginPath(); ng.moveTo(0, 0); ng.lineTo(46, 0); ng.stroke(); ng.restore();
      }
    }
    miniCv.width = 300; miniCv.height = 180; mn.clearRect(0, 0, 300, 180); mn.drawImage(mapCv, 0, 0, 300, 180);
    mapDirty = false;
  }

  function drawGround(c, x, y) {
    var px = x * TS, py = y * TS, r = hash(x, y, 1), i, a, b;
    if (puzzle && x > puzzle.x0 && x < puzzle.x0 + 6 && y > puzzle.ry && y < puzzle.ry + 3) {   // skattkammarens stengolv
      c.fillStyle = r < 0.5 ? '#8a8578' : '#938e80'; c.fillRect(px, py, TS, TS); c.strokeStyle = 'rgba(40,35,30,0.45)'; c.lineWidth = 1;
      c.strokeRect(px + 0.5, py + 0.5, TS / 2, TS / 2); c.strokeRect(px + TS / 2 + 0.5, py + TS / 2 + 0.5, TS / 2 - 1, TS / 2 - 1); return;
    }
    if (isCave[y][x]) {
      c.fillStyle = biome.cave[r < 0.5 ? 0 : 1]; c.fillRect(px, py, TS, TS);
      for (i = 0; i < 4; i++) {
        a = hash(x, y, 10 + i); b = hash(x, y, 20 + i);
        c.fillStyle = i === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(170,180,255,0.06)';
        c.beginPath(); c.ellipse(px + 4 + a * 24, py + 4 + b * 24, 1.5 + a * 2.5, 1 + b * 1.5, 0, 0, 7); c.fill();
      }
      return;
    }
    c.fillStyle = biome.ground[Math.floor(r * 4)]; c.fillRect(px, py, TS, TS);
    a = hash(x, y, 2);
    c.fillStyle = a < 0.5 ? 'rgba(255,255,170,0.045)' : 'rgba(0,40,0,0.06)';
    c.beginPath(); c.ellipse(px + 16, py + 16, 14 + a * 6, 10 + a * 4, a * 3, 0, 7); c.fill();
    c.lineWidth = 1.2; c.lineCap = 'round';
    for (i = 0; i < 5; i++) {
      var bx = px + 3 + hash(x, y, 30 + i) * 26, by = py + 7 + hash(x, y, 40 + i) * 23, lean = (hash(x, y, 50 + i) - 0.5) * 5;
      c.strokeStyle = biome.blade[i % 2];
      c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + lean, by - 3.5 - hash(x, y, 60 + i) * 3.5); c.stroke();
    }
    if (biome.flowers && hash(x, y, 70) < 0.07) {        // små blommor
      var fx_ = px + 6 + hash(x, y, 71) * 20, fy_ = py + 6 + hash(x, y, 72) * 20;
      c.fillStyle = biome.flowers[Math.floor(hash(x, y, 73) * biome.flowers.length)];
      for (i = 0; i < 5; i++) { c.beginPath(); c.arc(fx_ + Math.cos(i * 1.257) * 2, fy_ + Math.sin(i * 1.257) * 2, 1.4, 0, 7); c.fill(); }
      c.fillStyle = '#e0a020'; c.beginPath(); c.arc(fx_, fy_, 1.1, 0, 7); c.fill();
    }
    if (biome.canopy && hash(x, y, 77) < 0.16) {               // ormbunkar i djungeln
      var fxb = px + 6 + hash(x, y, 78) * 20, fyb = py + 20 + hash(x, y, 79) * 8;
      c.strokeStyle = '#1d5a1f'; c.lineWidth = 1.6; c.lineCap = 'round';
      for (i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(fxb, fyb); c.quadraticCurveTo(fxb + i * 4, fyb - 10, fxb + i * 7, fyb - 12 + Math.abs(i) * 3); c.stroke(); }
    }
    if (biome.cracks && hash(x, y, 74) < 0.16) {           // glödande sprickor i lavalandet
      var kx = px + 4 + hash(x, y, 75) * 22, ky = py + 4 + hash(x, y, 76) * 20;
      c.lineCap = 'round'; c.beginPath(); c.moveTo(kx, ky); c.lineTo(kx + 6, ky + 3); c.lineTo(kx + 9, ky + 9); c.moveTo(kx + 6, ky + 3); c.lineTo(kx + 12, ky + 1);
      c.strokeStyle = 'rgba(255,200,80,0.3)'; c.lineWidth = 4; c.stroke(); c.strokeStyle = 'rgba(255,110,30,0.9)'; c.lineWidth = 1.6; c.stroke();
    }
  }

  function drawCaveRims(c) {
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      if (!isCave[y][x]) continue;
      var px = x * TS, py = y * TS;
      [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(function (d) {
        var nx = x + d[0], ny = y + d[1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || isCave[ny][nx]) return;
        c.fillStyle = 'rgba(0,0,0,0.35)';                 // inre skugga
        if (d[1] === -1) c.fillRect(px, py, TS, 6); else if (d[1] === 1) c.fillRect(px, py + TS - 3, TS, 3);
        else if (d[0] === -1) c.fillRect(px, py, 5, TS); else c.fillRect(px + TS - 5, py, 5, TS);
        c.fillStyle = biome.rim;                          // stenkant ut mot marken
        for (var i = 0; i < 4; i++) {
          var k = (i + 0.5) / 4 * TS, rr_ = 3 + hash(x * 4 + i, y, 77 + d[0] * 3 + d[1]) * 2.5;
          var ex = d[0] === 0 ? px + k : (d[0] === -1 ? px : px + TS), ey = d[1] === 0 ? py + k : (d[1] === -1 ? py : py + TS);
          c.beginPath(); c.arc(ex, ey, rr_, 0, 7); c.fill();
        }
      });
    }
  }

  function boulder(c, cx, cy, rw, rh, light, dark, seed) {
    c.fillStyle = 'rgba(0,0,0,0.28)'; c.beginPath(); c.ellipse(cx + 3, cy + rh * 0.8, rw * 1.02, rh * 0.42, 0, 0, 7); c.fill();
    c.beginPath();
    for (var i = 0; i < 9; i++) {
      var a = i / 9 * Math.PI * 2, k = 0.84 + hash(seed, i, 80) * 0.24;
      var px = cx + Math.cos(a) * rw * k, py = cy + Math.sin(a) * rh * k;
      if (i) c.lineTo(px, py); else c.moveTo(px, py);
    }
    c.closePath();
    var gr = c.createLinearGradient(cx, cy - rh, cx, cy + rh); gr.addColorStop(0, light); gr.addColorStop(1, dark);
    c.fillStyle = gr; c.fill(); c.strokeStyle = 'rgba(10,12,20,0.55)'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.2)'; c.beginPath(); c.ellipse(cx - rw * 0.3, cy - rh * 0.4, rw * 0.32, rh * 0.18, -0.3, 0, 7); c.fill();
  }

  function drawTree(c, x, y, px, py) {                        // träd ser olika ut i varje värld
    var s = 0.85 + hash(x, y, 90) * 0.3, cx = px + 16 + (hash(x, y, 91) - 0.5) * 4, cy = py + 13, i;
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(cx + 4, py + 28, 13 * s, 5, 0, 0, 7); c.fill();
    if (biome.tree === 'cactus') {
      c.fillStyle = '#3f8f4a';
      rr(c, cx - 4, py + 6, 8, 22, 4); c.fill(); rr(c, cx - 12, py + 11, 5, 10, 2.5); c.fill(); rr(c, cx - 12, py + 18, 10, 4, 2); c.fill();
      rr(c, cx + 7, py + 8, 5, 10, 2.5); c.fill(); rr(c, cx + 2, py + 15, 10, 4, 2); c.fill();
      c.strokeStyle = '#2a6a34'; c.lineWidth = 1;
      for (i = -2; i <= 2; i += 2) { c.beginPath(); c.moveTo(cx + i, py + 8); c.lineTo(cx + i, py + 27); c.stroke(); }
      if (hash(x, y, 92) < 0.3) { c.fillStyle = '#ff7ab0'; c.beginPath(); c.arc(cx, py + 6, 2.5, 0, 7); c.fill(); }
      return;
    }
    if (biome.tree === 'dead') {
      c.strokeStyle = '#1e1513'; c.lineCap = 'round'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(cx, py + 28); c.lineTo(cx, py + 10); c.stroke();
      c.lineWidth = 2; c.beginPath(); c.moveTo(cx, py + 16); c.lineTo(cx - 9, py + 8); c.moveTo(cx, py + 13); c.lineTo(cx + 8, py + 5); c.moveTo(cx - 5, py + 12); c.lineTo(cx - 7, py + 4); c.stroke();
      c.fillStyle = 'rgba(255,120,40,0.7)'; c.beginPath(); c.arc(cx + 8, py + 5, 1.4, 0, 7); c.fill();
      return;
    }
    c.fillStyle = '#5b3a1e'; c.fillRect(cx - 3, py + 15, 6, 13); c.fillStyle = '#43290f'; c.fillRect(cx + 1, py + 15, 2, 13);
    if (biome.tree === 'pine') {
      for (i = 0; i < 3; i++) {
        var w = (13 - i * 3.5) * s, ty = py + 20 - i * 6;
        c.fillStyle = '#1f4f35'; c.beginPath(); c.moveTo(cx - w, ty); c.lineTo(cx, ty - 10 * s); c.lineTo(cx + w, ty); c.closePath(); c.fill();
        c.fillStyle = '#f4f8fc'; c.beginPath(); c.moveTo(cx - w * 0.55, ty - 4 * s); c.lineTo(cx, ty - 10 * s); c.lineTo(cx + w * 0.55, ty - 4 * s); c.closePath(); c.fill();
      }
      return;
    }
    var leaf = biome.tree === 'jungle' ? ['#14401a', '#1f5a22', '#2f7a2a', '#4f9a3c'] : ['#1d4a1b', '#2e6b2a', '#3f8a38', '#5aa64e'];
    c.fillStyle = leaf[0]; c.beginPath(); c.arc(cx + 1, cy + 2, 13.5 * s, 0, 7); c.fill();
    c.fillStyle = leaf[1]; c.beginPath(); c.arc(cx, cy, 12 * s, 0, 7); c.fill();
    c.fillStyle = leaf[2]; c.beginPath(); c.arc(cx - 3 * s, cy - 3 * s, 8 * s, 0, 7); c.fill();
    c.fillStyle = leaf[3]; c.beginPath(); c.arc(cx - 5 * s, cy - 6 * s, 3.5 * s, 0, 7); c.fill();
    if (biome.tree === 'jungle') {                              // lianer
      c.strokeStyle = '#2f6a22'; c.lineWidth = 1.4;
      for (i = 0; i < 2; i++) { var lx = cx - 7 + i * 12; c.beginPath(); c.moveTo(lx, cy + 4); c.quadraticCurveTo(lx + 3, cy + 12, lx, cy + 17); c.stroke(); }
    } else if (hash(x, y, 92) < 0.25) {                         // äpplen
      c.fillStyle = '#e0413a';
      for (i = 0; i < 3; i++) { c.beginPath(); c.arc(cx - 6 + hash(x, y, 93 + i) * 12, cy - 4 + hash(x, y, 96 + i) * 10, 1.8, 0, 7); c.fill(); }
    }
  }

  function drawObject(c, t, x, y) {
    var px = x * TS, py = y * TS, i;
    if (t === STONE) {
      var big = 11 + hash(x, y, 81) * 3;
      boulder(c, px + 16, py + 17, big, big * 0.82, biome.stone[0], biome.stone[1], x * 31 + y);
    } else if (t === TREE) {
      drawTree(c, x, y, px, py);
    } else if (t === ORE) {
      var MM = MET[oreT[x + ',' + y] || 0];
      boulder(c, px + 16, py + 17, 14, 12, '#6b6f7a', '#3a3d47', x * 17 + y * 5);
      for (i = 0; i < 3; i++) {
        var ox = px + 8 + hash(x, y, 100 + i) * 15, oy = py + 9 + hash(x, y, 110 + i) * 13, r = 2.6 + hash(x, y, 120 + i) * 1.8;
        c.fillStyle = MM.c3; c.beginPath(); c.moveTo(ox, oy - r); c.lineTo(ox + r, oy); c.lineTo(ox, oy + r); c.lineTo(ox - r, oy); c.closePath(); c.fill();
        c.fillStyle = MM.c2; c.beginPath(); c.moveTo(ox, oy - r * 0.8); c.lineTo(ox + r * 0.7, oy - 0.2); c.lineTo(ox, oy + r * 0.5); c.lineTo(ox - r * 0.7, oy - 0.2); c.closePath(); c.fill();
        c.fillStyle = MM.c1; c.fillRect(ox - 1, oy - r * 0.6, 1.5, 1.5);
      }
    } else if (t === DOOR) {                                     // skattkammarens dörr med runa
      c.fillStyle = '#5c6069'; c.fillRect(px, py, TS, TS);
      rr(c, px + 4, py + 3, TS - 8, TS - 3, 4); c.fillStyle = '#6b4220'; c.fill(); c.strokeStyle = '#2a1a0c'; c.lineWidth = 1.5; c.stroke();
      c.strokeStyle = '#8a5a2b'; c.lineWidth = 1; for (i = 0; i < 3; i++) { c.beginPath(); c.moveTo(px + 9 + i * 7, py + 5); c.lineTo(px + 9 + i * 7, py + TS - 1); c.stroke(); }
      c.strokeStyle = '#ffe14d'; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(px + 16, py + 9); c.lineTo(px + 12, py + 17); c.lineTo(px + 20, py + 17); c.lineTo(px + 16, py + 25); c.stroke();
    } else if (t === SMELT) {
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(px + 18, py + 29, 15, 4.5, 0, 0, 7); c.fill();
      rr(c, px + 2, py + 3, TS - 4, TS - 5, 5);
      var sg = c.createLinearGradient(0, py, 0, py + TS); sg.addColorStop(0, '#8a766b'); sg.addColorStop(1, '#4e403a');
      c.fillStyle = sg; c.fill(); c.strokeStyle = '#2b211d'; c.lineWidth = 1.5; c.stroke();
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1;          // tegelfogar
      for (i = 0; i < 3; i++) { c.beginPath(); c.moveTo(px + 3, py + 9 + i * 7); c.lineTo(px + TS - 3, py + 9 + i * 7); c.stroke(); }
      c.fillStyle = '#1e1310'; c.beginPath(); c.moveTo(px + 9, py + 27); c.lineTo(px + 9, py + 17); c.arc(px + 16, py + 17, 7, Math.PI, 0); c.lineTo(px + 23, py + 27); c.closePath(); c.fill();
      c.fillStyle = '#5e4c44'; c.fillRect(px + 21, py - 4, 6, 9);   // skorsten
    }
  }

  // smältugnens eld, portalen och glittrande malm ändras varje bildruta
  function drawDynamicTiles() {
    var i;
    oreTiles.forEach(function (o) {
      if (map[o.y][o.x] !== ORE) return;
      var tw = Math.sin(time * 2.3 + hash(o.x, o.y, 99) * 40);
      if (tw > 0.96) {
        var sx = o.x * TS + 8 + hash(o.x, o.y, 100) * 15, sy = o.y * TS + 9 + hash(o.x, o.y, 110) * 13, k = (tw - 0.96) * 25 * 4;
        g.strokeStyle = 'rgba(255,250,210,0.9)'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(sx - k, sy); g.lineTo(sx + k, sy); g.moveTo(sx, sy - k); g.lineTo(sx, sy + k); g.stroke();
      }
    });
    if (smeltPos) {
      var fxp = smeltPos.x, fyp = smeltPos.y + 8;
      if (state === 'play' && canBuyAny()) {                    // ugnen visar ! när du har råd med något
        var ey2 = smeltPos.y - 36 + Math.sin(time * 5) * 3;
        g.save(); g.globalCompositeOperation = 'lighter'; glow(smeltPos.x, ey2, 18, '255,225,77', 0.4); g.restore();
        g.fillStyle = PAL.bolt; g.beginPath(); g.arc(smeltPos.x, ey2, 9, 0, 7); g.fill();
        g.fillStyle = '#1a2a1a'; g.font = 'bold 14px ' + TXT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', smeltPos.x, ey2 + 1); g.textAlign = 'left';
      }
      for (i = 0; i < 4; i++) {
        var fl = Math.sin(time * 13 + i * 2.1) * 1.5, h = 7 + Math.sin(time * 9 + i) * 2;
        g.fillStyle = ['#ff6a1a', '#ff9a2a', '#ffd36a', '#fff3b0'][i];
        g.beginPath(); g.ellipse(fxp + (i - 1.5) * 1.6 + fl * 0.5, fyp - i * 0.8, 6 - i * 1.2, h - i * 1.3, 0, 0, 7); g.fill();
      }
      if (state === 'play' && hitStop <= 0 && Math.random() < 0.3) fx.push({ k: 'p', x: smeltPos.x + 8, y: smeltPos.y - 18, vx: (Math.random() - 0.5) * 10, vy: -30, t: 0.8, life: 0.8, col: 'rgba(120,110,105,0.5)', s: 2.5 + Math.random() * 2 });
    }
    if (exitPos) {
      var open = kills >= quota, ex = exitPos.x, ey = exitPos.y;
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(ex + 2, ey + 14, 13, 4, 0, 0, 7); g.fill();
      var pg = g.createRadialGradient(ex, ey, 2, ex, ey, 15);
      pg.addColorStop(0, open ? '#e6e0ff' : '#8a8a8a'); pg.addColorStop(0.5, open ? '#7a6bff' : '#555'); pg.addColorStop(1, open ? '#2b1e8a' : '#2a2a2a');
      g.fillStyle = pg; g.beginPath(); g.ellipse(ex, ey, 13, 15, 0, 0, 7); g.fill();
      g.strokeStyle = open ? 'rgba(220,210,255,0.8)' : 'rgba(150,150,150,0.5)'; g.lineWidth = 1.6;
      for (i = 0; i < 3; i++) {                             // virvel
        var a0 = time * (open ? 3 : 0.6) + i * 2.094;
        g.beginPath(); g.ellipse(ex, ey, 9 - i * 2, 11 - i * 2.5, 0, a0, a0 + 2.2); g.stroke();
      }
      g.strokeStyle = '#1b1530'; g.lineWidth = 2; g.beginPath(); g.ellipse(ex, ey, 13, 15, 0, 0, 7); g.stroke();
      if (!open) {                                          // hänglås
        g.fillStyle = '#d9b24a'; rr(g, ex - 5, ey - 1, 10, 8, 2); g.fill();
        g.strokeStyle = '#d9b24a'; g.lineWidth = 2; g.beginPath(); g.arc(ex, ey - 1, 3.5, Math.PI, 0); g.stroke();
      } else if (state === 'play' && hitStop <= 0 && Math.random() < 0.25) {
        fx.push({ k: 'p', x: ex + (Math.random() - 0.5) * 20, y: ey + 10, vx: 0, vy: -60, t: 0.6, life: 0.6, col: '#c9bfff', s: 1.6 });
      }
    }
  }

  // ---------- ljus ----------
  function hole(x, y, r, a) {
    var gr = lg.createRadialGradient(x, y, r * 0.2, x, y, r);
    gr.addColorStop(0, 'rgba(0,0,0,' + a + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    lg.fillStyle = gr; lg.beginPath(); lg.arc(x, y, r, 0, 7); lg.fill();
  }
  function glow(x, y, r, col, a) {
    var gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(' + col + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  function drawLighting() {
    var pw = lightCv.width, ph = lightCv.height, pw_ = Math.min(power(), 12);
    lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, pw, ph);
    lg.drawImage(caveCv, 0, 0);
    lg.setTransform(RSW, 0, 0, RSW, 0, 0); lg.globalCompositeOperation = 'destination-out';
    hole(P.x, P.y, 100 + pw_ * 6 + P.lamp * C.upgrades.lantern.lightPerLevel, 1);   // lyktan ger mer ljus
    if (smeltPos) hole(smeltPos.x, smeltPos.y, 80, 0.9);
    if (exitPos) hole(exitPos.x, exitPos.y, 60, 0.7);
    items.forEach(function (it) { if (it.t !== 'meat') hole(it.x, it.y, 36, 0.7); });
    lg.globalCompositeOperation = 'source-over';
    g.drawImage(lightCv, 0, 0, WW, WH);
    g.save(); g.globalCompositeOperation = 'lighter';
    if (smeltPos) glow(smeltPos.x, smeltPos.y + 6, 60, '255,140,40', 0.22 + Math.sin(time * 11) * 0.04);
    if (exitPos && kills >= quota) glow(exitPos.x, exitPos.y, 46, '140,120,255', 0.3);
    items.forEach(function (it) { if (it.t === 'crystal') glow(it.x, it.y, 26, '110,230,255', 0.3); else if (it.t === 'heart') glow(it.x, it.y, 22, '255,77,106', 0.22); });
    g.restore();
  }
  function drawCaveEyes() {                               // i mörka grottor syns bara ögonen på avstånd
    g.save(); g.globalCompositeOperation = 'lighter';
    mons.forEach(function (m) {
      var cx = clamp(Math.floor(m.x / TS), 0, W - 1), cy = clamp(Math.floor(m.y / TS), 0, H - 1);
      if (!isCave[cy][cx] || dist(m, P) < 120 + P.lamp * C.upgrades.lantern.lightPerLevel) return;
      var blink = Math.sin(time * 1.3 + m.ph * 3) > 0.97 ? 0.2 : 1;
      g.fillStyle = 'rgba(255,60,60,' + 0.95 * blink + ')';
      g.beginPath(); g.ellipse(m.x - 4, m.y - 2, 2.2, 1.6 * blink + 0.2, 0, 0, 7); g.ellipse(m.x + 4, m.y - 2, 2.2, 1.6 * blink + 0.2, 0, 0, 7); g.fill();
      glow(m.x, m.y - 2, 10, '255,40,40', 0.25);
    });
    g.restore();
  }

  // ---------- figurer ----------
  function shadow(x, y, rw, a) { g.fillStyle = 'rgba(0,0,0,' + (a || 0.3) + ')'; g.beginPath(); g.ellipse(x, y, rw, rw * 0.35, 0, 0, 7); g.fill(); }

  function stick(x, y, fx_, fy_, swing, armed, walk, moving) {
    var lg_ = moving ? Math.sin(walk) * 5 : 0, bob = moving ? Math.abs(Math.cos(walk)) * 1.2 : 0;
    var ang = Math.atan2(fy_, fx_) + (swing > 0 ? (0.18 - swing) * 8 - 0.7 : 0);
    var hx = x + fx_ * 9, hy = y - 2 - bob + fy_ * 6;
    function body(col, w) {
      g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.arc(x, y - 14 - bob, 5, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(x, y - 9 - bob); g.lineTo(x, y + 3 - bob);
      g.moveTo(x, y + 3 - bob); g.lineTo(x - 5 + lg_, y + 12); g.moveTo(x, y + 3 - bob); g.lineTo(x + 5 - lg_, y + 12);
      g.moveTo(x, y - 6 - bob); g.lineTo(hx, hy);
      g.moveTo(x, y - 6 - bob); g.lineTo(x - fx_ * 6 - lg_ * 0.4, y - 1 - bob - fy_ * 2);
      g.stroke();
    }
    body('rgba(10,20,10,0.55)', 5.5);                    // kontur
    body(PAL.chalk, 2.6);
    if (armed) drawWeapon(hx, hy, ang, armed);
  }

  function swordLook(l) {                                       // svärdet ser ut som sitt material
    if (l <= 2) return { col: '#9a9ea6', edge: '#e1e4ea', glow: null, stone: true };
    if (l <= 5) return { col: '#e0763a', edge: '#ffc49a', glow: null };
    if (l <= 8) return { col: '#c9d0da', edge: '#ffffff', glow: l >= 8 ? 'rgba(210,225,255,0.18)' : null };
    if (l <= 11) return { col: '#f0c94a', edge: '#fff1a8', glow: 'rgba(255,225,77,0.25)' };
    return { col: '#6ab8ff', edge: '#e6f5ff', glow: 'rgba(120,190,255,0.35)', star: true };
  }
  function drawWeapon(hx, hy, ang, a) {
    var ca = Math.cos(ang), sa = Math.sin(ang), L = a.len;
    if (!a.sword) {                                       // pinne
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 5; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + ca * L, hy + sa * L); g.stroke();
      g.strokeStyle = '#8a5a2b'; g.lineWidth = 3; g.stroke();
      g.fillStyle = '#6b4220'; g.beginPath(); g.arc(hx + ca * L * 0.6, hy + sa * L * 0.6, 1.6, 0, 7); g.fill();
      return;
    }
    var px = -sa, py = ca, bx = hx + ca * 4, by = hy + sa * 4;
    g.beginPath();                                         // klinga
    g.moveTo(bx + px * 2.4, by + py * 2.4); g.lineTo(hx + ca * (L - 5) + px * 2, hy + sa * (L - 5) + py * 2);
    g.lineTo(hx + ca * L, hy + sa * L); g.lineTo(hx + ca * (L - 5) - px * 2, hy + sa * (L - 5) - py * 2);
    g.lineTo(bx - px * 2.4, by - py * 2.4); g.closePath();
    g.fillStyle = a.col; g.fill(); g.strokeStyle = 'rgba(10,15,30,0.7)'; g.lineWidth = 1.2; g.stroke();
    g.strokeStyle = a.edge || 'rgba(255,255,255,0.75)'; g.lineWidth = 0.9;
    g.beginPath(); g.moveTo(bx + px * 0.6, by + py * 0.6); g.lineTo(hx + ca * (L - 4), hy + sa * (L - 4)); g.stroke();
    if (a.stone) {                                         // stenklinga med prickar
      g.fillStyle = 'rgba(60,62,70,0.7)';
      for (var gi = 0; gi < 4; gi++) { var f0 = 0.3 + gi * 0.15, sg2 = gi % 2 ? 0.8 : -0.8; g.beginPath(); g.arc(hx + ca * L * f0 + px * sg2, hy + sa * L * f0 + py * sg2, 0.9, 0, 7); g.fill(); }
    }
    if (a.star && Math.sin(time * 9) > 0.3) {               // stjärnsvärdet glittrar
      var sf = 0.35 + 0.55 * ((Math.sin(time * 2.7) + 1) / 2), sxp = hx + ca * L * sf, syp = hy + sa * L * sf;
      g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.beginPath(); g.moveTo(sxp - 3, syp); g.lineTo(sxp + 3, syp); g.moveTo(sxp, syp - 3); g.lineTo(sxp, syp + 3); g.stroke();
    }
    g.strokeStyle = '#8a6a2a'; g.lineWidth = 3; g.lineCap = 'round';   // parerstång
    g.beginPath(); g.moveTo(bx + px * 5, by + py * 5); g.lineTo(bx - px * 5, by - py * 5); g.stroke();
    if (a.glow) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = a.glow; g.lineWidth = 6;
      g.beginPath(); g.moveTo(bx, by); g.lineTo(hx + ca * L, hy + sa * L); g.stroke(); g.restore();
    }
  }

  // Rustningen växer: 1 bröstplåt, 2 axelskydd, 3 hjälm, 4 blått stål med plym, 5 guld som glimmar
  // Rustningen har fyra delar (0 bröstplåt, 1 hjälm, 2 axelskydd, 3 benskydd) som byggs och byts en i taget.
  var ARMOR_MAT = [{ col: '#e0763a', dark: '#7a3414' }, { col: '#c9d0da', dark: '#545c6a' }, { col: '#f0c94a', dark: '#a8781f' }, { col: '#6ab8ff', dark: '#2a5aa0' }];
  var ARMOR_PART = ['Bröstplåt', 'Hjälm', 'Axelskydd', 'Benskydd'];
  function armorPartTier(p, a) { a = a == null ? P.armor : a; return a < p + 1 ? -1 : Math.min(3, Math.floor((a - p - 1) / 4)); }
  function drawArmor() {
    var a = P.armor; if (a <= 0) return;
    var bob = P.moving ? Math.abs(Math.cos(P.walk)) * 1.2 : 0, lgw = P.moving ? Math.sin(P.walk) * 5 : 0, x = P.x, y = P.y - bob, M, s;
    g.lineJoin = 'round'; g.lineWidth = 1.2; g.lineCap = 'round';
    var tl = armorPartTier(3);                                   // benskydd
    if (tl >= 0) {
      M = ARMOR_MAT[tl]; g.lineWidth = 3.4;
      for (s = -1; s <= 1; s += 2) {
        var fx2 = x + s * 5 - s * lgw, k1 = 0.45, k2 = 0.9;
        g.strokeStyle = M.dark; g.lineWidth = 4.4; g.beginPath(); g.moveTo(x + (fx2 - x) * k1, y + 3 + 9 * k1 + bob * k1); g.lineTo(x + (fx2 - x) * k2, y + 3 + 9 * k2 + bob * k2); g.stroke();
        g.strokeStyle = M.col; g.lineWidth = 2.8; g.stroke();
      }
      g.lineWidth = 1.2;
    }
    var tc = armorPartTier(0);                                   // bröstplåt
    if (tc >= 0) {
      M = ARMOR_MAT[tc];
      g.beginPath(); g.moveTo(x - 5, y - 9); g.lineTo(x + 5, y - 9); g.lineTo(x + 4, y + 1); g.quadraticCurveTo(x, y + 4, x - 4, y + 1); g.closePath();
      g.fillStyle = M.col; g.fill(); g.strokeStyle = M.dark; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.moveTo(x - 2.5, y - 7); g.lineTo(x - 2.5, y - 1); g.stroke();
    }
    var ts = armorPartTier(2);                                   // axelskydd
    if (ts >= 0) {
      M = ARMOR_MAT[ts];
      for (s = -1; s <= 1; s += 2) { g.beginPath(); g.ellipse(x + s * 5.5, y - 8, 3.4, 2.6, 0, Math.PI, 0); g.closePath(); g.fillStyle = M.col; g.fill(); g.strokeStyle = M.dark; g.stroke(); }
    }
    var th = armorPartTier(1);                                   // hjälm
    if (th >= 0) {
      M = ARMOR_MAT[th];
      g.beginPath(); g.arc(x, y - 14, 6.3, Math.PI * 1.02, Math.PI * 1.98); g.lineTo(x + 6.3, y - 13); g.lineTo(x - 6.3, y - 13); g.closePath();
      g.fillStyle = M.col; g.fill(); g.strokeStyle = M.dark; g.stroke();
      g.fillStyle = M.dark; g.fillRect(x - 0.8, y - 14, 1.6, 4);
      if (th >= 2) { g.fillStyle = th >= 3 ? '#ff4d6a' : '#e8eef5'; g.beginPath(); g.moveTo(x, y - 20); g.quadraticCurveTo(x + 5, y - 26, x + 1, y - 27); g.quadraticCurveTo(x - 2, y - 24, x, y - 20); g.fill(); }
    }
    var lowest = Math.min(tl, tc, ts, th);                       // hel rustning av guld eller bättre glimmar
    if (lowest >= 2) { g.save(); g.globalCompositeOperation = 'lighter'; glow(x, y - 4, 20, lowest >= 3 ? '120,190,255' : '255,210,80', 0.12 + 0.08 * Math.sin(time * 4)); g.restore(); }
  }

  function drawPlayer() {
    var pw = power(), armed;
    if (P.sword === 0) armed = { len: 20 };
    else { var sl = swordLook(P.sword); armed = { sword: true, len: 22 + Math.min(P.sword, 10) * 1.5, col: sl.col, edge: sl.edge, glow: sl.glow, wood: sl.wood, star: sl.star }; }
    shadow(P.x, P.y + 12, 9, 0.32);
    var faded = P.inv > 0 && state === 'play' && Math.floor(time * 20) % 2;
    g.save(); if (faded) g.globalAlpha = 0.35;
    // kraften syns som ett sken som växer med styrkan (gnistorna kommer från update)
    if (pw >= 1 || P.pu > 0) {
      var pk = P.pu > 0 ? P.pu / 0.6 : 0, pulse = 0.85 + 0.15 * Math.sin(time * 3);
      g.save(); g.globalCompositeOperation = 'lighter';
      glow(P.x, P.y - 3, 18 + Math.min(pw, 12) * 2 + pk * 22, '255,225,77', (Math.min(0.05 + 0.025 * pw, 0.3) + pk * 0.45) * pulse);
      g.restore();
    }
    // svepbåge när man slår
    if (P.swing > 0) {
      var k = P.swing / 0.18, a0 = Math.atan2(P.fy, P.fx);
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      g.strokeStyle = 'rgba(255,250,220,' + (0.45 * k) + ')'; g.lineWidth = 7 * k + 1;
      g.beginPath(); g.arc(P.x, P.y - 2, reach() * 0.75, a0 - 0.9 + (1 - k) * 0.6, a0 + 0.3 + (1 - k) * 0.9); g.stroke();
      g.restore();
    }
    stick(P.x, P.y, P.fx, P.fy, P.swing, armed, P.walk, P.moving);
    drawArmor();
    if (P.slow > 0) {                                          // fast i nät
      g.save(); g.globalAlpha = Math.min(1, P.slow); g.strokeStyle = 'rgba(235,235,245,0.85)'; g.lineWidth = 1;
      for (var wi = 0; wi < 5; wi++) { var wa = wi * 1.26; g.beginPath(); g.moveTo(P.x + Math.cos(wa) * 14, P.y - 2 + Math.sin(wa) * 14); g.lineTo(P.x - Math.cos(wa) * 14, P.y - 2 - Math.sin(wa) * 14); g.stroke(); }
      g.beginPath(); g.arc(P.x, P.y - 2, 9, 0, 7); g.stroke(); g.restore();
    }
    g.restore();
  }

  function eyes(x, y, gap, r, pr) {
    var d = Math.hypot(P.x - x, P.y - y) || 1, lx = (P.x - x) / d * r * 0.45, ly = (P.y - y) / d * r * 0.45;
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x - gap, y, r, 0, 7); g.arc(x + gap, y, r, 0, 7); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(x - gap + lx, y + ly, pr, 0, 7); g.arc(x + gap + lx, y + ly, pr, 0, 7); g.fill();
  }

  function drawMonsters() {
    mons.forEach(function (m) {
      var d = m.type === 'boss' ? { color: biome.bossColor } : C.monsters[m.type], flash = m.hit > 0, white = flash && FXC.flash !== false;
      var col = white ? '#ffffff' : flash ? shade(d.color, 0.35) : d.color;
      if (m.type === 'boss' && (m.ai === 'windCharge' || m.ai === 'windSlam') && Math.sin(time * 25) > 0) col = '#ff6b5a';   // varning
      var k = clamp(m.pop / 0.18, 0, 1), e = easeOutBack(k), sx = 1, sy = 1;
      if (k < 1) { sx = 1.3 + (1 - 1.3) * e; sy = 0.7 + (1 - 0.7) * e; }
      var fly = (m.type === 'bat' || m.type === 'ghost') ? 6 + Math.sin(time * 4 + m.ph) * 2 : 0;
      shadow(m.x, m.y + m.r * 0.85 + (fly ? 4 : 0), m.r * (fly ? 0.7 : 1), fly ? 0.2 : 0.3);
      if (m.elite) { g.save(); g.globalCompositeOperation = 'lighter'; glow(m.x, m.y - fly, m.r * 2.2, '200,120,255', 0.32 + 0.1 * Math.sin(time * 5 + m.ph)); g.restore(); }
      g.save(); g.translate(m.x, m.y + m.r); g.scale(sx, sy); g.translate(-m.x, -(m.y + m.r) - fly);
      if (m.type === 'boss') { drawBoss(m, white); } else if (m.type === 'slime') {
        var wob = 0.8 + 0.1 * Math.sin(time * 6 + m.ph), r = m.r, cy = m.y + 2;
        var gr = g.createRadialGradient(m.x - r * 0.4, cy - r * 0.5, 1, m.x, cy, r * 1.2);
        gr.addColorStop(0, shade(col, 0.45)); gr.addColorStop(1, shade(col, -0.3));
        g.fillStyle = gr; g.beginPath(); g.ellipse(m.x, cy, r, r * wob, 0, 0, 7); g.fill();
        g.strokeStyle = shade(d.color, -0.6); g.lineWidth = 1.6; g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(m.x - r * 0.45, cy - r * 0.45 * wob, r * 0.25, r * 0.15, -0.5, 0, 7); g.fill();
        eyes(m.x, cy - 2, 4, 2.6, 1.3);
      } else if (m.type === 'bat') {
        var f = Math.sin(time * 18 + m.ph), wing = white ? '#eeeeee' : shade(d.color, -0.35);
        g.fillStyle = wing; g.strokeStyle = shade(d.color, -0.7); g.lineWidth = 1;
        [-1, 1].forEach(function (s) {
          g.beginPath(); g.moveTo(m.x + s * 3, m.y - 2);
          g.quadraticCurveTo(m.x + s * 10, m.y - 12 - f * 6, m.x + s * 17, m.y - 5 - f * 6);
          g.lineTo(m.x + s * 13, m.y + 1 - f * 2); g.lineTo(m.x + s * 10, m.y - 1 - f * 1.5); g.lineTo(m.x + s * 6, m.y + 3); g.closePath();
          g.fill(); g.stroke();
        });
        g.fillStyle = col; g.beginPath(); g.ellipse(m.x, m.y, 6, 7, 0, 0, 7); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(m.x - 4, m.y - 5); g.lineTo(m.x - 3, m.y - 10); g.lineTo(m.x - 1, m.y - 6);
        g.moveTo(m.x + 4, m.y - 5); g.lineTo(m.x + 3, m.y - 10); g.lineTo(m.x + 1, m.y - 6); g.fill();
        g.fillStyle = '#ff4d4d'; g.beginPath(); g.arc(m.x - 2.3, m.y - 2, 1.6, 0, 7); g.arc(m.x + 2.3, m.y - 2, 1.6, 0, 7); g.fill();
        g.fillStyle = '#fff'; g.fillRect(m.x - 2, m.y + 2.5, 1, 2); g.fillRect(m.x + 1, m.y + 2.5, 1, 2);
      } else if (m.type === 'spider') {
        var lgp = Math.sin(time * 14 + m.ph) * 2;
        g.strokeStyle = shade(d.color, -0.4); g.lineWidth = 1.6; g.lineCap = 'round';
        for (var li = 0; li < 4; li++) {
          for (var sd = -1; sd <= 1; sd += 2) {
            var ly = m.y - 4 + li * 3, o = li % 2 ? lgp : -lgp;
            g.beginPath(); g.moveTo(m.x + sd * 4, ly); g.quadraticCurveTo(m.x + sd * 11, ly - 6 + o, m.x + sd * 14, ly + 4 + o); g.stroke();
          }
        }
        g.fillStyle = col; g.beginPath(); g.ellipse(m.x, m.y + 4, 7, 8, 0, 0, 7); g.fill();
        g.fillStyle = shade(col, 0.15); g.beginPath(); g.arc(m.x, m.y - 5, 5, 0, 7); g.fill();
        g.fillStyle = '#ff3b3b'; [-2.5, -1, 1, 2.5].forEach(function (ex) { g.beginPath(); g.arc(m.x + ex, m.y - 6, 0.9, 0, 7); g.fill(); });
        g.fillStyle = '#d6203f'; g.beginPath(); g.moveTo(m.x, m.y + 1); g.lineTo(m.x + 2.5, m.y + 4); g.lineTo(m.x, m.y + 7); g.lineTo(m.x - 2.5, m.y + 4); g.closePath(); g.fill();
      } else if (m.type === 'ghost') {
        var wv = time * 6 + m.ph;
        g.globalAlpha = 0.72 + 0.15 * Math.sin(time * 3 + m.ph);
        g.fillStyle = col; g.beginPath(); g.moveTo(m.x - 10, m.y + 8); g.lineTo(m.x - 10, m.y - 2); g.arc(m.x, m.y - 2, 10, Math.PI, 0); g.lineTo(m.x + 10, m.y + 8);
        for (var wi2 = 0; wi2 < 4; wi2++) { var wx = m.x + 10 - (wi2 + 0.5) * 5; g.quadraticCurveTo(wx + 1, m.y + 12 + Math.sin(wv + wi2) * 2, wx - 2.5, m.y + 8); }
        g.closePath(); g.fill(); g.strokeStyle = 'rgba(80,90,140,0.6)'; g.lineWidth = 1.2; g.stroke();
        g.fillStyle = '#1a1a2e'; g.beginPath(); g.ellipse(m.x - 3.5, m.y - 3, 2, 3, 0, 0, 7); g.ellipse(m.x + 3.5, m.y - 3, 2, 3, 0, 0, 7); g.fill();
        g.beginPath(); g.ellipse(m.x, m.y + 3, 2, 1.6, 0, 0, 7); g.fill();
        g.globalAlpha = 1;
      } else {
        var r2 = m.r, arm = Math.sin(time * 5 + m.ph) * 2;
        g.fillStyle = shade(d.color, -0.25); g.strokeStyle = shade(d.color, -0.65); g.lineWidth = 1.6;
        g.beginPath(); g.arc(m.x - r2 - 2, m.y + 3 + arm, 5, 0, 7); g.fill(); g.stroke();
        g.beginPath(); g.arc(m.x + r2 + 2, m.y + 3 - arm, 5, 0, 7); g.fill(); g.stroke();
        g.beginPath(); g.ellipse(m.x, m.y + 1, r2 * 1.05, r2 * 0.95, 0, 0, 7);   // rund kropp, ingen låda
        var bg = g.createLinearGradient(0, m.y - r2, 0, m.y + r2); bg.addColorStop(0, shade(col, 0.25)); bg.addColorStop(1, shade(col, -0.35));
        g.fillStyle = bg; g.fill(); g.stroke();
        g.fillStyle = '#efe3c4'; [-1, 1].forEach(function (s) {           // horn
          g.beginPath(); g.moveTo(m.x + s * (r2 - 6), m.y - r2 + 1); g.quadraticCurveTo(m.x + s * (r2 + 2), m.y - r2 - 4, m.x + s * (r2 + 1), m.y - r2 - 10);
          g.lineTo(m.x + s * (r2 - 1), m.y - r2 + 2); g.closePath(); g.fill();
        });
        g.fillStyle = '#ffd23f'; g.fillRect(m.x - 8, m.y - 5, 5, 4); g.fillRect(m.x + 3, m.y - 5, 5, 4);
        g.fillStyle = '#1a0a0a'; g.fillRect(m.x - 6, m.y - 4, 2, 2.5); g.fillRect(m.x + 4, m.y - 4, 2, 2.5);
        g.strokeStyle = '#1a0a0a'; g.lineWidth = 2; g.beginPath();
        g.moveTo(m.x - 9, m.y - 8); g.lineTo(m.x - 3, m.y - 6); g.moveTo(m.x + 9, m.y - 8); g.lineTo(m.x + 3, m.y - 6); g.stroke();
        g.fillStyle = '#2a0c0c'; rr(g, m.x - 6, m.y + 3, 12, 5, 2); g.fill();
        g.fillStyle = '#fff'; g.fillRect(m.x - 4, m.y + 3, 2, 2); g.fillRect(m.x + 2, m.y + 3, 2, 2);
      }
      g.restore();
      if (m.type === 'boss') drawBossExtras(m);
      if (m.hp < m.maxHp && m.type !== 'boss') {
        var bw = 26, bx = m.x - bw / 2, by = m.y - m.r - 12 - fly;
        rr(g, bx - 1, by - 1, bw + 2, 6, 3); g.fillStyle = 'rgba(20,5,5,0.85)'; g.fill();
        var hpk = Math.max(0, m.hp / m.maxHp);
        if (hpk > 0) { rr(g, bx, by, bw * hpk, 4, 2); g.fillStyle = hpk > 0.5 ? '#ff6b5a' : '#ff3b3b'; g.fill(); }
      }
    });
  }

  function heartPath(c, x, y, s) {
    c.beginPath(); c.moveTo(x, y + s * 0.8);
    c.bezierCurveTo(x - s * 1.4, y - s * 0.2, x - s * 0.6, y - s * 1.2, x, y - s * 0.4);
    c.bezierCurveTo(x + s * 0.6, y - s * 1.2, x + s * 1.4, y - s * 0.2, x, y + s * 0.8);
  }
  function crystalShape(x, y, s) {
    g.fillStyle = '#3cb8d8'; g.beginPath(); g.moveTo(x, y - 10 * s); g.lineTo(x + 7 * s, y); g.lineTo(x, y + 10 * s); g.closePath(); g.fill();
    g.fillStyle = '#9ff3ff'; g.beginPath(); g.moveTo(x, y - 10 * s); g.lineTo(x - 7 * s, y); g.lineTo(x, y + 10 * s); g.closePath(); g.fill();
    g.fillStyle = '#e4fdff'; g.beginPath(); g.moveTo(x, y - 10 * s); g.lineTo(x - 3.5 * s, y - 3 * s); g.lineTo(x + 3.5 * s, y - 3 * s); g.closePath(); g.fill();
    g.strokeStyle = '#1b6f85'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y - 10 * s); g.lineTo(x + 7 * s, y); g.lineTo(x, y + 10 * s); g.lineTo(x - 7 * s, y); g.closePath(); g.stroke();
  }
  function meatShape(x, y, s) {
    g.save(); g.translate(x, y); g.rotate(-0.5); g.scale(s, s);
    g.fillStyle = '#efe6d2'; g.strokeStyle = '#6b5a40'; g.lineWidth = 1;
    g.fillRect(-11, -1.5, 8, 3); g.beginPath(); g.arc(-11, -2, 2, 0, 7); g.arc(-11, 2, 2, 0, 7); g.fill();
    var mgr = g.createRadialGradient(1, -2, 1, 2, 0, 9); mgr.addColorStop(0, '#e07a4a'); mgr.addColorStop(1, '#8a3a1e');
    g.fillStyle = mgr; g.beginPath(); g.ellipse(2, 0, 8, 6.5, 0, 0, 7); g.fill(); g.strokeStyle = '#5a220f'; g.stroke();
    g.fillStyle = 'rgba(255,230,200,0.5)'; g.beginPath(); g.ellipse(0, -3, 3, 1.4, -0.3, 0, 7); g.fill();
    g.restore();
  }

  function drawItems() {
    items.forEach(function (it) {
      var bob = Math.sin(time * 4 + it.x) * 2;
      shadow(it.x, it.y + 9, 6 - bob * 0.4, 0.25);
      if (it.t === 'meat') meatShape(it.x, it.y + bob, 1);
      else if (it.t === 'heart') {
        var hs = 9 * (1 + 0.07 * Math.sin(time * 6));
        heartPath(g, it.x, it.y + bob, hs);
        var hg = g.createLinearGradient(0, it.y - 9, 0, it.y + 9); hg.addColorStop(0, '#ff8a9c'); hg.addColorStop(1, '#d6203f');
        g.fillStyle = hg; g.fill(); g.strokeStyle = '#6a0a1c'; g.lineWidth = 1.3; g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(it.x - 4, it.y + bob - 4, 2.2, 1.3, -0.6, 0, 7); g.fill();
      } else if (it.t === 'ore') iconMetal(it.x, it.y + bob, it.k || 0);
      else if (it.t === 'moon') moonShape(it.x, it.y + bob, 1);
      else crystalShape(it.x, it.y + bob, 1);
    });
  }

  function drawPuzzle() {                                       // kista, runstenar, plattor, block och spak
    var pz = puzzle; if (!pz) return;
    var ch = pz.chest;
    if (!ch.taken) {
      shadow(ch.x, ch.y + 9, 11, 0.3);
      rr(g, ch.x - 11, ch.y - 7, 22, 15, 3); g.fillStyle = '#8a5a2b'; g.fill(); g.strokeStyle = '#3a220c'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = '#d9b24a'; g.fillRect(ch.x - 11, ch.y - 2, 22, 2.5); g.fillRect(ch.x - 1.5, ch.y - 4, 3, 6);
      if (pz.solved) { g.save(); g.globalCompositeOperation = 'lighter'; glow(ch.x, ch.y, 26, '255,210,80', 0.35 + 0.15 * Math.sin(time * 5)); g.restore(); }
    }
    if (pz.kind === 'runes') {
      pz.runes.forEach(function (ru, i) {
        shadow(ru.x, ru.y + 11, 8, 0.3);
        rr(g, ru.x - 7, ru.y - 12, 14, 22, 5); g.fillStyle = '#7b7f86'; g.fill(); g.strokeStyle = '#3a3c41'; g.lineWidth = 1.5; g.stroke();
        var lit = ru.lit > 0, bad = ru.bad > 0;
        if (lit || bad || pz.solved) { g.save(); g.globalCompositeOperation = 'lighter'; glow(ru.x, ru.y - 2, 22, bad ? '255,70,70' : '255,225,77', pz.solved && !lit ? 0.22 : 0.6); g.restore(); }
        g.strokeStyle = bad ? '#ff6b6b' : (lit || pz.solved) ? PAL.bolt : '#c9ccd2'; g.lineWidth = 2; g.lineCap = 'round';
        runeGlyph(ru.x, ru.y - 2, i);
      });
    } else {
      pz.plates.forEach(function (pl) {
        var cx = (pl.tx + 0.5) * TS, cy = (pl.ty + 0.5) * TS, on = !!blockAt(pl.tx, pl.ty);
        g.fillStyle = on ? '#ffe14d' : '#8a8f99'; g.beginPath(); g.ellipse(cx, cy + 2, 11, 7, 0, 0, 7); g.fill(); g.strokeStyle = '#3a3c41'; g.lineWidth = 1.5; g.stroke();
        if (on) { g.save(); g.globalCompositeOperation = 'lighter'; glow(cx, cy, 20, '255,225,77', 0.35); g.restore(); }
      });
      var lv = pz.lever, la = lv.flip > 0 ? 0.7 : -0.6;
      g.fillStyle = '#5c6069'; rr(g, lv.x - 7, lv.y + 3, 14, 7, 2); g.fill();
      g.strokeStyle = '#8a5a2b'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(lv.x, lv.y + 6); g.lineTo(lv.x + Math.sin(la) * 13, lv.y + 6 - Math.cos(la) * 13); g.stroke();
      g.fillStyle = '#ff4d6a'; g.beginPath(); g.arc(lv.x + Math.sin(la) * 13, lv.y + 6 - Math.cos(la) * 13, 3.4, 0, 7); g.fill();
      pz.blocks.forEach(function (b) {
        var bx = b.tx * TS + b.ox, by = b.ty * TS + b.oy;
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(bx + 4, by + TS - 5, TS - 4, 5);
        rr(g, bx + 2, by + 1, TS - 4, TS - 4, 4);
        var gr = g.createLinearGradient(0, by, 0, by + TS); gr.addColorStop(0, '#b4b8c2'); gr.addColorStop(1, '#5c6069'); g.fillStyle = gr; g.fill();
        g.strokeStyle = '#2f3138'; g.lineWidth = 1.6; g.stroke();
        g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(bx + 8, by + 8); g.lineTo(bx + 14, by + 14); g.lineTo(bx + 12, by + 20); g.stroke();
      });
    }
  }
  function runeGlyph(x, y, i) {                                  // sju olika runtecken
    var G = [[[-4, -6, 4, -6], [0, -6, 0, 6]], [[-4, -6, 0, 0], [0, 0, 4, -6], [0, 0, 0, 6]], [[-4, 6, 0, -6], [0, -6, 4, 6], [-2, 1, 2, 1]],
      [[-4, -6, -4, 6], [-4, 0, 4, -6], [-4, 0, 4, 6]], [[-4, -6, 4, 6], [4, -6, -4, 6]], [[0, -6, 4, 0], [4, 0, 0, 6], [0, 6, -4, 0], [-4, 0, 0, -6]],
      [[-4, -6, 4, -6], [4, -6, -4, 6], [-4, 6, 4, 6]]];
    g.beginPath(); G[i % G.length].forEach(function (l) { g.moveTo(x + l[0], y + l[1]); g.lineTo(x + l[2], y + l[3]); }); g.stroke();
  }
  function drawShots() {                                     // spindelnät i luften
    shots.forEach(function (sh) {
      g.strokeStyle = 'rgba(240,240,250,0.9)'; g.lineWidth = 1.2; g.beginPath();
      for (var i = 0; i < 4; i++) { var a = i * 0.785 + time * 3; g.moveTo(sh.x - Math.cos(a) * 6, sh.y - Math.sin(a) * 6); g.lineTo(sh.x + Math.cos(a) * 6, sh.y + Math.sin(a) * 6); }
      g.stroke(); g.beginPath(); g.arc(sh.x, sh.y, 3.5, 0, 7); g.stroke();
    });
  }
  function drawBossExtras(m) {
    var top = m.y - m.r * 1.65;
    if (m.phase2 && !m.hidden) { g.save(); g.globalCompositeOperation = 'lighter'; glow(m.x, m.y, m.r * 2.2, '255,60,40', 0.12 + 0.06 * Math.sin(time * 6)); g.restore(); }
    if (m.ai === 'windCharge') {                               // varning: rusar längs linjen
      g.save(); g.setLineDash([8, 6]); g.strokeStyle = 'rgba(255,60,60,' + (0.5 + 0.4 * Math.sin(time * 20)) + ')'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(m.x, m.y); g.lineTo(m.x + m.dirx * 220, m.y + m.diry * 220); g.stroke(); g.restore();
    } else if (m.ai === 'windSlam') {                          // varning: chockvåg inom ringen
      var k2 = clamp(1 - m.aiT / (0.85 * DF().wind), 0, 1);
      g.save(); g.setLineDash([10, 8]); g.strokeStyle = 'rgba(255,60,60,0.75)'; g.lineWidth = 3;
      g.beginPath(); g.arc(m.x, m.y + 6, C.boss.slamRadius, 0, 7); g.stroke(); g.restore();
      g.fillStyle = 'rgba(255,60,60,' + (0.14 * k2) + ')'; g.beginPath(); g.arc(m.x, m.y + 6, C.boss.slamRadius * k2, 0, 7); g.fill();
    } else if (m.ai === 'emerge') {                            // varning: Sandkungen dyker upp här
      g.save(); g.setLineDash([6, 5]); g.strokeStyle = 'rgba(255,60,60,' + (0.6 + 0.3 * Math.sin(time * 18)) + ')'; g.lineWidth = 3;
      g.beginPath(); g.arc(m.ex, m.ey, 46, 0, 7); g.stroke(); g.restore();
    } else if (m.ai === 'stun') {                              // yr
      for (var i = 0; i < 3; i++) { var a = time * 5 + i * 2.1; g.fillStyle = PAL.bolt; g.beginPath(); g.arc(m.x + Math.cos(a) * 16, top + Math.sin(a) * 5, 2.4, 0, 7); g.fill(); }
    }
  }
  function rockShape(cx, cy, rw, rh, light, dark, seed) {
    g.beginPath();
    for (var i = 0; i < 8; i++) { var a = i / 8 * 6.283, kk = 0.82 + hash(seed, i, 400) * 0.26, px = cx + Math.cos(a) * rw * kk, py = cy + Math.sin(a) * rh * kk; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
    g.closePath();
    var gr = g.createLinearGradient(cx, cy - rh, cx, cy + rh); gr.addColorStop(0, light); gr.addColorStop(1, dark);
    g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(15,15,25,0.6)'; g.lineWidth = 1.5; g.stroke();
  }
  function furBlob(cx, cy, r, c1, c2) {
    g.beginPath();
    for (var i = 0; i < 18; i++) { var a = i / 18 * 6.283, r2 = r * (i % 2 ? 0.86 : 1.06), px = cx + Math.cos(a) * r2, py = cy + Math.sin(a) * r2; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
    g.closePath();
    var gr = g.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
    g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(90,110,140,0.6)'; g.lineWidth = 1.2; g.stroke();
  }
  function bossEyes(cx, cy, gap, r, rgb) {
    g.save(); g.globalCompositeOperation = 'lighter';
    [-1, 1].forEach(function (s) { glow(cx + s * gap, cy, r * 3.2, rgb, 0.5); g.fillStyle = 'rgba(' + rgb + ',1)'; g.beginPath(); g.arc(cx + s * gap, cy, r, 0, 7); g.fill(); });
    g.restore();
  }
  // Varje boss har en egen form: stengolem, gorilla, skorpion, yeti och lavademon.
  function drawBoss(m, white) {
    var k = m.kind, R = m.r * 1.3, t = time + m.ph, i, s;
    var look = Math.atan2(P.y - m.y, P.x - m.x), lx = Math.cos(look), ly = Math.sin(look);
    var up = (m.ai === 'windSlam' || m.ai === 'windRain') ? 1 : 0, lean = (m.ai === 'windCharge' || m.ai === 'charge') ? 1 : 0, dizzy = m.ai === 'stun' ? 1 : 0;
    var rage = m.phase2 ? 1 : 0, br = 1 + Math.sin(t * 2.4) * 0.03;
    function W_(c) { return white ? '#ffffff' : c; }
    if (m.hidden) {                                             // en sandhög som rör sig
      g.fillStyle = '#d9b56a'; g.beginPath(); g.ellipse(m.x, m.y + 6, R * 0.75, R * 0.38, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#c49a52'; for (i = 0; i < 4; i++) { g.beginPath(); g.arc(m.x - R * 0.4 + i * R * 0.27, m.y + 6 - Math.abs(Math.sin(t * 8 + i)) * 4, 3, 0, 7); g.fill(); }
      return;
    }
    g.save(); g.translate(m.x + lx * lean * 5, m.y + dizzy * 3); g.scale(br, 2 - br);
    if (k === 'golem') {
      var st = W_('#9a9da6'), sd = W_('#5b5e66');
      var armY = up ? -R * 0.95 : R * 0.1 + Math.sin(t * 3) * 2;
      for (s = -1; s <= 1; s += 2) rockShape(s * R * 0.95, armY, R * 0.36, R * 0.32, st, sd, 7 + s);
      rockShape(0, R * 0.15, R * 0.8, R * 0.7, st, sd, 1);
      rockShape(-R * 0.35, -R * 0.32, R * 0.45, R * 0.4, st, sd, 2);
      rockShape(R * 0.38, -R * 0.28, R * 0.42, R * 0.38, st, sd, 3);
      rockShape(0, -R * 0.62, R * 0.42, R * 0.36, st, sd, 4);
      g.fillStyle = W_('#5f8f3a'); g.beginPath(); g.ellipse(-R * 0.3, R * 0.05, R * 0.25, R * 0.12, 0.3, 0, 7); g.ellipse(R * 0.35, -R * 0.45, R * 0.18, R * 0.09, -0.4, 0, 7); g.fill();
      if (rage) {
        g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,140,40,' + (0.6 + 0.3 * Math.sin(t * 8)) + ')'; g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(-R * 0.2, -R * 0.1); g.lineTo(0, R * 0.2); g.lineTo(R * 0.25, R * 0.05); g.moveTo(0, R * 0.2); g.lineTo(-R * 0.1, R * 0.5); g.stroke(); g.restore();
      }
      g.fillStyle = W_('#757880');
      [-1, 0, 1].forEach(function (q) { g.beginPath(); g.moveTo(q * R * 0.22 - R * 0.09, -R * 0.9); g.lineTo(q * R * 0.22, -R * 1.18 - (q ? 0 : R * 0.1)); g.lineTo(q * R * 0.22 + R * 0.09, -R * 0.9); g.closePath(); g.fill(); });
      bossEyes(lx * 2, -R * 0.64 + ly * 1.5, R * 0.16, R * 0.08, rage ? '255,80,60' : '255,220,90');
    } else if (k === 'ape') {
      var fur = W_('#5a4130'), furD = W_('#33241a'), skin = W_('#a08a6a');   // brun päls syns mot djungelns gröna mark
      for (s = -1; s <= 1; s += 2) {
        var hx = s * R * (up ? 0.7 : 1.0), hy = up ? -R * 1.05 : R * 0.75 + Math.sin(t * 6 + s) * 2;
        g.strokeStyle = fur; g.lineWidth = R * 0.32; g.lineCap = 'round';
        g.beginPath(); g.moveTo(s * R * 0.55, -R * 0.35); g.quadraticCurveTo(s * R * 1.05, -R * 0.1, hx, hy); g.stroke();
        g.fillStyle = furD; g.beginPath(); g.arc(hx, hy, R * 0.2, 0, 7); g.fill();
      }
      g.fillStyle = fur; g.beginPath(); g.ellipse(0, R * 0.05, R * 0.78, R * 0.72, 0, 0, 7); g.fill();
      g.fillStyle = skin; g.beginPath(); g.ellipse(0, R * 0.15, R * 0.42, R * 0.38, 0, 0, 7); g.fill();
      for (i = 0; i < 9; i++) {                                 // man av löv
        var la = Math.PI * (1.05 + i * 0.1);
        g.fillStyle = W_(i % 2 ? '#2f7a2a' : '#4f9a3c'); g.beginPath(); g.ellipse(Math.cos(la) * R * 0.78, -R * 0.2 + Math.sin(la) * R * 0.62, R * 0.2, R * 0.09, la, 0, 7); g.fill();
      }
      g.fillStyle = fur; g.beginPath(); g.arc(0, -R * 0.62, R * 0.36, 0, 7); g.fill();
      g.fillStyle = skin; g.beginPath(); g.ellipse(lx * 2, -R * 0.55 + ly, R * 0.24, R * 0.2, 0, 0, 7); g.fill();
      bossEyes(lx * 2, -R * 0.66 + ly, R * 0.11, R * 0.06, rage ? '255,70,50' : '150,255,110');
      g.fillStyle = W_('#1a1a12'); g.fillRect(lx * 2 - R * 0.1, -R * 0.48 + ly, R * 0.2, 2);
    } else if (k === 'scorpion') {
      var sh = W_('#c98a3a'), shD = W_('#7a4f1c');
      g.rotate(look);
      g.strokeStyle = shD; g.lineWidth = 2.4; g.lineCap = 'round';
      for (i = 0; i < 3; i++) for (s = -1; s <= 1; s += 2) {
        var bx = -R * 0.25 + i * R * 0.25, wg = Math.sin(t * 12 + i * 2 + s) * 3;
        g.beginPath(); g.moveTo(bx, s * R * 0.3); g.lineTo(bx - 4 + wg, s * R * 0.75); g.lineTo(bx - 8 + wg, s * R * 0.95); g.stroke();
      }
      for (s = -1; s <= 1; s += 2) {
        var opn = (up || lean) ? 0.55 : 0.2 + 0.1 * Math.sin(t * 4);
        g.strokeStyle = sh; g.lineWidth = 4; g.beginPath(); g.moveTo(R * 0.4, s * R * 0.25); g.lineTo(R * 0.85, s * R * 0.45); g.stroke();
        g.fillStyle = sh; g.beginPath(); g.ellipse(R * 1.0, s * R * 0.45, R * 0.24, R * 0.14, s * opn, 0, 7); g.fill(); g.strokeStyle = shD; g.lineWidth = 1.2; g.stroke();
      }
      for (i = 0; i < 3; i++) { g.fillStyle = i % 2 ? shD : sh; g.beginPath(); g.ellipse(R * 0.25 - i * R * 0.33, 0, R * 0.3, R * (0.36 - i * 0.04), 0, 0, 7); g.fill(); }
      for (i = 0; i < 6; i++) {                                 // svansen böjer sig över ryggen
        var th = Math.PI * (1 + i * 0.17) + Math.sin(t * 3) * 0.05 * (lean ? 0 : 1);
        var tx = -R * 0.45 + Math.cos(th) * R * 0.55, ty = Math.sin(th) * R * 0.38 - i * R * 0.03;
        g.fillStyle = i % 2 ? shD : sh; g.beginPath(); g.arc(tx, ty, R * (0.2 - i * 0.02), 0, 7); g.fill();
        if (i === 5) { g.fillStyle = W_('#3a2a1a'); g.beginPath(); g.moveTo(tx + R * 0.08, ty); g.lineTo(tx + R * 0.36, ty + R * 0.12); g.lineTo(tx + R * 0.06, ty + R * 0.16); g.closePath(); g.fill(); }
      }
      if (rage) bossEyes(R * 0.52, 0, R * 0.1, R * 0.05, '255,70,50');
      else { g.fillStyle = '#1a0f08'; g.beginPath(); g.arc(R * 0.52, -R * 0.1, R * 0.05, 0, 7); g.arc(R * 0.52, R * 0.1, R * 0.05, 0, 7); g.fill(); }
    } else if (k === 'yeti') {
      var fW = W_('#f2f6fb'), fS = W_('#c8d6e6');
      for (s = -1; s <= 1; s += 2) furBlob(s * R * 0.95, up ? -R * 0.95 : R * 0.35 + Math.sin(t * 4 + s) * 2, R * 0.3, fW, fS);
      furBlob(0, R * 0.05, R * 0.82, fW, fS);
      furBlob(0, -R * 0.55, R * 0.42, fW, fS);
      g.fillStyle = W_('#6f9bd1'); g.beginPath(); g.ellipse(lx * 2, -R * 0.5 + ly, R * 0.26, R * 0.22, 0, 0, 7); g.fill();
      g.fillStyle = W_('#bfe6ff');
      for (s = -1; s <= 1; s += 2) { g.beginPath(); g.moveTo(s * R * 0.2, -R * 0.85); g.lineTo(s * R * 0.48, -R * 1.25); g.lineTo(s * R * 0.36, -R * 0.82); g.closePath(); g.fill(); }
      bossEyes(lx * 2, -R * 0.56 + ly, R * 0.1, R * 0.05, rage ? '255,70,50' : '210,245,255');
      g.fillStyle = W_('#2a3a5a'); g.beginPath(); g.arc(lx * 2, -R * 0.42 + ly, R * 0.08, 0, Math.PI); g.fill();
    } else {
      var bas = W_('#2a1f22'), basL = W_('#4d3c3c');
      for (s = -1; s <= 1; s += 2) rockShape(s * R * 0.95, up ? -R * 0.95 : R * 0.25 + Math.sin(t * 5 + s) * 2, R * 0.3, R * 0.28, basL, bas, 20 + s);
      rockShape(0, R * 0.05, R * 0.8, R * 0.75, basL, bas, 21);
      rockShape(0, -R * 0.6, R * 0.4, R * 0.36, basL, bas, 22);
      g.save(); g.globalCompositeOperation = 'lighter';
      g.strokeStyle = 'rgba(255,120,30,' + (0.75 + 0.2 * Math.sin(t * 6)) + ')'; g.lineWidth = rage ? 3 : 2;
      g.beginPath(); g.moveTo(-R * 0.4, -R * 0.2); g.lineTo(-R * 0.1, R * 0.1); g.lineTo(-R * 0.25, R * 0.5); g.moveTo(-R * 0.1, R * 0.1); g.lineTo(R * 0.3, 0); g.lineTo(R * 0.45, R * 0.4); g.stroke();
      for (i = 0; i < 5; i++) {                                 // flammande krona
        var fx2 = (i - 2) * R * 0.16, fh = R * (0.35 + 0.15 * Math.sin(t * 10 + i * 1.7)) * (rage ? 1.3 : 1);
        g.fillStyle = i % 2 ? 'rgba(255,200,60,0.9)' : 'rgba(255,110,30,0.9)';
        g.beginPath(); g.moveTo(fx2 - R * 0.1, -R * 0.85); g.quadraticCurveTo(fx2, -R * 0.85 - fh * 1.2, fx2 + R * 0.1, -R * 0.85); g.closePath(); g.fill();
      }
      g.restore();
      bossEyes(lx * 2, -R * 0.62 + ly, R * 0.11, R * 0.06, '255,230,120');
    }
    g.restore();
  }
  function drawGroundFx() {                                     // is, eld och stenregnets skuggor ligger under figurerna
    fx.forEach(function (f) {
      if (f.k === 'ice') {
        var ia = Math.min(1, f.t);
        g.fillStyle = 'rgba(190,230,255,' + 0.45 * ia + ')'; g.beginPath(); g.arc(f.x, f.y, f.R, 0, 7); g.fill();
        g.strokeStyle = 'rgba(255,255,255,' + 0.7 * ia + ')'; g.lineWidth = 1.2; g.beginPath();
        for (var i = 0; i < 6; i++) { var an = i * 1.05; g.moveTo(f.x, f.y); g.lineTo(f.x + Math.cos(an) * f.R * 0.8, f.y + Math.sin(an) * f.R * 0.8); }
        g.stroke();
      } else if (f.k === 'fire') {
        var fa = Math.min(1, f.t / 0.6), fl = 6 + Math.sin(time * 15 + f.x) * 2;
        g.save(); g.globalCompositeOperation = 'lighter'; glow(f.x, f.y, 16, '255,120,30', 0.4 * fa);
        g.fillStyle = 'rgba(255,170,50,' + 0.9 * fa + ')'; g.beginPath(); g.moveTo(f.x - 5, f.y); g.quadraticCurveTo(f.x, f.y - fl * 2, f.x + 5, f.y); g.closePath(); g.fill(); g.restore();
      } else if (f.k === 'rock') {
        var rk = 1 - f.t / f.life;
        g.fillStyle = 'rgba(0,0,0,' + (0.15 + 0.35 * rk) + ')'; g.beginPath(); g.ellipse(f.x, f.y, 6 + 14 * rk, (6 + 14 * rk) * 0.5, 0, 0, 7); g.fill();
        g.strokeStyle = 'rgba(255,60,60,0.55)'; g.lineWidth = 1.5; g.beginPath(); g.arc(f.x, f.y, 22, 0, 7); g.stroke();
      }
    });
  }
  function drawRock(f) { var k = f.t / f.life; rockShape(f.x, f.y - k * k * 240 - 6, 9, 8, biome.stone[0], biome.stone[1], 50); }
  function drawBossIntro() {                                    // bossens namn glider in
    var k = bossIntro / 2.4, slide = k > 0.83 ? (1 - k) / 0.17 : 1, a = k < 0.17 ? k / 0.17 : 1;
    g.save(); g.globalAlpha = a;
    g.fillStyle = 'rgba(10,6,6,0.7)'; g.fillRect(0, LH / 2 - 62, LW, 124);
    var x = LW / 2 - (1 - easeOutCubic(slide)) * LW * 0.6;
    chalkTitle(biome.boss, x, LH / 2 - 8, 58);
    g.font = 'bold 17px ' + TXT; g.fillStyle = '#ff8a7a'; g.textAlign = 'center'; g.fillText('Boss i ' + biome.name, x, LH / 2 + 38);
    g.restore(); g.textAlign = 'left';
  }

  function moonShape(x, y, sc) {                                // månsten
    g.save(); g.globalCompositeOperation = 'lighter'; glow(x, y, 16 * sc, '170,210,255', 0.35); g.restore();
    g.beginPath(); g.moveTo(x, y - 8 * sc); g.lineTo(x + 6 * sc, y - 2 * sc); g.lineTo(x + 4 * sc, y + 7 * sc); g.lineTo(x - 4 * sc, y + 7 * sc); g.lineTo(x - 6 * sc, y - 2 * sc); g.closePath();
    g.fillStyle = '#dcecff'; g.fill(); g.strokeStyle = '#6a8fc0'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = '#9fc2ee'; g.beginPath(); g.arc(x + sc, y + sc, 2.8 * sc, 0, 7); g.fill();
    g.fillStyle = '#dcecff'; g.beginPath(); g.arc(x + 2.3 * sc, y + 0.2 * sc, 2.3 * sc, 0, 7); g.fill();
  }

  function drawFx() {
    fx.forEach(function (f) {
      if (f.k === 'ice' || f.k === 'fire') return;                // ritas i drawGroundFx
      if (f.k === 'rock') { drawRock(f); return; }
      if (f.k === 'p') {
        var k = Math.max(0, f.t / f.life);
        g.globalAlpha = Math.min(1, k * 1.6); g.fillStyle = f.col;
        g.beginPath(); g.arc(f.x, f.y, f.s * (0.4 + 0.6 * k), 0, 7); g.fill(); g.globalAlpha = 1;
      } else if (f.k === 's') {                            // gnista: liten fyruddig stjärna som glittrar till och slocknar
        var sk = f.t / f.life, tw = Math.sin(sk * Math.PI), r = f.s * (0.6 + tw * 1.4);
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = tw; g.fillStyle = f.col;
        g.beginPath(); g.moveTo(f.x, f.y - r * 2); g.lineTo(f.x + r * 0.45, f.y); g.lineTo(f.x, f.y + r * 2); g.lineTo(f.x - r * 0.45, f.y); g.closePath();
        g.moveTo(f.x - r * 2, f.y); g.lineTo(f.x, f.y + r * 0.45); g.lineTo(f.x + r * 2, f.y); g.lineTo(f.x, f.y - r * 0.45); g.closePath(); g.fill();
        g.restore();
      } else if (f.k === 'a') {                              // luftpartiklar
        var ak = Math.min(1, f.t / 1.5, (f.life - f.t) / 1);
        if (f.blink) ak *= 0.5 + 0.5 * Math.sin(time * 4 + f.s * 9 + f.life);
        g.save(); if (f.glow) g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.max(0, ak); g.fillStyle = f.col;
        g.beginPath(); g.arc(f.x, f.y, f.s, 0, 7); g.fill(); g.restore();
      } else if (f.k === 'w') {                              // chockvåg
        var wk = 1 - f.t / f.life;
        g.strokeStyle = 'rgba(255,170,80,' + (1 - wk) * 0.9 + ')'; g.lineWidth = 8 * (1 - wk) + 2;
        g.beginPath(); g.arc(f.x, f.y, f.R * wk, 0, 7); g.stroke();
      } else if (f.k === 'r') {                            // ljusring vid power-up
        var rk = 1 - f.t / f.life;
        g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,225,77,' + (1 - rk) * 0.8 + ')'; g.lineWidth = 4 * (1 - rk) + 1;
        g.beginPath(); g.arc(f.x, f.y, 10 + easeOutCubic(rk) * 60, 0, 7); g.stroke(); g.restore();
      } else drawBolt(f.x1, f.y1, f.x2, f.y2, f.seed, 2.5);
    });
  }

  function drawTexts() {
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    texts.forEach(function (t) {
      var k = t.t / t.life, sc = easeOutBack(Math.min(1, t.t / 0.15));
      g.save(); g.translate(t.x, t.y); g.scale(sc, sc);
      g.globalAlpha = 1 - k * k; g.font = 'bold 15px ' + TXT;
      g.strokeStyle = 'rgba(10,15,10,0.85)'; g.lineWidth = 4; g.strokeText(t.txt, 0, 0);
      g.fillStyle = t.col; g.fillText(t.txt, 0, 0);
      g.restore();
    });
    g.textAlign = 'left';
  }

  // ---------- HUD ----------
  function tag(x, y, w, h) {                              // kritlapp
    rr(g, x, y, w, h, 9); g.fillStyle = 'rgba(16,36,18,0.78)'; g.fill();
    g.strokeStyle = 'rgba(250,250,242,0.55)'; g.lineWidth = 1.4; g.stroke();
  }
  function iconMetal(x, y, t) {
    var M = MET[t || 0];
    g.fillStyle = M.c3; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 6, y); g.lineTo(x, y + 6); g.lineTo(x - 6, y); g.closePath(); g.fill();
    g.fillStyle = M.c2; g.beginPath(); g.moveTo(x, y - 5); g.lineTo(x + 4, y - 0.5); g.lineTo(x, y + 3); g.lineTo(x - 4, y - 0.5); g.closePath(); g.fill();
    g.fillStyle = M.c1; g.fillRect(x - 1, y - 3.5, 1.6, 1.6);
  }
  function iconStone(x, y) {
    g.fillStyle = '#9a9ea6'; g.beginPath(); g.moveTo(x - 6, y + 4); g.lineTo(x - 5, y - 2); g.lineTo(x - 1, y - 5); g.lineTo(x + 5, y - 3); g.lineTo(x + 6, y + 3); g.lineTo(x + 1, y + 5); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(x - 2, y - 2, 2.2, 1.2, -0.4, 0, 7); g.fill();
  }
  function iconWood(x, y) {
    g.fillStyle = '#8a5a2b'; rr(g, x - 7, y - 3.5, 13, 7, 3); g.fill();
    g.fillStyle = '#d9a46a'; g.beginPath(); g.ellipse(x + 6, y, 2.6, 3.4, 0, 0, 7); g.fill();
    g.strokeStyle = '#8a5a2b'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(x + 6, y, 1.2, 1.8, 0, 0, 7); g.stroke();
  }
  function iconOre(x, y) { g.fillStyle = '#a8781f'; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 6, y); g.lineTo(x, y + 6); g.lineTo(x - 6, y); g.closePath(); g.fill(); g.fillStyle = PAL.gold; g.beginPath(); g.moveTo(x, y - 5); g.lineTo(x + 4, y - 0.5); g.lineTo(x, y + 3); g.lineTo(x - 4, y - 0.5); g.closePath(); g.fill(); }
  function iconSword(x, y) {
    var col = P.sword ? swordLook(P.sword).col : '#8a5a2b';
    g.strokeStyle = col; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 6, y + 6); g.lineTo(x + 6, y - 6); g.stroke();
    if (P.sword) { g.strokeStyle = '#8a6a2a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x, y + 6); g.stroke(); }
  }
  function iconSkull(x, y) {
    g.fillStyle = PAL.chalk; g.beginPath(); g.arc(x, y - 1, 6, 0, 7); g.fill(); g.fillRect(x - 3.5, y + 3, 7, 3.5);
    g.fillStyle = '#1a2a1a'; g.beginPath(); g.arc(x - 2.3, y - 1, 1.6, 0, 7); g.arc(x + 2.3, y - 1, 1.6, 0, 7); g.fill();
  }

  function drawHeart(cx, cy, s, full) {                        // blankt hjärta med glans och kontur, fylls efter hälsa
    heartPath(g, cx, cy, s); g.fillStyle = '#2a0d14'; g.fill();
    if (full > 0) {
      g.save(); heartPath(g, cx, cy, s); g.clip();
      var hg = g.createLinearGradient(0, cy - s, 0, cy + s); hg.addColorStop(0, '#ff8a9c'); hg.addColorStop(1, '#d6203f');
      g.fillStyle = hg; g.fillRect(cx - s * 1.5, cy - s * 1.5, s * 3 * full, s * 3);
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(cx - s * 0.45, cy - s * 0.38, s * 0.28, s * 0.16, -0.6, 0, 7); g.fill();
      g.restore();
    }
    heartPath(g, cx, cy, s);
    if (full >= 1) { g.strokeStyle = '#5a0a1c'; g.lineWidth = 1.6; } else { g.strokeStyle = 'rgba(250,250,242,0.65)'; g.lineWidth = 1.5; }   // tomt hjärta: ljus kontur
    g.stroke();
  }

  function drawHud() {
    g.textBaseline = 'middle';
    // hälsa
    var n = P.hearts, hpc = C.player.hpPerHeart, low = state === 'play' && P.hp <= maxHp() * 0.3;
    var beat = low ? 1 + 0.1 * Math.max(0, Math.sin(time * 9)) : 1, w1;
    if (low) {                                                   // låg hälsa: röd kant som pulserar
      var lv = g.createRadialGradient(LW / 2, LH / 2, LH * 0.35, LW / 2, LH / 2, LW * 0.7);
      lv.addColorStop(0, 'rgba(255,0,0,0)'); lv.addColorStop(1, 'rgba(200,0,30,' + (0.16 + 0.1 * Math.sin(time * 9)) + ')');
      g.fillStyle = lv; g.fillRect(0, 0, LW, LH);
    }
    if (n <= 10) {                                               // upp till 10 hjärtan, två rader om fem
      var rows = n > 5 ? 2 : 1, cols = Math.min(n, 5), hs = 8.5, hw = 21;
      w1 = cols * hw + 16; tag(10, 8, w1, rows === 2 ? 50 : 30);
      for (var i = 0; i < n; i++) {
        var hcx = 18 + hs + (i % 5) * hw, hcy = 23 + Math.floor(i / 5) * 20;
        drawHeart(hcx, hcy, hs * beat, clamp((P.hp - i * hpc) / hpc, 0, 1));
      }
    } else {                                                     // fler än 10 (äldre sparningar): ett hjärta och en mätare
      w1 = 200; tag(10, 8, w1, 30);
      drawHeart(30, 23, 10 * beat, 1);
      var hk = clamp(P.hp / maxHp(), 0, 1);
      rr(g, 48, 17, 96, 12, 6); g.fillStyle = '#3a1018'; g.fill();
      if (hk > 0) { rr(g, 48, 17, Math.max(12, 96 * hk), 12, 6); var hg2 = g.createLinearGradient(0, 17, 0, 29); hg2.addColorStop(0, '#ff8a9c'); hg2.addColorStop(1, '#d6203f'); g.fillStyle = hg2; g.fill(); }
      g.font = 'bold 13px ' + TXT; g.fillStyle = PAL.chalk; g.fillText(Math.ceil(P.hp) + '/' + maxHp(), 150, 24);
    }
    // förråd
    var stats = [
      [iconWood, String(P.wood)],
      [iconStone, String(P.stone)],
      [function (x, y) { meatShape(x + 2, y, 0.6); }, String(P.meat), touchMode ? null : 'E'],
      [iconSword, P.sword ? 'nivå ' + P.sword : 'pinne']
    ];
    if (P.moonEver || P.moon > 0) stats.splice(2, 0, [function (x, y) { moonShape(x, y, 0.62); }, String(P.moon)]);
    stats.splice(0, 0, [function (x, y) { g.save(); g.translate(x, y); g.scale(0.55, 0.55); iconBolt(); g.restore(); }, P.bolts + '/' + C.boltPower.max, touchMode ? null : 'Q']);
    var metStats = [];                                           // metaller som du har eller kan bryta
    for (var mt = 0; mt < 4; mt++) if (metalAmt(mt) > 0 || mt <= P.pick) (function (q) { metStats.push([function (x, y) { iconMetal(x, y, q); }, String(metalAmt(q))]); })(mt);
    stats.splice.apply(stats, [3, 0].concat(metStats));
    g.font = 'bold 15px ' + TXT;
    var x0 = 10 + w1 + 10, wStats = 14;
    stats.forEach(function (s) { wStats += 22 + g.measureText(s[1]).width + 16 + (s[2] ? 24 : 0); });
    tag(x0, 8, wStats, 30);
    var xx = x0 + 18;
    stats.forEach(function (s) {
      s[0](xx, 23); xx += 14;
      g.fillStyle = PAL.chalk; g.fillText(s[1], xx, 24); xx += g.measureText(s[1]).width + 24;
      if (s[2]) {                                            // tangent som visar vad man trycker
        rr(g, xx - 16, 14, 19, 19, 4); g.fillStyle = 'rgba(250,250,242,0.15)'; g.fill(); g.strokeStyle = 'rgba(250,250,242,0.75)'; g.lineWidth = 1.3; g.stroke();
        g.fillStyle = PAL.chalk; g.font = 'bold 12px ' + TXT; g.textAlign = 'center'; g.fillText(s[2], xx - 6.5, 24); g.textAlign = 'left'; g.font = 'bold 15px ' + TXT;
        xx += 24;
      }
    });
    var goal = forgeGoal();                                      // nästa mål i smedjan
    if (goal && state === 'play') {
      g.font = 'bold 13px ' + TXT; var gtx = 'Nästa: ' + goal.name + ', ' + goal.price, gw = g.measureText(gtx).width + 22;
      tag(x0, 42, gw, 22); g.fillStyle = goal.can ? '#7dff8a' : 'rgba(250,250,242,0.85)'; g.fillText(gtx, x0 + 11, 53);
      g.font = 'bold 15px ' + TXT;
    }
    // nivå och monster kvar, högerställt
    var left = quota - kills, t2 = 'Nivå ' + level + (lapOf(level) ? ', varv ' + (lapOf(level) + 1) : ''), t3 = left > 0 ? String(left) : 'portalen är öppen';
    var w2 = g.measureText(t2).width, w3 = g.measureText(t3).width, wR = w2 + w3 + 62;
    var RX = LW - 44;                                        // plats för pausknappen längst till höger
    tag(RX - 10 - wR, 8, wR, 30);
    g.fillStyle = PAL.chalk; g.fillText(t2, RX - wR + 6, 24);
    if (left > 0) iconSkull(RX - w3 - 30, 23);
    g.fillStyle = left > 0 ? PAL.chalk : '#c9bfff'; g.fillText(t3, RX - w3 - 18, 24);
    // pausknapp
    if (state === 'play') {
      g.fillStyle = 'rgba(16,36,18,0.85)'; g.beginPath(); g.arc(BTN_PAUSE.x, BTN_PAUSE.y, BTN_PAUSE.r, 0, 7); g.fill();
      g.strokeStyle = 'rgba(250,250,242,0.7)'; g.lineWidth = 1.5; g.stroke();
      g.save(); g.translate(BTN_PAUSE.x, BTN_PAUSE.y); g.scale(0.6, 0.6); iconPause(); g.restore();
    }
    // meddelande
    if (msgT > 0) {
      var a = Math.min(1, msgT / 0.4), k = easeOutCubic(Math.min(1, (3 - msgT) / 0.25));
      g.save(); g.globalAlpha = a; g.font = 'bold 17px ' + TXT;
      var mw = g.measureText(msg).width + 34, my = 30 + 22 * k;
      tag(LW / 2 - mw / 2, my, mw, 32);
      g.textAlign = 'center'; g.fillStyle = PAL.bolt; g.fillText(msg, LW / 2, my + 17);
      g.restore(); g.textAlign = 'left';
    }
    // bossens hälsa längst ned
    var boss = null; mons.forEach(function (m) { if (m.type === 'boss') boss = m; });
    if (boss) {
      var bw2 = 320, bx2 = LW / 2 - bw2 / 2, by2 = LH - 38;
      tag(bx2 - 14, by2 - 28, bw2 + 28, 52);
      g.font = 'bold 15px ' + TXT; g.textAlign = 'center'; g.fillStyle = PAL.chalk; g.fillText(biome.boss, LW / 2, by2 - 13);
      rr(g, bx2, by2, bw2, 12, 6); g.fillStyle = 'rgba(40,10,10,0.9)'; g.fill();
      var bk = Math.max(0, boss.hp / boss.maxHp);
      if (bk > 0) { rr(g, bx2, by2, Math.max(12, bw2 * bk), 12, 6); g.fillStyle = '#ff4d4d'; g.fill(); }
      g.textAlign = 'left';
    }
    // hint vid smältstation
    if (state === 'play' && smeltPos && Math.hypot(smeltPos.x - P.x, smeltPos.y - P.y) < TS * 2) {
      var ht = touchMode ? 'Tryck Smid för att öppna smedjan' : 'E: öppna smedjan';
      g.font = 'bold 13px ' + TXT;
      var sp2 = toScreen(smeltPos.x, smeltPos.y), hw2 = g.measureText(ht).width + 20, hx = clamp(sp2.x - hw2 / 2, 6, LW - hw2 - 6), hy = sp2.y + 26 * ZW;
      tag(hx, hy, hw2, 24);
      g.fillStyle = PAL.chalk; g.textAlign = 'center'; g.fillText(ht, hx + hw2 / 2, hy + 13); g.textAlign = 'left';
    }
  }

  function drawVignette() {
    if (!vignette) {
      vignette = g.createRadialGradient(LW / 2, LH / 2, LH * 0.45, LW / 2, LH / 2, LW * 0.72);
      vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(0,10,0,0.42)');
    }
    g.fillStyle = vignette; g.fillRect(0, 0, LW, LH);
  }

  // ---------- titel och död ----------
  var saved = null;
  function chalkTitle(text, x, y, size) {
    g.font = 'bold ' + size + 'px ' + HAND; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 10; g.strokeText(text, x + 3, y + 4);
    g.fillStyle = PAL.chalk; g.fillText(text, x, y);
    g.globalAlpha = 0.35; g.fillText(text, x + 1.2, y - 1); g.globalAlpha = 1;   // kritstruktur
  }
  function overlayTitle() {
    g.fillStyle = 'rgba(8,16,10,0.72)'; g.fillRect(0, 0, LW, LH);
    var cx = LW / 2, cy = LH / 2 - 70;
    // hjälten med blixtar, spelets kännetecken
    for (var i = 0; i < 7; i++) {
      var a = time * 1.6 + i * 0.898, b = a + 0.55;
      drawBolt(cx + Math.cos(a) * 34, cy + Math.sin(a) * 34, cx + Math.cos(b) * 70, cy + Math.sin(b) * 70, Math.floor(time * 10) + i * 7, 2);
    }
    g.save(); g.translate(cx, cy + 6); g.scale(2.6, 2.6);
    stick(0, 0, 0.8, -0.6, 0, { sword: true, len: 26, col: '#ffe14d', glow: 'rgba(255,225,77,0.3)' }, time * 3, false);
    g.restore();
    chalkTitle('Malm & Monster', cx, cy + 112, 64);
    g.font = 'bold 16px ' + TXT; g.fillStyle = PAL.bolt; g.fillText('Mines & Monsters, version 3.0', cx, cy + 156);
    g.font = '15px ' + UI; g.fillStyle = 'rgba(250,250,242,0.85)';
    if (touchMode) {
      g.fillText('Dra med vänster tumme för att gå. Tryck på Slå för att slå och hacka.', cx, cy + 196);
      g.fillText('Knappen med kött äter, vid ugnen blir den en hammare som smider. Paus finns uppe till höger.', cx, cy + 218);
    } else {
      g.fillText('Piltangenter eller WASD för att gå. Mellanslag eller musklick för att slå och hacka.', cx, cy + 196);
      g.fillText('E smider vid ugnen och äter kött annars. Q blixtstorm, Esc pausar.', cx, cy + 218);
    }
    var pulse = 0.65 + 0.35 * Math.sin(time * 4), start;
    if (touchMode) start = saved ? 'Tryck för att fortsätta på nivå ' + saved.level : 'Tryck för att börja';
    else start = saved ? 'Enter eller klick fortsätter på nivå ' + saved.level : 'Tryck Enter eller klicka för att börja';
    g.globalAlpha = pulse; g.font = 'bold 20px ' + TXT; g.fillStyle = PAL.chalk;
    g.fillText(start, cx, cy + 262);
    g.globalAlpha = 1;
    if (saved) {
      tag(BTN_NEW.x - BTN_NEW.w / 2, BTN_NEW.y - BTN_NEW.h / 2, BTN_NEW.w, BTN_NEW.h);
      g.font = 'bold 17px ' + TXT; g.fillStyle = PAL.chalk; g.fillText('Nytt spel', BTN_NEW.x, BTN_NEW.y + 1);
    }
    tag(BTN_DIFF.x - BTN_DIFF.w / 2, BTN_DIFF.y - BTN_DIFF.h / 2, BTN_DIFF.w, BTN_DIFF.h);
    g.font = 'bold 17px ' + TXT; g.fillStyle = PAL.bolt; g.textAlign = 'center'; g.fillText('Svårighet: ' + DIFF_NAME[settings.diff], BTN_DIFF.x, BTN_DIFF.y + 1);
    g.textAlign = 'left';
  }
  function overlayDead() {
    var vg = g.createRadialGradient(LW / 2, LH / 2, 60, LW / 2, LH / 2, LW * 0.7);
    vg.addColorStop(0, 'rgba(40,0,0,0.55)'); vg.addColorStop(1, 'rgba(90,0,10,0.85)');
    g.fillStyle = vg; g.fillRect(0, 0, LW, LH);
    chalkTitle('Du föll!', LW / 2, LH / 2 - 24, 52);
    g.font = '16px ' + UI; g.fillStyle = 'rgba(250,250,242,0.9)';
    g.fillText((DF().keep >= 0.75 ? 'Du tappade en fjärdedel av malmen. ' : DF().keep > 0 ? 'Du tappade halva malmen. ' : 'Du tappade all malm. ') + (touchMode ? 'Tryck på skärmen' : 'Tryck Enter') + ' för att försöka nivå ' + level + ' igen.', LW / 2, LH / 2 + 30);
    g.textAlign = 'left';
  }

  function draw() {
    if (mapDirty) renderMapCache();
    g.setTransform(RS, 0, 0, RS, 0, 0);
    g.fillStyle = '#0c140c'; g.fillRect(0, 0, LW, LH);
    var s = trauma * trauma * (FXC.shake == null ? 1 : FXC.shake);
    g.save();
    if (s > 0.001) {                                       // skaka kameran, aldrig spelarens position
      g.translate(LW / 2, LH / 2); g.rotate(0.012 * s * Math.sin(shakeT * 1.1)); g.scale(1 + 0.02 * s, 1 + 0.02 * s);
      g.translate(-LW / 2 + 10 * s * (0.6 * Math.sin(shakeT * 1.7) + 0.4 * Math.sin(shakeT * 3.1)),
        -LH / 2 + 7 * s * (0.6 * Math.sin(shakeT * 2.3) + 0.4 * Math.sin(shakeT * 3.7)));
    }
    g.scale(ZW, ZW); g.translate(-camX, -camY);                // kameran; på dator och platta visar den hela kartan
    g.drawImage(mapCv, 0, 0, WW, WH);
    drawDynamicTiles(); drawGroundFx(); drawItems(); drawPuzzle(); drawMonsters(); drawShots(); drawPlayer(); drawFx();
    if (biome.canopy) g.drawImage(canCv, 0, 0, WW, WH);          // djungelns lövtak
    var lapT = lapOf(level);                                     // varv 2 kväll, varv 3+ natt
    if (lapT > 0) { g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = lapT === 1 ? 0.5 : 0.75; g.fillStyle = lapT === 1 ? '#ffb07a' : '#6a78c0'; g.fillRect(0, 0, WW, WH); g.restore(); }
    var gd = guideNow();
    drawLighting(); drawCaveEyes(); drawTexts(); drawGuideArrow(gd);
    g.restore();
    drawVignette();
    if (stormT > 0) { g.fillStyle = FXC.flash !== false ? 'rgba(255,250,220,' + stormT * 1.1 + ')' : 'rgba(255,225,77,' + stormT * 0.3 + ')'; g.fillRect(0, 0, LW, LH); }
    if (state !== 'title') {
      drawHud(); if (PHONE && ZW > 1.01 && state === 'play') drawMinimap();
      drawGuideText(gd); drawTouch(); if (bossIntro > 0 && state === 'play') drawBossIntro();
    }
    if (fade > 0) { g.fillStyle = 'rgba(0,0,0,' + fade + ')'; g.fillRect(0, 0, LW, LH); }
    if (state === 'paused') inBox960(overlayPause);
    if (state === 'forge') inBox960(overlayForge);
    if (state === 'dead') inBox960(overlayDead);
    if (state === 'title') inBox960(overlayTitle);
    if (touchMode && window.innerHeight > window.innerWidth * 1.05) {
      g.fillStyle = 'rgba(8,16,10,0.88)'; g.fillRect(0, 0, LW, LH);
      inBox960(function () {
        chalkTitle(PHONE ? 'Vrid mobilen' : 'Vrid plattan', LW / 2, LH / 2 - 20, 56);
        g.font = '22px ' + UI; g.fillStyle = PAL.chalk; g.fillText('Spelet spelas i liggande läge.', LW / 2, LH / 2 + 40); g.textAlign = 'left';
      });
    }
  }

  // ---------- pekskärmskontroller ----------
  // Knappar för barn: tydlig ritad ikon och ett kort ord i fet, rak stil (ingen skrivstil, inga emoji som ser olika ut på olika plattor).
  function touchButton(b, pressed, icon, label, dim, badge) {
    g.globalAlpha = dim ? 0.35 : pressed ? 0.95 : 0.7;
    g.fillStyle = 'rgba(16,36,18,0.92)'; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill();
    g.strokeStyle = pressed ? PAL.bolt : PAL.chalk; g.lineWidth = 3; g.stroke();
    g.globalAlpha = dim ? 0.45 : 1;
    var s = b.r / 28, iy = b.y - b.r * 0.16;
    g.save(); g.translate(b.x, iy); g.scale(s, s); icon(); g.restore();
    g.font = 'bold ' + Math.round(b.r * 0.3) + 'px ' + TXT; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round'; g.strokeStyle = 'rgba(10,20,10,0.9)'; g.lineWidth = 3;
    g.strokeText(label, b.x, b.y + b.r * 0.55); g.fillStyle = pressed ? PAL.bolt : PAL.chalk; g.fillText(label, b.x, b.y + b.r * 0.55);
    if (badge != null) {                                     // antal kött
      var bx = b.x + b.r * 0.72, by = b.y - b.r * 0.72;
      g.fillStyle = PAL.heart; g.beginPath(); g.arc(bx, by, 12, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.font = 'bold 14px ' + TXT; g.fillText(String(badge), bx, by + 1);
    }
    g.textAlign = 'left'; g.globalAlpha = 1;
  }
  function iconSwordBig() {                                  // svärd snett uppåt höger, ca 40 px
    var col = P.sword ? swordLook(P.sword).col : '#e4e8ef';
    g.save(); g.rotate(-Math.PI / 4); g.lineJoin = 'round';
    g.beginPath(); g.moveTo(-3.5, -4); g.lineTo(-3.5, -20); g.lineTo(0, -25); g.lineTo(3.5, -20); g.lineTo(3.5, -4); g.closePath();
    g.fillStyle = col; g.fill(); g.strokeStyle = 'rgba(10,15,30,0.8)'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = '#8a6a2a'; g.fillRect(-10, -4, 20, 4.5);            // parerstång
    g.fillStyle = '#5b3a1e'; g.fillRect(-2.5, 0.5, 5, 10);             // grepp
    g.fillStyle = '#d9b24a'; g.beginPath(); g.arc(0, 12.5, 3.2, 0, 7); g.fill();
    g.restore();
  }
  function iconHammer() {
    g.save(); g.rotate(-Math.PI / 5);
    g.fillStyle = '#8a5a2b'; g.fillRect(-2.5, -6, 5, 26);
    rr(g, -12, -16, 24, 11, 3); g.fillStyle = '#b8bcc6'; g.fill(); g.strokeStyle = 'rgba(10,15,30,0.8)'; g.lineWidth = 1.5; g.stroke();
    g.restore();
  }
  function iconMeat() { meatShape(1, 0, 1.2); }
  function iconBolt() {                                      // blixt-ikon för knapp och HUD
    g.save(); g.globalCompositeOperation = 'lighter'; glow(0, 0, 20, '255,225,77', 0.3); g.restore();
    g.beginPath(); g.moveTo(4, -16); g.lineTo(-8, 2); g.lineTo(-1, 2); g.lineTo(-5, 16); g.lineTo(9, -4); g.lineTo(2, -4); g.lineTo(6, -16); g.closePath();
    g.fillStyle = PAL.bolt; g.fill(); g.strokeStyle = '#7a5a10'; g.lineWidth = 1.5; g.stroke();
  }
  function iconPause() { g.fillStyle = PAL.chalk; rr(g, -9, -11, 6, 22, 2); g.fill(); rr(g, 3, -11, 6, 22, 2); g.fill(); }

  // ---------- paus och inställningar ----------
  var pauseSel = 0, confirmNew = 0;                       // confirmNew: tid kvar för "Säker?"-läget
  var PROWS = [
    { k: 'diff', label: 'Svårighet (från nästa nivå)', vals: ['latt', 'medel', 'svar'], names: ['Lätt', 'Medel', 'Svår'] },
    { k: 'music', label: 'Musik', vals: [0, 0.25, 0.5], names: ['Av', 'Låg', 'Hög'] },
    { k: 'sfx', label: 'Ljudeffekter', vals: [0, 0.4, 0.8], names: ['Av', 'Låg', 'Hög'] },
    { k: 'shake', label: 'Skärmskak', vals: [0, 0.5, 1], names: ['Av', 'Lite', 'Full'] },
    { k: 'flash', label: 'Blinkningar vid träff', vals: [true, false], names: ['På', 'Av'] },
    { k: 'numbers', label: 'Skadetal', vals: [true, false], names: ['På', 'Av'] },
    { k: 'guide', label: 'Guide på nivå 1', vals: [true, false], names: ['På', 'Av'] }
  ];
  var PX = LW / 2 - 220, PW = 440, PY0 = 146, PH = 38, PSTEP = 44, PBY = PY0 + 7 * PSTEP + 26;
  var PB_GO = { x: LW / 2 - 112, y: PBY, w: 200, h: 48 }, PB_NEW = { x: LW / 2 + 112, y: PBY, w: 200, h: 48 };
  function inBox(p, b) { return Math.abs(p.x - b.x) < b.w / 2 + 6 && Math.abs(p.y - b.y) < b.h / 2 + 6; }
  function askNew() {                                       // första trycket frågar, andra börjar om
    if (confirmNew > 0) { confirmNew = 0; sfx('click'); newGame(); }
    else { confirmNew = 3; sfx('deny'); }
  }
  function onPauseBtn(p) { return Math.hypot(p.x - BTN_PAUSE.x, p.y - BTN_PAUSE.y) < BTN_PAUSE.r + 14; }
  function pauseGame() {
    if (state !== 'play') return;
    state = 'paused'; pauseSel = 0; confirmNew = 0; keys = {}; mouse.down = false; touch.joyId = touch.atkId = touch.eId = null;
    if (window.LJUD) LJUD.duck(true);
  }
  function resumeGame() {
    if (state !== 'paused') return;
    state = 'play'; if (window.LJUD) LJUD.duck(false); sfx('click');
  }
  function cycleRow(i, dir) {
    var r = PROWS[i], idx = r.vals.indexOf(settings[r.k]); if (idx < 0) idx = 0;
    idx = (idx + (dir || 1) + r.vals.length) % r.vals.length;
    settings[r.k] = r.vals[idx]; applySettings(); sfx('click');
    if (r.k === 'diff') say('Svårighet: ' + DIFF_NAME[settings.diff] + '. Gäller från nästa nivå.');
  }
  function pauseHit(p) {
    for (var i = 0; i < PROWS.length; i++) {
      var y = PY0 + i * PSTEP;
      if (p.x > PX && p.x < PX + PW && p.y > y - 3 && p.y < y + PH + 3) { pauseSel = i; cycleRow(i, 1); return; }
    }
    if (inBox(p, PB_GO)) resumeGame();
    else if (inBox(p, PB_NEW)) { pauseSel = PROWS.length + 1; askNew(); }
  }
  function overlayPause() {
    g.fillStyle = 'rgba(8,16,10,0.82)'; g.fillRect(0, 0, LW, LH);
    chalkTitle('Paus', LW / 2, 100, 48);
    g.textBaseline = 'middle';
    PROWS.forEach(function (r, i) {
      var y = PY0 + i * PSTEP, idx = r.vals.indexOf(settings[r.k]);
      tag(PX, y, PW, PH);
      if (i === pauseSel && !touchMode) { rr(g, PX, y, PW, PH, 9); g.strokeStyle = PAL.bolt; g.lineWidth = 2.5; g.stroke(); }
      g.font = 'bold 18px ' + TXT; g.textAlign = 'left'; g.fillStyle = PAL.chalk; g.fillText(r.label, PX + 18, y + PH / 2 + 1);
      g.textAlign = 'right'; g.fillStyle = PAL.bolt; g.fillText(r.names[idx < 0 ? 0 : idx], PX + PW - 18, y + PH / 2 + 1);
    });
    [[PB_GO, 'Fortsätt', PROWS.length], [PB_NEW, confirmNew > 0 ? 'Säker? Tryck igen' : 'Nytt spel', PROWS.length + 1]].forEach(function (b) {
      var B = b[0]; tag(B.x - B.w / 2, B.y - B.h / 2, B.w, B.h);
      if (b[2] === PROWS.length + 1 && confirmNew > 0) { rr(g, B.x - B.w / 2, B.y - B.h / 2, B.w, B.h, 9); g.fillStyle = 'rgba(200,40,60,0.55)'; g.fill(); }
      if (pauseSel === b[2] && !touchMode) { rr(g, B.x - B.w / 2, B.y - B.h / 2, B.w, B.h, 9); g.strokeStyle = PAL.bolt; g.lineWidth = 2.5; g.stroke(); }
      g.textAlign = 'center'; g.fillStyle = PAL.chalk; g.font = 'bold ' + (b[2] === PROWS.length + 1 && confirmNew > 0 ? 18 : 22) + 'px ' + TXT; g.fillText(b[1], B.x, B.y + 1);
    });
    g.font = '15px ' + TXT; g.fillStyle = 'rgba(250,250,242,0.75)';
    g.fillText(confirmNew > 0 ? 'Nytt spel börjar om från nivå 1. Svärd, malm och styrka försvinner.' : touchMode ? 'Tryck på en rad för att ändra den.' : 'Pilarna väljer och ändrar. Esc eller P fortsätter.', LW / 2, PBY + 44);
    g.font = '12px ' + TXT; g.fillStyle = 'rgba(250,250,242,0.45)'; g.fillText('Malm & Monster, version 3.0', LW / 2, LH - 14);
    g.textAlign = 'left';
  }

  // ---------- smedjan (v2.2) ----------
  var FX0 = LW / 2 - 270, FW = 540, FY0 = 132, FH = 62, FSTEP = 70, FBY = FY0 + 4 * FSTEP + 36;
  function recipe(k, lvl) {                                      // kostnaden för att nå nivå lvl
    var Cc = C.crafting;
    if (k === 'sword') return Cc.sword[lvl];
    if (k === 'pick') return Cc.pick[lvl];
    if (k === 'armor') return Cc.armor[lvl];
    return lvl === 1 ? Cc.lantern0 : { moon: C.upgrades.lantern.moonCost[Math.min(lvl - 2, 2)] };
  }
  function swordName(l) { return l <= 2 ? 'Stensvärd' : l <= 5 ? 'Kopparsvärd' : l <= 8 ? 'Järnsvärd' : l <= 11 ? 'Guldsvärd' : 'Stjärnsvärd'; }
  function cap(s2) { return s2.charAt(0).toUpperCase() + s2.slice(1); }
  function forgeRows() {
    var U = C.upgrades, rows = [
      { k: 'sword', name: swordName(Math.min(P.sword + 1, C.weapon.maxSwordLevel)), lvl: P.sword, max: C.weapon.maxSwordLevel, desc: 'Mer skada mot monstren', icon: iconSwordBig },
      { k: 'armor', name: P.armor < U.armor.max ? ARMOR_PART[P.armor % 4] + ' av ' + MET[Math.floor(P.armor / 4)].name : 'Rustning', lvl: P.armor, max: U.armor.max,
        desc: P.armor < U.armor.max ? (P.armor < 4 ? 'Ny del till rustningen' : 'Byter ut ' + ARMOR_PART[P.armor % 4].toLowerCase() + ' av ' + MET[Math.floor(P.armor / 4) - 1].name) + ', mindre skada' : 'Hela rustningen är av stjärnmalm', icon: iconShield },
      { k: 'pick', name: P.pick < 3 ? cap(PICK_NAME[P.pick + 1]) : 'Guldhacka', lvl: P.pick, max: 3, desc: P.pick < 3 ? 'Kan bryta ' + MET[P.pick + 1].name : 'Bryter all malm', icon: iconPick },
      { k: 'lamp', name: 'Lykta', lvl: P.lamp, max: U.lantern.max, desc: P.lamp === 0 ? 'Mer ljus i grottorna' : 'Starkare ljus. Kostar månsten, som är sällsynt.', icon: iconLamp }
    ];
    rows.forEach(function (r) { r.cost = r.lvl < r.max ? recipe(r.k, r.lvl + 1) : null; });
    return rows;
  }
  function canAfford(c) { return !!c && P.wood >= (c.wood || 0) && P.stone >= (c.stone || 0) && (c.metal == null || metalAmt(c.metal) >= c.n) && P.moon >= (c.moon || 0); }
  function costText(c) {
    if (!c) return ''; var p = [];
    if (c.wood) p.push(c.wood + ' trä'); if (c.stone) p.push(c.stone + ' sten'); if (c.metal != null) p.push(c.n + ' ' + MET[c.metal].name); if (c.moon) p.push(c.moon + (c.moon === 1 ? ' månsten' : ' månstenar'));
    return p.join(' + ');
  }
  function missingText(c) {
    var p = [];
    if ((c.wood || 0) > P.wood) p.push((c.wood - P.wood) + ' trä');
    if ((c.stone || 0) > P.stone) p.push((c.stone - P.stone) + ' sten');
    if (c.metal != null && metalAmt(c.metal) < c.n) p.push((c.n - metalAmt(c.metal)) + ' ' + MET[c.metal].name + (P.pick < c.metal ? ' (kräver ' + PICK_NAME[c.metal] + ')' : ''));
    if ((c.moon || 0) > P.moon) p.push((c.moon - P.moon) + ' månsten');
    return p.join(' och ');
  }
  function pay(c) { P.wood -= c.wood || 0; P.stone -= c.stone || 0; if (c.metal != null) addMetal(c.metal, -c.n); P.moon -= c.moon || 0; }
  function forgeGoal() {                                        // nästa mål: svärdet, eller hackan om svärdet kräver malm du inte kan bryta
    var rows = forgeRows(), sw = rows[0], pk = rows[2], r = sw;
    if (!sw.cost) r = rows[1].cost ? rows[1] : null;
    else if (sw.cost.metal != null && sw.cost.metal > P.pick && pk.cost) r = pk;
    return r && r.cost ? { k: r.k, name: r.name, price: costText(r.cost), can: canAfford(r.cost) } : null;
  }
  function canBuyAny() { return forgeRows().some(function (r) { return r.cost && canAfford(r.cost); }); }
  function openForge() {
    state = 'forge'; if (P.sword === 0) forgeSel = 0;
    keys = {}; mouse.down = false; touch.joyId = touch.atkId = touch.eId = null;
    sfx('click'); if (window.LJUD) LJUD.duck(true);
  }
  function closeForge() { if (state !== 'forge') return; state = 'play'; if (window.LJUD) LJUD.duck(false); }
  function buy(i) {
    var r = forgeRows()[i]; if (!r) return;
    if (!r.cost) { sfx('deny'); say(r.name + ' är redan på högsta nivån'); return; }
    if (!canAfford(r.cost)) { sfx('deny'); say('Behöver ' + missingText(r.cost) + ' till'); return; }
    pay(r.cost);
    if (r.k === 'sword') { P.sword++; say(P.sword === 1 ? 'Du gjorde ett stensvärd! Nu kan du bryta koppar.' : swordName(P.sword) + ', nivå ' + P.sword); }
    else if (r.k === 'armor') { var ap = (P.armor) % 4, am = Math.floor(P.armor / 4); P.armor++; say(ARMOR_PART[ap] + ' av ' + MET[am].name + '! Rustningen är nu nivå ' + P.armor + ' av 16.'); }
    else if (r.k === 'pick') { P.pick++; say('Ny ' + PICK_NAME[P.pick] + '! Nu kan du bryta ' + MET[P.pick].name + '.'); }
    else { P.lamp++; say('Lyktan är nu nivå ' + P.lamp); }
    sfx('craft'); powerUp(); save();
  }
  function forgeHit(p) {
    for (var i = 0; i < 4; i++) { var y = FY0 + i * FSTEP; if (p.x > FX0 && p.x < FX0 + FW && p.y > y - 3 && p.y < y + FH + 3) { forgeSel = i; buy(i); return; } }
    if (Math.abs(p.x - 480) < 100 && Math.abs(p.y - FBY) < 30) closeForge();   // menyrutan är alltid 960 bred
  }
  function iconShield() {
    g.beginPath(); g.moveTo(0, -14); g.lineTo(12, -9); g.quadraticCurveTo(11, 8, 0, 15); g.quadraticCurveTo(-11, 8, -12, -9); g.closePath();
    g.fillStyle = ARMOR_MAT[Math.min(3, Math.floor(P.armor / 4))].col;   // färgen på nästa del g.fill(); g.strokeStyle = 'rgba(10,15,30,0.8)'; g.lineWidth = 1.6; g.stroke();
    g.fillStyle = '#d9b24a'; g.fillRect(-1.5, -9, 3, 18); g.fillRect(-7, -2, 14, 3);
  }
  function iconPick() {
    g.save(); g.rotate(-Math.PI / 5); g.fillStyle = '#8a5a2b'; g.fillRect(-2, -8, 4, 26);
    g.beginPath(); g.moveTo(-15, -6); g.quadraticCurveTo(0, -16, 15, -6); g.lineTo(12, -4); g.quadraticCurveTo(0, -11, -12, -4); g.closePath();
    g.fillStyle = '#b8bcc6'; g.fill(); g.strokeStyle = 'rgba(10,15,30,0.8)'; g.lineWidth = 1.4; g.stroke(); g.restore();
  }
  function iconLamp() {
    g.save(); g.globalCompositeOperation = 'lighter'; glow(0, 1, 20, '255,210,100', 0.35); g.restore();
    g.fillStyle = '#3a3a44'; rr(g, -8, -10, 16, 22, 3); g.fill(); g.fillStyle = '#ffd36a'; rr(g, -5, -6, 10, 14, 2); g.fill();
    g.strokeStyle = '#3a3a44'; g.lineWidth = 2; g.beginPath(); g.arc(0, -12, 5, Math.PI, 0); g.stroke();
  }
  function overlayForge() {
    g.fillStyle = 'rgba(22,12,8,0.86)'; g.fillRect(0, 0, LW, LH);
    chalkTitle('Smedjan', LW / 2, 62, 42);
    g.textBaseline = 'middle'; g.textAlign = 'center'; g.font = 'bold 18px ' + TXT; g.fillStyle = PAL.gold;
    var inv = ['trä ' + P.wood, 'sten ' + P.stone];
    for (var mt2 = 0; mt2 < 4; mt2++) if (metalAmt(mt2) > 0 || mt2 <= P.pick) inv.push(MET[mt2].name + ' ' + metalAmt(mt2));
    if (P.moonEver || P.moon > 0) inv.push('månsten ' + P.moon);
    g.font = 'bold 17px ' + TXT; g.fillText('Du har: ' + inv.join(', '), LW / 2, 104);
    var goal = forgeGoal();
    forgeRows().forEach(function (r, i) {
      var y = FY0 + i * FSTEP, maxed = r.lvl >= r.max, can = !maxed && canAfford(r.cost);
      tag(FX0, y, FW, FH);
      if (i === forgeSel && !touchMode) { rr(g, FX0, y, FW, FH, 9); g.strokeStyle = PAL.bolt; g.lineWidth = 2.5; g.stroke(); }
      g.save(); g.translate(FX0 + 36, y + FH / 2); g.scale(0.8, 0.8); r.icon(); g.restore();
      g.textAlign = 'left'; g.font = 'bold 19px ' + TXT; g.fillStyle = PAL.chalk; g.fillText(r.name, FX0 + 70, y + 22);
      if (goal && goal.k === r.k && !maxed) {                  // rekommendation
        var nw = g.measureText(r.name).width; g.font = 'bold 12px ' + TXT; var bt = 'Bra att köpa nu', bw3 = g.measureText(bt).width + 14;
        rr(g, FX0 + 80 + nw, y + 12, bw3, 20, 6); g.fillStyle = PAL.bolt; g.fill(); g.fillStyle = '#1a2a1a'; g.fillText(bt, FX0 + 87 + nw, y + 22);
      }
      g.font = '14px ' + TXT; g.fillStyle = 'rgba(250,250,242,0.75)'; g.fillText(r.desc, FX0 + 70, y + 44);
      g.textAlign = 'right'; g.font = '14px ' + TXT; g.fillStyle = 'rgba(250,250,242,0.8)';
      g.fillText('Nivå ' + r.lvl + ' av ' + r.max, FX0 + FW - 18, y + 20);
      g.font = 'bold 18px ' + TXT; g.fillStyle = maxed ? '#c9bfff' : can ? '#7dff8a' : '#ff9a8a';
      g.font = 'bold 15px ' + TXT; g.fillText(maxed ? 'Klar' : costText(r.cost), FX0 + FW - 18, y + 43);
    });
    tag(LW / 2 - 95, FBY - 24, 190, 48);
    g.textAlign = 'center'; g.fillStyle = PAL.chalk; g.font = 'bold 22px ' + TXT; g.fillText('Stäng', LW / 2, FBY + 1);
    g.font = '15px ' + TXT; g.fillStyle = 'rgba(250,250,242,0.75)';
    g.fillText(touchMode ? 'Tryck på en rad för att köpa.' : 'Pilarna väljer, Enter köper (eller 1 till 4). E eller Esc stänger.', LW / 2, FBY + 42);
    g.textAlign = 'left';
  }

  // ---------- guide på nivå 1 ----------
  function nearest(list) {
    var b = null, bd = 1e9;
    list.forEach(function (o) { var d = Math.hypot(o.x - P.x, o.y - P.y); if (d < bd) { bd = d; b = o; } });
    return b;
  }
  function treeList() { var l = []; for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) if (map[y][x] === TREE) l.push({ x: (x + 0.5) * TS, y: (y + 0.5) * TS }); return l; }
  function stoneList() { var l = []; for (var y = 1; y < H - 1; y++) for (var x = 1; x < W - 1; x++) if (map[y][x] === STONE && breakableStone(x, y)) l.push({ x: (x + 0.5) * TS, y: (y + 0.5) * TS }); return l; }
  function oreList(k) { return oreTiles.filter(function (o) { return map[o.y][o.x] === ORE && (oreT[o.x + ',' + o.y] || 0) === k; }).map(function (o) { return { x: (o.x + 0.5) * TS, y: (o.y + 0.5) * TS }; }); }
  function guideNow() {
    if (!settings.guide || level !== 1 || state !== 'play') return null;
    var T = touchMode, hit = T ? 'tryck Slå' : 'slå med mellanslag';
    if (guideMoved < 80 && P.sword === 0 && P.wood === 0) return { t: T ? 'Dra med vänster tumme för att gå.' : 'Gå med piltangenterna eller WASD.' };
    if (P.sword === 0 && P.wood < 2) return { t: 'Hugg träd: gå fram till ett träd och ' + hit + '. Trä: ' + P.wood + ' av 2.', target: nearest(treeList()) };
    if (P.sword === 0 && P.stone < 3) return { t: 'Bryt sten: ' + hit + ' på en grå sten. Sten: ' + P.stone + ' av 3.', target: nearest(stoneList()) };
    if (P.sword === 0) return { t: 'Gå till ugnen, ' + (T ? 'tryck Smid' : 'tryck E') + ' och gör ett stensvärd.', target: smeltPos };
    if (P.sword < 3 && P.ore < 4) return { t: 'Med stensvärdet kan du bryta den orange kopparmalmen. Koppar: ' + P.ore + '.', target: nearest(oreList(0)) };
    if (kills < quota) return { t: 'Besegra monstren. Många gömmer sig i grottorna. ' + (quota - kills) + ' kvar.', target: nearest(mons) };
    return { t: 'Portalen är öppen! Gå in i den.', target: exitPos };
  }
  function drawGuideArrow(gd) {
    if (!gd || !gd.target) return;
    var x = gd.target.x, y = gd.target.y - 30 + Math.sin(time * 5) * 4;
    g.save(); g.lineJoin = 'round';
    g.beginPath(); g.moveTo(x, y + 12); g.lineTo(x - 11, y); g.lineTo(x - 5, y); g.lineTo(x - 5, y - 13); g.lineTo(x + 5, y - 13); g.lineTo(x + 5, y); g.lineTo(x + 11, y); g.closePath();
    g.strokeStyle = 'rgba(10,20,10,0.85)'; g.lineWidth = 4; g.stroke(); g.fillStyle = PAL.bolt; g.fill();
    g.restore();
  }
  var guideLast = '', guideShowT = 0;
  function drawGuideText(gd) {                                   // nere i mitten; visas en stund när instruktionen ändras, pilen finns kvar
    if (!gd) return;
    if (gd.t !== guideLast) { guideLast = gd.t; guideShowT = 5; }
    if (guideShowT <= 0) return;
    var fs = 16, maxW = touchMode ? LW - 440 : LW - 120, cx = touchMode ? LW / 2 - 45 : LW / 2;
    g.save(); g.globalAlpha = Math.min(1, guideShowT / 0.6); g.textBaseline = 'middle';
    g.font = 'bold ' + fs + 'px ' + TXT; var w = g.measureText(gd.t).width + 30;
    if (w > maxW) { fs = Math.max(11, Math.floor(fs * maxW / w)); g.font = 'bold ' + fs + 'px ' + TXT; w = g.measureText(gd.t).width + 30; }
    var x = cx - w / 2, y = LH - 50;
    tag(x, y, w, 32); rr(g, x, y, w, 32, 9); g.strokeStyle = PAL.bolt; g.lineWidth = 2; g.stroke();
    g.textAlign = 'center'; g.fillStyle = PAL.chalk; g.fillText(gd.t, cx, y + 17); g.textAlign = 'left';
    g.restore();
  }
  function drawTouch() {
    if (!touchMode || state !== 'play') return;
    g.save();
    if (touch.joyId !== null) {
      g.globalAlpha = 0.45; g.strokeStyle = PAL.chalk; g.lineWidth = 3;
      g.beginPath(); g.arc(touch.jx0, touch.jy0, JOY_R, 0, 7); g.stroke();
      g.globalAlpha = 0.65; g.fillStyle = PAL.chalk;
      g.beginPath(); g.arc(touch.jx0 + clamp(touch.jx, -1, 1) * JOY_R, touch.jy0 + clamp(touch.jy, -1, 1) * JOY_R, 24, 0, 7); g.fill();
    } else {                                                  // tyst ledtråd där tummen brukar vara
      g.globalAlpha = 0.22; g.strokeStyle = PAL.chalk; g.lineWidth = 3;
      g.beginPath(); g.arc(110, LH - 110, JOY_R, 0, 7); g.stroke();
      g.globalAlpha = 0.4; g.font = '15px ' + TXT; g.fillStyle = PAL.chalk; g.textAlign = 'center';
      g.fillText('dra för att gå', 110, LH - 110); g.textAlign = 'left';
    }
    var nearSmelt = smeltPos && Math.hypot(smeltPos.x - P.x, smeltPos.y - P.y) < TS * 2;
    touchButton(BTN_ATK, touch.atkId !== null, iconSwordBig, 'Slå');
    touchButton(BTN_BOLT, touch.boltId != null, iconBolt, 'Blixt', P.bolts === 0, P.bolts || null);
    if (nearSmelt) touchButton(BTN_E, touch.eId !== null, iconHammer, 'Smid', false);
    else touchButton(BTN_E, touch.eId !== null, iconMeat, 'Ät', P.meat === 0 || P.hp >= maxHp(), P.meat);
    g.restore();
  }

  // ---------- indata ----------
  window.addEventListener('keydown', function (e) {
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(k) >= 0) e.preventDefault();
    if (window.LJUD) LJUD.init();                        // ljud får starta först efter en tangent eller ett tryck
    if (keys[k]) return; keys[k] = true;
    if (state === 'forge') {
      if (k === 'Escape' || k === 'e' || k === 'p') closeForge();
      else if (k === 'ArrowUp' || k === 'w') forgeSel = (forgeSel + 3) % 4;
      else if (k === 'ArrowDown' || k === 's') forgeSel = (forgeSel + 1) % 4;
      else if (k === 'Enter' || k === ' ') buy(forgeSel);
      else if ('1234'.indexOf(k) >= 0 && k.length === 1) { forgeSel = +k - 1; buy(forgeSel); }
      return;
    }
    if (k === 'Escape' || k === 'p') { if (state === 'play') pauseGame(); else if (state === 'paused') resumeGame(); return; }
    if (state === 'paused') {
      var NR = PROWS.length, NSEL = NR + 2, GO = NR, NEWB = NR + 1;
      if (k === 'ArrowUp' || k === 'w') pauseSel = pauseSel === NEWB ? NR - 1 : (pauseSel + NSEL - 1) % NSEL;
      else if (k === 'ArrowDown' || k === 's') pauseSel = pauseSel === GO ? 0 : (pauseSel + 1) % NSEL;
      else if (pauseSel >= GO && (k === 'ArrowLeft' || k === 'a' || k === 'ArrowRight' || k === 'd')) pauseSel = pauseSel === GO ? NEWB : GO;
      else if (pauseSel === GO && (k === 'Enter' || k === ' ')) resumeGame();
      else if (pauseSel === NEWB && (k === 'Enter' || k === ' ')) askNew();
      else if (k === 'ArrowLeft' || k === 'a') cycleRow(pauseSel, -1);
      else if (k === 'ArrowRight' || k === 'd' || k === 'Enter' || k === ' ') cycleRow(pauseSel, 1);
      return;
    }
    if (k === ' ') attack();                            // slå direkt, så att korta tryck aldrig missas
    if (state === 'title' && (k === 'ArrowLeft' || k === 'ArrowRight')) { cycleDiff(k === 'ArrowLeft' ? -1 : 1); return; }
    if (k === 'q') castStorm();
    if (k === 'e') useE();
    if (k === 'Enter') {
      if (state === 'dead') { P.hp = maxHp(); startLevel(level); }
      else if (state === 'title') { var s = load(); if (s) continueGame(s); else newGame(); }
    }
    if (k === 'n' && state === 'title') newGame();
  });
  window.addEventListener('keyup', function (e) { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; });
  window.addEventListener('blur', function () { keys = {}; mouse.down = false; touch.joyId = touch.atkId = touch.eId = null; pauseGame(); });
  document.addEventListener('visibilitychange', function () {   // appen i bakgrunden: pausa och tysta
    if (document.hidden) { pauseGame(); if (window.LJUD) LJUD.suspend(); }
    else if (window.LJUD) LJUD.resume();
  });
  function mpos(e) {
    var r = cv.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * LW / r.width; mouse.y = (e.clientY - r.top) * LH / r.height; mouse.has = true;
  }
  cv.addEventListener('mousemove', mpos);
  cv.addEventListener('mousedown', function (e) {
    if (performance.now() - lastTouch < 800) return;     // webbläsarens låtsas-musklick efter en touch
    if (window.LJUD) LJUD.init();
    mpos(e);
    var mp = { x: mouse.x, y: mouse.y };
    if (state === 'forge') { forgeHit(toBox(mp)); return; }
    if (state === 'paused') { pauseHit(toBox(mp)); return; }
    if (state === 'title') { if (inBox(toBox(mp), BTN_DIFF)) { cycleDiff(1); return; } var s0 = load(); if (saved && inBox(toBox(mp), BTN_NEW)) newGame(); else if (s0) continueGame(s0); else newGame(); return; }
    if (state === 'dead') { if (performance.now() - deadAt > 700) { P.hp = maxHp(); startLevel(level); } return; }
    if (state === 'play' && onPauseBtn(mp)) { pauseGame(); return; }
    mouse.down = true;
    if (state === 'play' && !P.moving) { var mw2 = toWorld(mouse.x, mouse.y), dx = mw2.x - P.x, dy = mw2.y - P.y, l = Math.hypot(dx, dy) || 1; P.fx = dx / l; P.fy = dy / l; }
    attack();
  });
  window.addEventListener('mouseup', function () { mouse.down = false; });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // pekskärm och penna (Android-plattor). Musen hanteras ovan.
  function lpos(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * LW / r.width, y: (e.clientY - r.top) * LH / r.height }; }
  function onBtn(p, b) { return Math.hypot(p.x - b.x, p.y - b.y) < b.r * 1.35; }
  function goFullscreen() {
    var el = document.documentElement, standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    if (standalone || document.fullscreenElement || !el.requestFullscreen) return;
    el.requestFullscreen().then(function () {
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {});
    }).catch(function () {});
  }
  cv.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse') return;
    e.preventDefault(); touchMode = true; lastTouch = performance.now();
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    if (window.LJUD) LJUD.init();
    var p = lpos(e);
    if (state === 'forge') { forgeHit(toBox(p)); return; }
    if (state === 'paused') { pauseHit(toBox(p)); return; }
    if (state === 'play' && onPauseBtn(p)) { pauseGame(); return; }
    if (state === 'title') {
      goFullscreen();
      if (inBox(toBox(p), BTN_DIFF)) { cycleDiff(1); return; }
      if (saved && Math.abs(toBox(p).x - BTN_NEW.x) < BTN_NEW.w / 2 + 10 && Math.abs(toBox(p).y - BTN_NEW.y) < BTN_NEW.h / 2 + 10) newGame();
      else { var s = load(); if (s) continueGame(s); else newGame(); }
      return;
    }
    if (state === 'dead') {
      if (performance.now() - deadAt > 700) { P.hp = maxHp(); startLevel(level); }   // spärr så att ett kvarglömt finger inte startar om direkt
      return;
    }
    if (Math.hypot(p.x - BTN_BOLT.x, p.y - BTN_BOLT.y) < BTN_BOLT.r * 1.1) { touch.boltId = e.pointerId; castStorm(); return; }
    if (onBtn(p, BTN_E)) { touch.eId = e.pointerId; useE(); return; }
    if (p.x >= LW / 2) {                                    // hela högra halvan slår
      if (touch.atkId === null) { touch.atkId = e.pointerId; if (!P.moving) aimNearest(); attack(); }
      return;
    }
    if (touch.joyId === null) { touch.joyId = e.pointerId; touch.jx0 = p.x; touch.jy0 = p.y; touch.jx = 0; touch.jy = 0; }
  }, { passive: false });
  cv.addEventListener('pointermove', function (e) {
    if (e.pointerId !== touch.joyId) return;
    e.preventDefault();
    var p = lpos(e), dx = p.x - touch.jx0, dy = p.y - touch.jy0, l = Math.hypot(dx, dy);
    if (l > JOY_R) {                                         // joysticken följer med om tummen glider långt
      touch.jx0 += dx * (1 - JOY_R / l); touch.jy0 += dy * (1 - JOY_R / l);
      dx = p.x - touch.jx0; dy = p.y - touch.jy0;
    }
    touch.jx = dx / JOY_R; touch.jy = dy / JOY_R;
  }, { passive: false });
  function endTouch(e) {
    if (e.pointerId === touch.joyId) { touch.joyId = null; touch.jx = touch.jy = 0; }
    if (e.pointerId === touch.atkId) touch.atkId = null;
    if (e.pointerId === touch.eId) touch.eId = null;
    if (e.pointerId === touch.boltId) touch.boltId = null;
  }
  cv.addEventListener('pointerup', endTouch);
  cv.addEventListener('pointercancel', endTouch);

  // ---------- huvudloop ----------
  P = newPlayer(); level = 1; buildLevel(1, 0); state = 'title'; applySettings();
  saved = load();
  resize();
  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    realUpdate(dt);
    if (hitStop > 0) hitStop -= dt; else update(dt);
    draw(); requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // för test: window.__sg exponerar läge
  window.__sg = { get P() { return P; }, get state() { return state; }, get level() { return level; }, get mons() { return mons; },
    get items() { return items; }, get map() { return map; }, build: function (n) { buildLevel(n, 0); }, get puzzle() { return puzzle; }, get oreT() { return oreT; },
    get shots() { return shots; }, get biome() { return biome.name; }, buy: function (i) { buy(i); }, forge: function () { openForge(); },
    step: function (sec) { for (var t = 0; t < sec; t += 0.02) { realUpdate(0.02); if (hitStop > 0) hitStop -= 0.02; else update(0.02); } },   // test: spola fram
    get bossIntro() { return bossIntro; },
    get fx() { return { trauma: trauma, hitStop: hitStop, texts: texts.length, particles: fx.length }; } };
})();
