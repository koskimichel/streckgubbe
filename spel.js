// Malm & Monster (Mines & Monsters), version 2 - 2D-monsterfighting med en streckgubbe. Ren canvas, inga beroenden.
// Stil: "krita på sommaräng". Kritvit hjälte, målad äng, blåsvarta grottor. Blixtgult är enda starka accenten.
// v2 nytt: förrenderad karta, ljus i grottor, skuggor, animerade figurer, träffkänsla (skak, hit-stop, skadetal), ny HUD.
(function () {
  'use strict';
  var C = CONFIG, TS = C.tile, W = C.cols, H = C.rows, FXC = C.effects || {};
  var LW = W * TS, LH = H * TS;                       // logisk storlek (960 x 576)
  var cv = document.getElementById('c'), g = cv.getContext('2d');
  var GRASS = 0, STONE = 1, TREE = 2, CAVE = 3, ORE = 4, SMELT = 5, EXIT = 6;
  var SAVE_KEY = 'streckgubbe-save-v1';
  var HAND = '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';
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
  var keys = {}, mouse = { x: 0, y: 0, down: false, has: false };
  var trauma = 0, shakeT = 0, hitStop = 0, fade = 0, texts = [];
  // pekskärm: joystick under vänster tumme, knappar för höger tumme
  var touchMode = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches), lastTouch = 0, deadAt = 0;
  var touch = { joyId: null, jx0: 0, jy0: 0, jx: 0, jy: 0, atkId: null, eId: null };
  var JOY_R = 56, BTN_ATK = { x: LW - 96, y: LH - 96, r: 56 }, BTN_E = { x: LW - 204, y: LH - 62, r: 36 }, BTN_NEW = { x: LW / 2, y: LH - 44, w: 170, h: 40 };

  function newPlayer() {
    return {
      x: 2.5 * TS, y: 2.5 * TS, r: 10, hearts: C.player.startHearts,
      hp: C.player.startHearts * C.player.hpPerHeart,
      str: C.player.startStrength, ore: 0, meat: 1, sword: 0,
      fx: 1, fy: 0, cd: 0, inv: 0, swing: 0, walk: 0, moving: false, pu: 0, spk: 0
    };
  }
  function maxHp() { return P.hearts * C.player.hpPerHeart; }
  function damage() {
    var base = P.sword > 0 ? C.weapon.swordBaseDamage + C.weapon.damagePerSwordLevel * (P.sword - 1) : C.weapon.stickDamage;
    return base + C.weapon.damagePerStrength * (P.str - 1);
  }
  function power() { return P.sword + P.str - 1; }          // styr blixtarnas storlek
  function reach() { return C.player.baseReach + Math.min(power(), 12) * 2; }
  function upgradeCost() {
    return P.sword === 0 ? C.weapon.craftCost : C.weapon.upgradeCostBase + C.weapon.upgradeCostStep * P.sword;
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
    P.pu = 0.6; addTrauma(0.25);
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
        level: level, hearts: P.hearts, str: P.str, ore: P.ore, meat: P.meat, sword: P.sword
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
  function solid(t) { return t === STONE || t === TREE || t === ORE || t === SMELT; }

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
        if (t === STONE || t === TREE || t === SMELT) return;
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
    map = []; isCave = []; oreHp = {};
    var x, y;
    for (y = 0; y < H; y++) { map[y] = []; isCave[y] = []; for (x = 0; x < W; x++) { map[y][x] = GRASS; isCave[y][x] = false; } }
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) { map[y][x] = STONE; continue; }
      var r = rnd();
      if (r < L.treeDensity) map[y][x] = TREE; else if (r < L.treeDensity + L.stoneDensity) map[y][x] = STONE;
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
    var oreWanted = Math.round(L.baseOre + L.orePerLevel * n), placed = 0, tries = 0;
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
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (map[y][x] === ORE) oreHp[x + ',' + y] = C.mining.hitsPerOre;
    if (!reachable(2, 2, ex, ey)) {
      if (attempt < 30) return buildLevel(n, attempt + 1);
      carvePath(2, 3, ex, ey);                          // rad 3 går förbi smältstationen på rad 2
    }
    var open = openFrom(2, 2);

    // monster
    mons = []; items = [];
    var count = Math.min(C.level.maxMonsters, Math.round(L.baseMonsters + L.monstersPerLevel * n));
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
      var hp = d.hpBase + d.hpPerLevel * n;
      mons.push({ type: k, x: s.x, y: s.y, r: d.radius, hp: hp, maxHp: hp, dmg: d.dmgBase + d.dmgPerLevel * n,
        speed: Math.min(d.maxSpeed, d.speed + d.speedPerLevel * n), cd: 0, kx: 0, ky: 0, hit: 0, pop: 9, ph: rnd() * 6 });
    }
    kills = 0; quota = mons.length;
    // föremål: kristaller i grottor, hjärta, kött
    for (i = 0; i < L.crystalsPerLevel; i++) { var c1 = freeSpot(true) || freeSpot(false); if (c1) items.push({ t: 'crystal', x: c1.x, y: c1.y }); }
    if (n % L.heartEveryNLevels === 0) { var h1 = freeSpot(true) || freeSpot(false); if (h1) items.push({ t: 'heart', x: h1.x, y: h1.y }); }
    for (i = 0; i < L.extraMeat; i++) { var m1 = freeSpot(false); if (m1) items.push({ t: 'meat', x: m1.x, y: m1.y }); }
    mapSeed = n; mapDirty = true;
  }

  function startLevel(n) {
    level = n; buildLevel(n, 0);
    P.x = 2.5 * TS; P.y = 3.5 * TS; P.inv = 1; fx = []; texts = []; fade = 1;
    state = 'play'; save();
    say('Nivå ' + n + ': besegra ' + quota + ' monster');
  }

  function newGame() { P = newPlayer(); startLevel(1); }
  function continueGame(s) {
    P = newPlayer(); P.hearts = s.hearts; P.str = s.str; P.ore = s.ore; P.meat = s.meat; P.sword = s.sword; P.hp = maxHp();
    startLevel(s.level);
  }

  // ---------- rörelse och kollision ----------
  function blockedAt(px, py, r) {
    var x0 = Math.floor((px - r) / TS), x1 = Math.floor((px + r) / TS), y0 = Math.floor((py - r) / TS), y1 = Math.floor((py + r) / TS);
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) return true;
      if (solid(map[y][x])) return true;
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
    P.cd = C.player.attackCooldown; P.swing = 0.18;
    var rc = reach(), hitAny = false, dmg = damage();
    mons.forEach(function (m) {
      var dx = m.x - P.x, dy = m.y - P.y, d = Math.hypot(dx, dy);
      if (d > rc + m.r) return;
      var dot = d > 0 ? (dx * P.fx + dy * P.fy) / d : 1;
      if (dot < 0.2 && d > m.r + 14) return;      // bara framför spelaren (generös båge)
      m.hp -= dmg; m.hit = 0.12; m.pop = 0; hitAny = true;
      if (d > 0) { m.kx = dx / d * C.monsters.knockback; m.ky = dy / d * C.monsters.knockback; }
      sparks(m.x, m.y, PAL.bolt, 6);
      floatText(m.x, m.y - m.r - 8, fmt(dmg), '#ffffff');
    });
    if (hitAny) { addTrauma(0.32); freeze(0.05); }
    // hacka malm framför
    var tx = P.x + P.fx * (P.r + 10), ty = P.y + P.fy * (P.r + 10), t = tileAt(tx, ty);
    if (t.x >= 0 && t.y >= 0 && t.x < W && t.y < H && map[t.y][t.x] === ORE) {
      var key = t.x + ',' + t.y; oreHp[key]--;
      sparks((t.x + 0.5) * TS, (t.y + 0.5) * TS, PAL.gold, 7); addTrauma(0.1);
      if (oreHp[key] <= 0) {
        map[t.y][t.x] = isCave[t.y][t.x] ? CAVE : GRASS; delete oreHp[key]; mapDirty = true;
        sparks((t.x + 0.5) * TS, (t.y + 0.5) * TS, '#9a9ea6', 12);
        P.ore += C.mining.oreYield; say('+ malm');
        floatText((t.x + 0.5) * TS, t.y * TS, '+' + C.mining.oreYield + ' malm', PAL.gold);
      }
    }
  }

  function useE() {
    if (state !== 'play') return;
    if (smeltPos && Math.hypot(smeltPos.x - P.x, smeltPos.y - P.y) < TS * 2) {
      if (P.sword >= C.weapon.maxSwordLevel) { say('Svärdet är redan maxat'); return; }
      var cost = upgradeCost();
      if (P.ore >= cost) {
        P.ore -= cost; P.sword++;
        say(P.sword === 1 ? 'Du smidde ett svärd!' : 'Svärdet uppgraderat till nivå ' + P.sword);
        sparks(smeltPos.x, smeltPos.y, '#ffb347', 24); powerUp(); save();
      } else say('Behöver ' + cost + ' malm (du har ' + P.ore + ')');
      return;
    }
    if (P.meat > 0 && P.hp < maxHp()) {
      P.meat--; P.hp = Math.min(maxHp(), P.hp + C.items.meatHeal); say('Mums! + hälsa'); sparks(P.x, P.y, '#ff7a7a', 8);
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
    P.cd -= dt; P.inv -= dt; P.swing -= dt; if (P.pu > 0) P.pu -= dt;
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
      move(P, ax * C.player.speed * sp * dt, ay * C.player.speed * sp * dt);
      P.walk += dt * 12 * sp;
    } else if (mouse.has && mouse.down) {
      var mdx = mouse.x - P.x, mdy = mouse.y - P.y, ml = Math.hypot(mdx, mdy) || 1; P.fx = mdx / ml; P.fy = mdy / ml;
    }
    if (touch.atkId !== null && !P.moving) aimNearest();
    if (keys[' '] || mouse.down || touch.atkId !== null) attack();

    // monster
    mons.forEach(function (m) {
      m.hit -= dt; m.cd -= dt; m.pop += dt;
      var d = dist(m, P) || 0.01, inCave = isCave[clamp(Math.floor(m.y / TS), 0, H - 1)][clamp(Math.floor(m.x / TS), 0, W - 1)];
      var range = inCave ? C.monsters.caveAggroRange : C.monsters.aggroRange;
      var vx = m.kx, vy = m.ky; m.kx *= 0.85; m.ky *= 0.85;
      if (d < range) {
        var s = m.speed * (m.type === 'bat' ? 1 + 0.3 * Math.sin(time * 6 + m.ph) : 1);
        vx += (P.x - m.x) / d * s; vy += (P.y - m.y) / d * s;
      } else {
        vx += Math.cos(time * 0.7 + m.ph) * 12; vy += Math.sin(time * 0.9 + m.ph) * 12;
      }
      var ox = m.x, oy = m.y; move(m, vx * dt, vy * dt);
      if (m.x === ox && m.y === oy && d < range) {          // fastnat: försök glida runt hinder
        move(m, (P.y - m.y) / d * m.speed * dt, -(P.x - m.x) / d * m.speed * dt);
      }
      if (d < m.r + P.r + 3 && m.cd <= 0 && P.inv <= 0) {
        P.hp -= m.dmg; P.inv = C.player.invulnAfterHit; m.cd = C.monsters.attackCooldown;
        addTrauma(0.5); sparks(P.x, P.y, '#ff4d4d', 10);
        floatText(P.x, P.y - 26, '-' + fmt(m.dmg), '#ff6b6b');
        if (P.hp <= 0) die();
      }
    });
    // döda
    mons = mons.filter(function (m) {
      if (m.hp > 0) return true;
      kills++; sparks(m.x, m.y, C.monsters[m.type].color, 18); sparks(m.x, m.y, PAL.bolt, 6);
      addTrauma(0.3); freeze(0.08);
      if (Math.random() < C.items.meatDropChance) items.push({ t: 'meat', x: m.x, y: m.y });
      return false;
    });
    // plocka upp
    items = items.filter(function (it) {
      if (Math.hypot(it.x - P.x, it.y - P.y) > 18) return true;
      if (it.t === 'meat') { if (P.meat >= C.items.maxMeat) return true; P.meat++; say('+ köttklubba'); floatText(it.x, it.y - 14, '+1 kött', '#ffb38a'); }
      else if (it.t === 'heart') { P.hearts += C.items.heartMaxHpGain; P.hp += C.player.hpPerHeart * C.items.heartMaxHpGain; say('+ hjärta! Maxhälsan ökade'); floatText(it.x, it.y - 14, '+ hjärta', PAL.heart); }
      else if (it.t === 'crystal') { P.str += C.items.crystalStrengthGain; say('+ kristall! Du känner dig starkare'); floatText(it.x, it.y - 14, '+ styrka', '#8ff0ff'); powerUp(); }
      sparks(it.x, it.y, '#ffffff', 12); save(); return false;
    });
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
      return f.t > 0;
    });
  }

  // saker som går i verklig tid, även under hit-stop
  function realUpdate(dt) {
    trauma = Math.max(0, trauma - 1.3 * dt); shakeT += dt * 30;
    if (fade > 0) fade = Math.max(0, fade - dt * 2.2);
    texts = texts.filter(function (t) { t.t += dt; t.y -= 32 * dt; t.x += t.vx * dt; return t.t < t.life; });
  }

  // på pekskärm finns ingen mus att sikta med: vänd dig mot närmaste monster inom räckhåll
  function aimNearest() {
    var best = null, bd = reach() * 1.8;
    mons.forEach(function (m) { var d = dist(m, P); if (d < bd) { bd = d; best = m; } });
    if (best && bd > 0) { P.fx = (best.x - P.x) / bd; P.fy = (best.y - P.y) / bd; }
  }

  function die() {
    state = 'dead'; deadAt = performance.now();
    P.ore = Math.floor(P.ore / 2); save();
    addTrauma(1); sparks(P.x, P.y, '#ffffff', 26);
  }

  // ---------- skala till fönstret (skarp grafik på alla skärmar) ----------
  var RS = 1, mapDirty = true, vignette = null;
  var mapCv = document.createElement('canvas'), mg = mapCv.getContext('2d');
  var caveCv = document.createElement('canvas'), cg = caveCv.getContext('2d');
  var lightCv = document.createElement('canvas'), lg = lightCv.getContext('2d');
  var oreTiles = [], smeltPos = null, exitPos = null;

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var s = Math.min(window.innerWidth / LW, window.innerHeight / LH);
    if (!(s > 0)) s = 1;
    cv.style.width = Math.floor(LW * s) + 'px'; cv.style.height = Math.floor(LH * s) + 'px';
    var rs = clamp(s * dpr, 1, 3);
    if (Math.abs(rs - RS) > 0.01 || cv.width !== Math.round(LW * rs)) {
      RS = rs; cv.width = Math.round(LW * RS); cv.height = Math.round(LH * RS); mapDirty = true; vignette = null;
    }
  }
  window.addEventListener('resize', resize);

  // ---------- kartan ritas en gång per nivå ----------
  function renderMapCache() {
    var pw = Math.round(LW * RS), ph = Math.round(LH * RS), x, y;
    [mapCv, caveCv, lightCv].forEach(function (c) { if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; } });
    mg.setTransform(RS, 0, 0, RS, 0, 0); mg.clearRect(0, 0, LW, LH);
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
    cg.setTransform(RS, 0, 0, RS, 0, 0);
    cg.filter = 'blur(' + Math.round(9 * RS) + 'px)';
    cg.fillStyle = 'rgba(6,7,18,0.86)';
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (isCave[y][x]) cg.fillRect(x * TS - 3, y * TS - 3, TS + 6, TS + 6);
    cg.filter = 'none';
    mapDirty = false;
  }

  function drawGround(c, x, y) {
    var px = x * TS, py = y * TS, r = hash(x, y, 1), i, a, b;
    if (isCave[y][x]) {
      c.fillStyle = r < 0.5 ? '#232536' : '#262839'; c.fillRect(px, py, TS, TS);
      for (i = 0; i < 4; i++) {
        a = hash(x, y, 10 + i); b = hash(x, y, 20 + i);
        c.fillStyle = i === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(170,180,255,0.06)';
        c.beginPath(); c.ellipse(px + 4 + a * 24, py + 4 + b * 24, 1.5 + a * 2.5, 1 + b * 1.5, 0, 0, 7); c.fill();
      }
      return;
    }
    c.fillStyle = ['#3d8c38', '#40913a', '#3a8735', '#43933c'][Math.floor(r * 4)]; c.fillRect(px, py, TS, TS);
    a = hash(x, y, 2);
    c.fillStyle = a < 0.5 ? 'rgba(255,255,170,0.045)' : 'rgba(0,40,0,0.06)';
    c.beginPath(); c.ellipse(px + 16, py + 16, 14 + a * 6, 10 + a * 4, a * 3, 0, 7); c.fill();
    c.lineWidth = 1.2; c.lineCap = 'round';
    for (i = 0; i < 5; i++) {
      var bx = px + 3 + hash(x, y, 30 + i) * 26, by = py + 7 + hash(x, y, 40 + i) * 23, lean = (hash(x, y, 50 + i) - 0.5) * 5;
      c.strokeStyle = i % 2 ? '#2f7a2c' : '#62b255';
      c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + lean, by - 3.5 - hash(x, y, 60 + i) * 3.5); c.stroke();
    }
    if (hash(x, y, 70) < 0.07) {                          // små blommor
      var fx_ = px + 6 + hash(x, y, 71) * 20, fy_ = py + 6 + hash(x, y, 72) * 20;
      c.fillStyle = ['#ffffff', '#ffe14d', '#ff9ec7', '#b9a6ff'][Math.floor(hash(x, y, 73) * 4)];
      for (i = 0; i < 5; i++) { c.beginPath(); c.arc(fx_ + Math.cos(i * 1.257) * 2, fy_ + Math.sin(i * 1.257) * 2, 1.4, 0, 7); c.fill(); }
      c.fillStyle = '#e0a020'; c.beginPath(); c.arc(fx_, fy_, 1.1, 0, 7); c.fill();
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
        c.fillStyle = '#5d6170';                          // stenkant ut mot ängen
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

  function drawObject(c, t, x, y) {
    var px = x * TS, py = y * TS, i;
    if (t === STONE) {
      var big = 11 + hash(x, y, 81) * 3;
      boulder(c, px + 16, py + 17, big, big * 0.82, '#a4a8b2', '#5c6069', x * 31 + y);
    } else if (t === TREE) {
      var s = 0.85 + hash(x, y, 90) * 0.3, cx = px + 16 + (hash(x, y, 91) - 0.5) * 4, cy = py + 13;
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(cx + 4, py + 28, 13 * s, 5, 0, 0, 7); c.fill();
      c.fillStyle = '#5b3a1e'; c.fillRect(cx - 3, py + 15, 6, 13); c.fillStyle = '#43290f'; c.fillRect(cx + 1, py + 15, 2, 13);
      c.fillStyle = '#1d4a1b'; c.beginPath(); c.arc(cx + 1, cy + 2, 13.5 * s, 0, 7); c.fill();
      c.fillStyle = '#2e6b2a'; c.beginPath(); c.arc(cx, cy, 12 * s, 0, 7); c.fill();
      c.fillStyle = '#3f8a38'; c.beginPath(); c.arc(cx - 3 * s, cy - 3 * s, 8 * s, 0, 7); c.fill();
      c.fillStyle = '#5aa64e'; c.beginPath(); c.arc(cx - 5 * s, cy - 6 * s, 3.5 * s, 0, 7); c.fill();
      if (hash(x, y, 92) < 0.25) {                       // äpplen
        c.fillStyle = '#e0413a';
        for (i = 0; i < 3; i++) { c.beginPath(); c.arc(cx - 6 + hash(x, y, 93 + i) * 12, cy - 4 + hash(x, y, 96 + i) * 10, 1.8, 0, 7); c.fill(); }
      }
    } else if (t === ORE) {
      boulder(c, px + 16, py + 17, 14, 12, '#6b6f7a', '#3a3d47', x * 17 + y * 5);
      for (i = 0; i < 3; i++) {
        var ox = px + 8 + hash(x, y, 100 + i) * 15, oy = py + 9 + hash(x, y, 110 + i) * 13, r = 2.6 + hash(x, y, 120 + i) * 1.8;
        c.fillStyle = '#a8781f'; c.beginPath(); c.moveTo(ox, oy - r); c.lineTo(ox + r, oy); c.lineTo(ox, oy + r); c.lineTo(ox - r, oy); c.closePath(); c.fill();
        c.fillStyle = PAL.gold; c.beginPath(); c.moveTo(ox, oy - r * 0.8); c.lineTo(ox + r * 0.7, oy - 0.2); c.lineTo(ox, oy + r * 0.5); c.lineTo(ox - r * 0.7, oy - 0.2); c.closePath(); c.fill();
        c.fillStyle = '#fff1a8'; c.fillRect(ox - 1, oy - r * 0.6, 1.5, 1.5);
      }
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
    lg.setTransform(RS, 0, 0, RS, 0, 0); lg.globalCompositeOperation = 'destination-out';
    hole(P.x, P.y, 100 + pw_ * 6, 1);
    if (smeltPos) hole(smeltPos.x, smeltPos.y, 80, 0.9);
    if (exitPos) hole(exitPos.x, exitPos.y, 60, 0.7);
    items.forEach(function (it) { if (it.t !== 'meat') hole(it.x, it.y, 36, 0.7); });
    lg.globalCompositeOperation = 'source-over';
    g.drawImage(lightCv, 0, 0, LW, LH);
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
      if (!isCave[cy][cx] || dist(m, P) < 120) return;
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
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 0.9;
    g.beginPath(); g.moveTo(bx + px * 0.6, by + py * 0.6); g.lineTo(hx + ca * (L - 4), hy + sa * (L - 4)); g.stroke();
    g.strokeStyle = '#8a6a2a'; g.lineWidth = 3; g.lineCap = 'round';   // parerstång
    g.beginPath(); g.moveTo(bx + px * 5, by + py * 5); g.lineTo(bx - px * 5, by - py * 5); g.stroke();
    if (a.glow) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = a.glow; g.lineWidth = 6;
      g.beginPath(); g.moveTo(bx, by); g.lineTo(hx + ca * L, hy + sa * L); g.stroke(); g.restore();
    }
  }

  function drawPlayer() {
    var pw = power(), armed;
    if (P.sword === 0) armed = { len: 20 };
    else armed = { sword: true, len: 22 + Math.min(P.sword, 10) * 1.5,
      col: P.sword >= 7 ? '#ffe14d' : P.sword >= 4 ? '#8fd3ff' : '#d8dde6',
      glow: P.sword >= 7 ? 'rgba(255,225,77,0.25)' : P.sword >= 4 ? 'rgba(143,211,255,0.2)' : null };
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
    g.restore();
  }

  function eyes(x, y, gap, r, pr) {
    var d = Math.hypot(P.x - x, P.y - y) || 1, lx = (P.x - x) / d * r * 0.45, ly = (P.y - y) / d * r * 0.45;
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x - gap, y, r, 0, 7); g.arc(x + gap, y, r, 0, 7); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(x - gap + lx, y + ly, pr, 0, 7); g.arc(x + gap + lx, y + ly, pr, 0, 7); g.fill();
  }

  function drawMonsters() {
    mons.forEach(function (m) {
      var d = C.monsters[m.type], flash = m.hit > 0, white = flash && FXC.flash !== false;
      var col = white ? '#ffffff' : flash ? shade(d.color, 0.35) : d.color;
      var k = clamp(m.pop / 0.18, 0, 1), e = easeOutBack(k), sx = 1, sy = 1;
      if (k < 1) { sx = 1.3 + (1 - 1.3) * e; sy = 0.7 + (1 - 0.7) * e; }
      var fly = m.type === 'bat' ? 6 + Math.sin(time * 4 + m.ph) * 2 : 0;
      shadow(m.x, m.y + m.r * 0.85 + (fly ? 4 : 0), m.r * (fly ? 0.7 : 1), fly ? 0.2 : 0.3);
      g.save(); g.translate(m.x, m.y + m.r); g.scale(sx, sy); g.translate(-m.x, -(m.y + m.r) - fly);
      if (m.type === 'slime') {
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
      } else {
        var r2 = m.r, arm = Math.sin(time * 5 + m.ph) * 2;
        g.fillStyle = shade(d.color, -0.25); g.strokeStyle = shade(d.color, -0.65); g.lineWidth = 1.6;
        g.beginPath(); g.arc(m.x - r2 - 2, m.y + 3 + arm, 5, 0, 7); g.fill(); g.stroke();
        g.beginPath(); g.arc(m.x + r2 + 2, m.y + 3 - arm, 5, 0, 7); g.fill(); g.stroke();
        rr(g, m.x - r2, m.y - r2, r2 * 2, r2 * 2, 7);
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
      if (m.hp < m.maxHp) {
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
      } else crystalShape(it.x, it.y + bob, 1);
    });
  }

  function drawFx() {
    fx.forEach(function (f) {
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
      g.globalAlpha = 1 - k * k; g.font = 'bold 15px ' + HAND;
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
  function iconOre(x, y) { g.fillStyle = '#a8781f'; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 6, y); g.lineTo(x, y + 6); g.lineTo(x - 6, y); g.closePath(); g.fill(); g.fillStyle = PAL.gold; g.beginPath(); g.moveTo(x, y - 5); g.lineTo(x + 4, y - 0.5); g.lineTo(x, y + 3); g.lineTo(x - 4, y - 0.5); g.closePath(); g.fill(); }
  function iconSword(x, y) {
    var col = P.sword >= 7 ? '#ffe14d' : P.sword >= 4 ? '#8fd3ff' : P.sword ? '#d8dde6' : '#8a5a2b';
    g.strokeStyle = col; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 6, y + 6); g.lineTo(x + 6, y - 6); g.stroke();
    if (P.sword) { g.strokeStyle = '#8a6a2a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x, y + 6); g.stroke(); }
  }
  function iconSkull(x, y) {
    g.fillStyle = PAL.chalk; g.beginPath(); g.arc(x, y - 1, 6, 0, 7); g.fill(); g.fillRect(x - 3.5, y + 3, 7, 3.5);
    g.fillStyle = '#1a2a1a'; g.beginPath(); g.arc(x - 2.3, y - 1, 1.6, 0, 7); g.arc(x + 2.3, y - 1, 1.6, 0, 7); g.fill();
  }

  function drawHud() {
    g.textBaseline = 'middle';
    // hälsa
    var n = P.hearts, hw = Math.min(22, 250 / n), hs = 8 * hw / 22, w1 = n * hw + 18;
    tag(10, 8, w1, 30);
    for (var i = 0; i < n; i++) {
      var cx = 19 + hs + i * hw, full = clamp((P.hp - i * C.player.hpPerHeart) / C.player.hpPerHeart, 0, 1);
      heartPath(g, cx, 23, hs); g.fillStyle = '#3a1018'; g.fill();
      if (full > 0) { g.save(); heartPath(g, cx, 23, hs); g.clip(); g.fillStyle = PAL.heart; g.fillRect(cx - hs * 1.5, 0, hs * 3 * full, 40); g.restore(); }
      heartPath(g, cx, 23, hs); g.strokeStyle = 'rgba(250,250,242,0.7)'; g.lineWidth = 1; g.stroke();
    }
    // förråd
    var stats = [
      [function (x, y) { crystalShape(x, y, 0.62); }, String(P.str)],
      [iconOre, String(P.ore)],
      [function (x, y) { meatShape(x + 2, y, 0.6); }, String(P.meat)],
      [iconSword, P.sword ? 'nivå ' + P.sword : 'pinne']
    ];
    g.font = 'bold 15px ' + HAND;
    var x0 = 10 + w1 + 10, wStats = 14;
    stats.forEach(function (s) { wStats += 22 + g.measureText(s[1]).width + 16; });
    tag(x0, 8, wStats, 30);
    var xx = x0 + 18;
    stats.forEach(function (s) {
      s[0](xx, 23); xx += 14;
      g.fillStyle = PAL.chalk; g.fillText(s[1], xx, 24); xx += g.measureText(s[1]).width + 24;
    });
    // nivå och monster kvar, högerställt
    var left = quota - kills, t2 = 'Nivå ' + level, t3 = left > 0 ? String(left) : 'portalen är öppen';
    var w2 = g.measureText(t2).width, w3 = g.measureText(t3).width, wR = w2 + w3 + 62;
    tag(LW - 10 - wR, 8, wR, 30);
    g.fillStyle = PAL.chalk; g.fillText(t2, LW - wR + 6, 24);
    if (left > 0) iconSkull(LW - w3 - 30, 23);
    g.fillStyle = left > 0 ? PAL.chalk : '#c9bfff'; g.fillText(t3, LW - w3 - 18, 24);
    // meddelande
    if (msgT > 0) {
      var a = Math.min(1, msgT / 0.4), k = easeOutCubic(Math.min(1, (3 - msgT) / 0.25));
      g.save(); g.globalAlpha = a; g.font = 'bold 17px ' + HAND;
      var mw = g.measureText(msg).width + 34, my = 30 + 22 * k;
      tag(LW / 2 - mw / 2, my, mw, 32);
      g.textAlign = 'center'; g.fillStyle = PAL.bolt; g.fillText(msg, LW / 2, my + 17);
      g.restore(); g.textAlign = 'left';
    }
    // hint vid smältstation
    if (state === 'play' && smeltPos && Math.hypot(smeltPos.x - P.x, smeltPos.y - P.y) < TS * 2) {
      var ht = 'E: ' + (P.sword === 0 ? 'smid svärd' : P.sword >= C.weapon.maxSwordLevel ? 'max' : 'uppgradera') + ' (' + upgradeCost() + ' malm)';
      g.font = 'bold 13px ' + HAND;
      var hw2 = g.measureText(ht).width + 20, hx = clamp(smeltPos.x - hw2 / 2, 6, LW - hw2 - 6), hy = smeltPos.y + 26;
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
    g.font = 'bold 16px ' + HAND; g.fillStyle = PAL.bolt; g.fillText('Mines & Monsters, version 2', cx, cy + 156);
    g.font = '15px ' + UI; g.fillStyle = 'rgba(250,250,242,0.85)';
    if (touchMode) {
      g.fillText('Dra med vänster tumme för att gå. Tryck på högra halvan för att slå och hacka.', cx, cy + 196);
      g.fillText('Knappen bredvid smider vid ugnen och äter kött annars.', cx, cy + 218);
    } else {
      g.fillText('Piltangenter eller WASD för att gå. Mellanslag eller musklick för att slå och hacka.', cx, cy + 196);
      g.fillText('E smider vid ugnen och äter kött annars.', cx, cy + 218);
    }
    var pulse = 0.65 + 0.35 * Math.sin(time * 4), start;
    if (touchMode) start = saved ? 'Tryck för att fortsätta på nivå ' + saved.level : 'Tryck för att börja';
    else start = saved ? 'Enter fortsätter på nivå ' + saved.level + ', N börjar om' : 'Tryck Enter för att börja';
    g.globalAlpha = pulse; g.font = 'bold 20px ' + HAND; g.fillStyle = PAL.chalk;
    g.fillText(start, cx, cy + 262);
    g.globalAlpha = 1;
    if (touchMode && saved) {
      tag(BTN_NEW.x - BTN_NEW.w / 2, BTN_NEW.y - BTN_NEW.h / 2, BTN_NEW.w, BTN_NEW.h);
      g.font = 'bold 17px ' + HAND; g.fillStyle = PAL.chalk; g.fillText('Nytt spel', BTN_NEW.x, BTN_NEW.y + 1);
    }
    g.textAlign = 'left';
  }
  function overlayDead() {
    var vg = g.createRadialGradient(LW / 2, LH / 2, 60, LW / 2, LH / 2, LW * 0.7);
    vg.addColorStop(0, 'rgba(40,0,0,0.55)'); vg.addColorStop(1, 'rgba(90,0,10,0.85)');
    g.fillStyle = vg; g.fillRect(0, 0, LW, LH);
    chalkTitle('Du föll!', LW / 2, LH / 2 - 24, 52);
    g.font = '16px ' + UI; g.fillStyle = 'rgba(250,250,242,0.9)';
    g.fillText('Du tappade halva malmen. ' + (touchMode ? 'Tryck på skärmen' : 'Tryck Enter') + ' för att försöka nivå ' + level + ' igen.', LW / 2, LH / 2 + 30);
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
    g.drawImage(mapCv, 0, 0, LW, LH);
    drawDynamicTiles(); drawItems(); drawMonsters(); drawPlayer(); drawFx();
    drawLighting(); drawCaveEyes(); drawTexts();
    g.restore();
    drawVignette();
    if (state !== 'title') { drawHud(); drawTouch(); }
    if (fade > 0) { g.fillStyle = 'rgba(0,0,0,' + fade + ')'; g.fillRect(0, 0, LW, LH); }
    if (state === 'dead') overlayDead();
    if (state === 'title') overlayTitle();
    if (touchMode && window.innerHeight > window.innerWidth * 1.05) {
      g.fillStyle = 'rgba(8,16,10,0.88)'; g.fillRect(0, 0, LW, LH);
      chalkTitle('Vrid plattan', LW / 2, LH / 2 - 20, 56);
      g.font = '22px ' + UI; g.fillStyle = PAL.chalk; g.fillText('Spelet spelas i liggande läge.', LW / 2, LH / 2 + 40); g.textAlign = 'left';
    }
  }

  // ---------- pekskärmskontroller ----------
  function touchButton(b, pressed, label) {
    g.globalAlpha = pressed ? 0.8 : 0.5;
    g.fillStyle = 'rgba(16,36,18,0.9)'; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill();
    g.strokeStyle = pressed ? PAL.bolt : PAL.chalk; g.lineWidth = 2.5; g.stroke();
    g.globalAlpha = pressed ? 1 : 0.85; g.fillStyle = pressed ? PAL.bolt : PAL.chalk;
    g.font = 'bold ' + (b.r > 45 ? 22 : 16) + 'px ' + HAND; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(label, b.x, b.y + 1); g.textAlign = 'left';
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
      g.globalAlpha = 0.4; g.font = '15px ' + HAND; g.fillStyle = PAL.chalk; g.textAlign = 'center';
      g.fillText('dra för att gå', 110, LH - 110); g.textAlign = 'left';
    }
    var nearSmelt = smeltPos && Math.hypot(smeltPos.x - P.x, smeltPos.y - P.y) < TS * 2;
    touchButton(BTN_ATK, touch.atkId !== null, 'slå');
    touchButton(BTN_E, touch.eId !== null, nearSmelt ? 'smid' : 'ät');
    g.restore();
  }

  // ---------- indata ----------
  window.addEventListener('keydown', function (e) {
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(k) >= 0) e.preventDefault();
    if (keys[k]) return; keys[k] = true;
    if (k === ' ') attack();                             // slå direkt, så att korta tryck aldrig missas
    if (k === 'e') useE();
    if (k === 'Enter') {
      if (state === 'dead') { P.hp = maxHp(); startLevel(level); }
      else if (state === 'title') { var s = load(); if (s) continueGame(s); else newGame(); }
    }
    if (k === 'n' && state === 'title') newGame();
  });
  window.addEventListener('keyup', function (e) { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; });
  window.addEventListener('blur', function () { keys = {}; mouse.down = false; touch.joyId = touch.atkId = touch.eId = null; });
  function mpos(e) {
    var r = cv.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * LW / r.width; mouse.y = (e.clientY - r.top) * LH / r.height; mouse.has = true;
  }
  cv.addEventListener('mousemove', mpos);
  cv.addEventListener('mousedown', function (e) {
    if (performance.now() - lastTouch < 800) return;     // webbläsarens låtsas-musklick efter en touch
    mpos(e); mouse.down = true;
    if (state === 'play' && !P.moving) { var dx = mouse.x - P.x, dy = mouse.y - P.y, l = Math.hypot(dx, dy) || 1; P.fx = dx / l; P.fy = dy / l; }
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
    var p = lpos(e);
    if (state === 'title') {
      goFullscreen();
      if (saved && Math.abs(p.x - BTN_NEW.x) < BTN_NEW.w / 2 + 10 && Math.abs(p.y - BTN_NEW.y) < BTN_NEW.h / 2 + 10) newGame();
      else { var s = load(); if (s) continueGame(s); else newGame(); }
      return;
    }
    if (state === 'dead') {
      if (performance.now() - deadAt > 700) { P.hp = maxHp(); startLevel(level); }   // spärr så att ett kvarglömt finger inte startar om direkt
      return;
    }
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
  }
  cv.addEventListener('pointerup', endTouch);
  cv.addEventListener('pointercancel', endTouch);

  // ---------- huvudloop ----------
  P = newPlayer(); level = 1; buildLevel(1, 0); state = 'title';
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
    get items() { return items; }, get map() { return map; }, build: function (n) { buildLevel(n, 0); },
    get fx() { return { trauma: trauma, hitStop: hitStop, texts: texts.length, particles: fx.length }; } };
})();
