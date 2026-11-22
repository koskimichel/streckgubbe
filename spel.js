// Streckgubbe - 2D-monsterfighting. Ren canvas, inga beroenden.
(function () {
  'use strict';
  var C = CONFIG, TS = C.tile, W = C.cols, H = C.rows;
  var cv = document.getElementById('c'), g = cv.getContext('2d');
  var GRASS = 0, STONE = 1, TREE = 2, CAVE = 3, ORE = 4, SMELT = 5, EXIT = 6;
  var SAVE_KEY = 'streckgubbe-save-v1';

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

  // ---------- spelstate ----------
  var P, level, map, isCave, oreHp, mons, items, state, msg = '', msgT = 0, fx = [], kills, quota, time = 0, shake = 0;
  var keys = {}, mouse = { x: 0, y: 0, down: false, has: false };

  function newPlayer() {
    return {
      x: 2.5 * TS, y: 2.5 * TS, r: 10, hearts: C.player.startHearts,
      hp: C.player.startHearts * C.player.hpPerHeart,
      str: C.player.startStrength, ore: 0, meat: 1, sword: 0,
      fx: 1, fy: 0, cd: 0, inv: 0, swing: 0
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
        speed: Math.min(d.maxSpeed, d.speed + d.speedPerLevel * n), cd: 0, kx: 0, ky: 0, hit: 0, ph: rnd() * 6 });
    }
    kills = 0; quota = mons.length;
    // föremål: kristaller i grottor, hjärta, kött
    for (i = 0; i < L.crystalsPerLevel; i++) { var c1 = freeSpot(true) || freeSpot(false); if (c1) items.push({ t: 'crystal', x: c1.x, y: c1.y }); }
    if (n % L.heartEveryNLevels === 0) { var h1 = freeSpot(true) || freeSpot(false); if (h1) items.push({ t: 'heart', x: h1.x, y: h1.y }); }
    for (i = 0; i < L.extraMeat; i++) { var m1 = freeSpot(false); if (m1) items.push({ t: 'meat', x: m1.x, y: m1.y }); }
  }

  function startLevel(n) {
    level = n; buildLevel(n, 0);
    P.x = 2.5 * TS; P.y = 3.5 * TS; P.inv = 1; fx = [];
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
    var rc = reach(), hitAny = false;
    mons.forEach(function (m) {
      var dx = m.x - P.x, dy = m.y - P.y, d = Math.hypot(dx, dy);
      if (d > rc + m.r) return;
      var dot = d > 0 ? (dx * P.fx + dy * P.fy) / d : 1;
      if (dot < 0.2 && d > m.r + 14) return;      // bara framför spelaren (generös båge)
      m.hp -= damage(); m.hit = 0.15; hitAny = true;
      if (d > 0) { m.kx = dx / d * C.monsters.knockback; m.ky = dy / d * C.monsters.knockback; }
      bolt(P.x + P.fx * 12, P.y + P.fy * 12, m.x, m.y, 1);
    });
    // hacka malm framför
    var tx = P.x + P.fx * (P.r + 10), ty = P.y + P.fy * (P.r + 10), t = tileAt(tx, ty);
    if (t.x >= 0 && t.y >= 0 && t.x < W && t.y < H && map[t.y][t.x] === ORE) {
      var key = t.x + ',' + t.y; oreHp[key]--;
      sparks((t.x + 0.5) * TS, (t.y + 0.5) * TS, '#e8c46a', 6);
      if (oreHp[key] <= 0) {
        map[t.y][t.x] = isCave[t.y][t.x] ? CAVE : GRASS; delete oreHp[key];
        P.ore += C.mining.oreYield; say('+ malm');
      }
    } else if (hitAny) shake = 0.12;
  }

  function useE() {
    if (state !== 'play') return;
    var sm = null;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) if (map[y][x] === SMELT) sm = { x: (x + 0.5) * TS, y: (y + 0.5) * TS };
    if (sm && Math.hypot(sm.x - P.x, sm.y - P.y) < TS * 2) {
      if (P.sword >= C.weapon.maxSwordLevel) { say('Svärdet är redan maxat'); return; }
      var cost = upgradeCost();
      if (P.ore >= cost) {
        P.ore -= cost; P.sword++;
        say(P.sword === 1 ? 'Du smidde ett svärd!' : 'Svärdet uppgraderat till nivå ' + P.sword);
        sparks(sm.x, sm.y, '#ffb347', 20); save();
      } else say('Behöver ' + cost + ' malm (du har ' + P.ore + ')');
      return;
    }
    if (P.meat > 0 && P.hp < maxHp()) {
      P.meat--; P.hp = Math.min(maxHp(), P.hp + C.items.meatHeal); say('Mums! + hälsa'); sparks(P.x, P.y, '#ff7a7a', 8); save();
    } else if (P.meat > 0) say('Full hälsa'); else say('Ingen mat. Stå vid smältstationen för att smida.');
  }

  // ---------- effekter ----------
  function sparks(x, y, col, n) {
    for (var i = 0; i < n; i++) fx.push({ k: 'p', x: x, y: y, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, t: 0.4, col: col });
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
    g.strokeStyle = '#fff6a8'; g.lineWidth = w; g.stroke();
    g.strokeStyle = 'rgba(255,225,77,0.5)'; g.lineWidth = w + 3; g.stroke();
  }

  // ---------- uppdatering ----------
  function update(dt) {
    time += dt; if (msgT > 0) msgT -= dt; if (shake > 0) shake -= dt;
    if (state !== 'play') return;
    P.cd -= dt; P.inv -= dt; P.swing -= dt;
    var ax = 0, ay = 0;
    if (keys.ArrowLeft || keys.a) ax -= 1; if (keys.ArrowRight || keys.d) ax += 1;
    if (keys.ArrowUp || keys.w) ay -= 1; if (keys.ArrowDown || keys.s) ay += 1;
    if (ax || ay) {
      var l = Math.hypot(ax, ay); ax /= l; ay /= l; P.fx = ax; P.fy = ay;
      move(P, ax * C.player.speed * dt, ay * C.player.speed * dt);
    } else if (mouse.has && mouse.down) {
      var mdx = mouse.x - P.x, mdy = mouse.y - P.y, ml = Math.hypot(mdx, mdy) || 1; P.fx = mdx / ml; P.fy = mdy / ml;
    }
    if (keys[' '] || mouse.down) attack();

    // monster
    mons.forEach(function (m) {
      m.hit -= dt; m.cd -= dt;
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
        P.hp -= m.dmg; P.inv = C.player.invulnAfterHit; m.cd = C.monsters.attackCooldown; shake = 0.2;
        sparks(P.x, P.y, '#ff4d4d', 8);
        if (P.hp <= 0) die();
      }
    });
    // döda
    mons = mons.filter(function (m) {
      if (m.hp > 0) return true;
      kills++; sparks(m.x, m.y, C.monsters[m.type].color, 14);
      if (Math.random() < C.items.meatDropChance) items.push({ t: 'meat', x: m.x, y: m.y });
      return false;
    });
    // plocka upp
    items = items.filter(function (it) {
      if (Math.hypot(it.x - P.x, it.y - P.y) > 18) return true;
      if (it.t === 'meat') { if (P.meat >= C.items.maxMeat) return true; P.meat++; say('+ köttklubba'); }
      else if (it.t === 'heart') { P.hearts += C.items.heartMaxHpGain; P.hp += C.player.hpPerHeart * C.items.heartMaxHpGain; say('+ hjärta! Maxhälsan ökade'); }
      else if (it.t === 'crystal') { P.str += C.items.crystalStrengthGain; say('+ kristall! Du känner dig starkare'); }
      sparks(it.x, it.y, '#ffffff', 10); save(); return false;
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
    fx = fx.filter(function (f) { f.t -= dt; if (f.k === 'p') { f.x += f.vx * dt; f.y += f.vy * dt; } return f.t > 0; });
  }

  function die() {
    state = 'dead';
    P.ore = Math.floor(P.ore / 2); save();
  }

  // ---------- ritning ----------
  var COLORS = ['#3f8f3a', '#7b7f86', '#2e6b2a', '#22232a'];
  function drawMap() {
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var t = map[y][x], px = x * TS, py = y * TS, cave = isCave[y][x];
      g.fillStyle = cave ? '#22232a' : ((x + y) % 2 ? '#3f8f3a' : '#3a8735'); g.fillRect(px, py, TS, TS);
      if (t === STONE) { g.fillStyle = '#7b7f86'; g.fillRect(px + 2, py + 6, TS - 4, TS - 8); g.fillStyle = '#9a9ea6'; g.fillRect(px + 5, py + 8, 10, 6); }
      else if (t === TREE) { g.fillStyle = '#5b3a1e'; g.fillRect(px + 13, py + 18, 6, 12); g.fillStyle = '#2e6b2a'; g.beginPath(); g.arc(px + 16, py + 14, 13, 0, 7); g.fill(); }
      else if (t === ORE) {
        g.fillStyle = '#4a4d55'; g.fillRect(px + 1, py + 1, TS - 2, TS - 2);
        g.fillStyle = '#f0c94a'; g.fillRect(px + 6, py + 7, 6, 6); g.fillRect(px + 18, py + 14, 7, 7); g.fillRect(px + 8, py + 21, 5, 5);
      }
      else if (t === SMELT) {
        g.fillStyle = '#5a4a44'; g.fillRect(px + 2, py + 4, TS - 4, TS - 6);
        g.fillStyle = '#ff8a2a'; g.fillRect(px + 9, py + 14, 14, 10);
        g.fillStyle = '#ffd36a'; g.fillRect(px + 12, py + 17, 8, 5);
      }
      else if (t === EXIT) {
        var open = kills >= quota;
        g.fillStyle = open ? '#6a5bff' : '#444'; g.beginPath(); g.ellipse(px + 16, py + 16, 13, 15, 0, 0, 7); g.fill();
        g.fillStyle = open ? '#b8b0ff' : '#666'; g.beginPath(); g.ellipse(px + 16, py + 16, 7 + Math.sin(time * 4) * 2, 9, 0, 0, 7); g.fill();
      }
    }
  }

  function stick(x, y, fx_, fy_, col, swing, armed) {
    g.strokeStyle = col; g.lineWidth = 2.5; g.lineCap = 'round';
    g.beginPath(); g.arc(x, y - 14, 5, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x, y + 3); g.moveTo(x, y + 3); g.lineTo(x - 5, y + 12); g.moveTo(x, y + 3); g.lineTo(x + 5, y + 12);
    g.moveTo(x, y - 6); g.lineTo(x + fx_ * 9, y - 2 + fy_ * 6); g.stroke();
    if (armed) {
      var ang = Math.atan2(fy_, fx_) + (swing > 0 ? (0.18 - swing) * 8 - 0.7 : 0);
      var hx = x + fx_ * 9, hy = y - 2 + fy_ * 6, L = armed.len;
      g.strokeStyle = armed.col; g.lineWidth = armed.w;
      g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + Math.cos(ang) * L, hy + Math.sin(ang) * L); g.stroke();
    }
  }

  function drawPlayer() {
    if (P.inv > 0 && Math.floor(time * 20) % 2) return;
    var pw = power(), armed;
    if (P.sword === 0) armed = { len: 20, col: '#8a5a2b', w: 3 };
    else armed = { len: 22 + Math.min(P.sword, 10) * 1.5, col: P.sword >= 7 ? '#ffe14d' : P.sword >= 4 ? '#8fd3ff' : '#d8dde6', w: 4 };
    // blixtaura som växer med styrkan
    var n = Math.min(10, Math.floor(pw / 1.5)), rad = 18 + Math.min(pw, 14) * 2.2;
    for (var i = 0; i < n; i++) {
      var a = time * 2 + i * 6.283 / n, b = a + 0.5;
      drawBolt(P.x + Math.cos(a) * rad * 0.6, P.y + Math.sin(a) * rad * 0.6, P.x + Math.cos(b) * rad, P.y + Math.sin(b) * rad, Math.floor(time * 12) + i, 1.2);
    }
    if (pw >= 3) { g.fillStyle = 'rgba(255,240,120,' + Math.min(0.25, 0.04 * pw) + ')'; g.beginPath(); g.arc(P.x, P.y, rad, 0, 7); g.fill(); }
    // blixt längs vapnet
    if (pw >= 1) {
      var hx = P.x + P.fx * 9, hy = P.y - 2 + P.fy * 6, ang = Math.atan2(P.fy, P.fx);
      drawBolt(hx, hy, hx + Math.cos(ang) * (armed.len + pw * 1.5), hy + Math.sin(ang) * (armed.len + pw * 1.5), Math.floor(time * 15), 1.5);
    }
    stick(P.x, P.y, P.fx, P.fy, '#ffffff', P.swing, armed);
  }

  function drawMonsters() {
    mons.forEach(function (m) {
      var cx = clamp(Math.floor(m.x / TS), 0, W - 1), cy = clamp(Math.floor(m.y / TS), 0, H - 1);
      if (isCave[cy][cx] && dist(m, P) > 170) {            // i mörka grottor syns bara ögonen på avstånd
        g.fillStyle = '#ff3b3b'; g.fillRect(m.x - 5, m.y - 3, 3, 3); g.fillRect(m.x + 2, m.y - 3, 3, 3); return;
      }
      var d = C.monsters[m.type], col = m.hit > 0 ? '#ffffff' : d.color;
      g.fillStyle = col;
      if (m.type === 'slime') { g.beginPath(); g.ellipse(m.x, m.y + 2, m.r, m.r * (0.8 + 0.1 * Math.sin(time * 6 + m.ph)), 0, 0, 7); g.fill(); }
      else if (m.type === 'bat') { var f = Math.sin(time * 18 + m.ph) * 6; g.beginPath(); g.moveTo(m.x, m.y); g.lineTo(m.x - 14, m.y - 4 + f); g.lineTo(m.x - 5, m.y + 4); g.lineTo(m.x + 5, m.y + 4); g.lineTo(m.x + 14, m.y - 4 + f); g.closePath(); g.fill(); }
      else { g.fillRect(m.x - m.r, m.y - m.r, m.r * 2, m.r * 2); g.fillStyle = '#300'; g.fillRect(m.x - 8, m.y - 6, 5, 4); g.fillRect(m.x + 3, m.y - 6, 5, 4); }
      if (m.type !== 'brute') { g.fillStyle = '#111'; g.fillRect(m.x - 4, m.y - 3, 2, 3); g.fillRect(m.x + 2, m.y - 3, 2, 3); }
      if (m.hp < m.maxHp) { g.fillStyle = '#400'; g.fillRect(m.x - 12, m.y - m.r - 8, 24, 3); g.fillStyle = '#e33'; g.fillRect(m.x - 12, m.y - m.r - 8, 24 * Math.max(0, m.hp / m.maxHp), 3); }
    });
  }

  function drawItems() {
    items.forEach(function (it) {
      var bob = Math.sin(time * 4 + it.x) * 2;
      if (it.t === 'meat') { g.fillStyle = '#e9d9c0'; g.fillRect(it.x - 8, it.y - 2 + bob, 6, 4); g.fillStyle = '#b5532f'; g.beginPath(); g.arc(it.x + 2, it.y + bob, 7, 0, 7); g.fill(); }
      else if (it.t === 'heart') { g.fillStyle = '#ff3b5c'; heart(it.x, it.y + bob, 9); }
      else { g.fillStyle = '#6ae6ff'; g.beginPath(); g.moveTo(it.x, it.y - 10 + bob); g.lineTo(it.x + 7, it.y + bob); g.lineTo(it.x, it.y + 10 + bob); g.lineTo(it.x - 7, it.y + bob); g.fill(); }
    });
  }
  function heart(x, y, s) {
    g.beginPath(); g.moveTo(x, y + s * 0.8);
    g.bezierCurveTo(x - s * 1.4, y - s * 0.2, x - s * 0.6, y - s * 1.2, x, y - s * 0.4);
    g.bezierCurveTo(x + s * 0.6, y - s * 1.2, x + s * 1.4, y - s * 0.2, x, y + s * 0.8); g.fill();
  }

  function drawFx() {
    fx.forEach(function (f) {
      if (f.k === 'p') { g.fillStyle = f.col; g.globalAlpha = Math.max(0, f.t * 2.5); g.fillRect(f.x - 2, f.y - 2, 4, 4); g.globalAlpha = 1; }
      else drawBolt(f.x1, f.y1, f.x2, f.y2, f.seed, 2.5);
    });
  }

  function drawHud() {
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 0, cv.width, 34);
    g.font = '15px Segoe UI, Arial'; g.textBaseline = 'middle';
    var x = 10;
    for (var i = 0; i < P.hearts; i++) {
      var full = clamp((P.hp - i * C.player.hpPerHeart) / C.player.hpPerHeart, 0, 1);
      g.fillStyle = '#3a1018'; heart(x + 9, 17, 9);
      if (full > 0) { g.save(); g.beginPath(); g.rect(x - 2, 0, 22 * full, 34); g.clip(); g.fillStyle = '#ff3b5c'; heart(x + 9, 17, 9); g.restore(); }
      x += 22;
    }
    g.fillStyle = '#fff'; x += 14;
    var parts = ['Styrka ' + P.str, 'Malm ' + P.ore, 'Kött ' + P.meat, 'Svärd ' + (P.sword || 'pinne'), 'Nivå ' + level, 'Monster ' + (quota - kills)];
    parts.forEach(function (p) { g.fillText(p, x, 17); x += g.measureText(p).width + 20; });
    if (msgT > 0) { g.textAlign = 'center'; g.fillStyle = 'rgba(0,0,0,0.6)'; var mw = g.measureText(msg).width + 24; g.fillRect(cv.width / 2 - mw / 2, 44, mw, 28); g.fillStyle = '#ffe14d'; g.fillText(msg, cv.width / 2, 58); g.textAlign = 'left'; }
    // hint vid smältstation
    for (var y = 0; y < H; y++) for (var xx = 0; xx < W; xx++) if (map[y][xx] === SMELT && Math.hypot((xx + 0.5) * TS - P.x, (y + 0.5) * TS - P.y) < TS * 2) {
      g.fillStyle = '#fff'; g.textAlign = 'center';
      g.fillText('E: ' + (P.sword === 0 ? 'smid svärd' : P.sword >= C.weapon.maxSwordLevel ? 'max' : 'uppgradera') + ' (' + upgradeCost() + ' malm)', (xx + 0.5) * TS, y * TS - 8); g.textAlign = 'left';
    }
  }

  function overlay(title, sub) {
    g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = 'bold 40px Segoe UI, Arial'; g.fillText(title, cv.width / 2, cv.height / 2 - 20);
    g.font = '18px Segoe UI, Arial'; g.fillText(sub, cv.width / 2, cv.height / 2 + 24); g.textAlign = 'left';
  }

  function draw() {
    g.save();
    if (shake > 0) g.translate((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
    drawMap(); drawItems(); drawMonsters(); drawPlayer(); drawFx();
    g.restore();
    drawHud();
    if (state === 'dead') overlay('Du föll!', 'Tryck Enter för att försöka nivån igen (halva malmen förlorad)');
    if (state === 'title') overlay('STRECKGUBBE', 'Piltangenter/WASD = gå · Mellanslag/musklick = slå och hacka · E = smida/äta · Enter = start');
  }

  // ---------- indata ----------
  window.addEventListener('keydown', function (e) {
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(k) >= 0) e.preventDefault();
    if (keys[k]) return; keys[k] = true;
    if (k === 'e') useE();
    if (k === 'Enter') {
      if (state === 'dead') { P.hp = maxHp(); startLevel(level); }
      else if (state === 'title') { var s = load(); if (s) continueGame(s); else newGame(); }
    }
    if (k === 'n' && state === 'title') newGame();
  });
  window.addEventListener('keyup', function (e) { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; });
  window.addEventListener('blur', function () { keys = {}; mouse.down = false; });
  function mpos(e) {
    var r = cv.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * cv.width / r.width; mouse.y = (e.clientY - r.top) * cv.height / r.height; mouse.has = true;
  }
  cv.addEventListener('mousemove', mpos);
  cv.addEventListener('mousedown', function (e) { mpos(e); mouse.down = true; });
  window.addEventListener('mouseup', function () { mouse.down = false; });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // ---------- huvudloop ----------
  P = newPlayer(); level = 1; buildLevel(1, 0); state = 'title';
  var saved = load();
  if (saved) { var oldDraw = overlay; overlay = function (t, s) { oldDraw(t, s + (t === 'STRECKGUBBE' ? '  ·  N = nytt spel (sparat spel finns, nivå ' + saved.level + ')' : '')); }; }
  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt); draw(); requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // för test: window.__sg exponerar läge
  window.__sg = { get P() { return P; }, get state() { return state; }, get level() { return level; }, get mons() { return mons; },
    get items() { return items; }, get map() { return map; }, build: function (n) { buildLevel(n, 0); } };
})();
