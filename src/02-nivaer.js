  // ---------- nivågenerering ----------
  function solid(t) { return t === STONE || t === TREE || t === ORE || t === SMELT || t === DOOR || t === WATER; }

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
        if (t === STONE || t === TREE || t === SMELT || t === DOOR || t === WATER) return;
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
    var rnd = mulberry(n * 7919 + attempt * 104729 + 13), L = C.level, oreMul = DF().oreMul || 1;   // v3.6: mindre malm på Medel och Svår
    map = []; isCave = []; oreHp = {}; oreT = {}; treeHp = {}; stoneHp = {}; puzzle = null; pond = null; prey = [];
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
      for (x = cx; x < cx + cw; x++) { if (rnd() < 0.45 * oreMul) { map[cy][x] = ORE; } if (rnd() < 0.45 * oreMul) { map[cy + ch - 1][x] = ORE; } }
    }
    // extra malm på marken, intill sten
    var oreWanted = Math.min(L.maxOre || 99, Math.round((L.baseOre + L.orePerLevel * n) * oreMul)), placed = 0, tries = 0;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (map[y][x] === ORE) placed++;
    while (placed < oreWanted && tries++ < 2000) {
      x = 2 + Math.floor(rnd() * (W - 4)); y = 2 + Math.floor(rnd() * (H - 4));
      if (map[y][x] === GRASS && (x > 6 || y > 6)) { map[y][x] = ORE; placed++; }
    }
    // startyta, smältstation, utgång
    for (y = 1; y <= 4; y++) for (x = 1; x <= 5; x++) { map[y][x] = GRASS; isCave[y][x] = false; }
    map[2][4] = SMELT;
    if (n >= 2) map[1][1] = BACK;                                // v3.3: portal tillbaka till förra nivån
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
    placePond(n); placeFlax(n);
    var mlist = P && P.minedMap && P.minedMap[n];
    if (mlist) mlist.forEach(function (k) {                        // redan bruten malm, huggna träd, brutna stenar och plockat lin
      var q = k.split(','), mx = +q[0], my = +q[1];
      if (map[my] && (map[my][mx] === ORE || map[my][mx] === TREE || map[my][mx] === STONE || map[my][mx] === FLAX)) { map[my][mx] = isCave[my][mx] ? CAVE : GRASS; delete oreHp[k]; delete treeHp[k]; delete stoneHp[k]; }
    });
    if (P) ensureOre(n);
    var tw = Math.floor((n - 1) / 5), tLvl = treasureLevel(tw);
    if (n === tLvl && !(P && P.chests && P.chests.indexOf(n) >= 0)) placeTreasure(n, rnd, tw);   // inte om kistan redan är tagen                     // en skattkammare per värld
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
    if (n % C.boss.every === 0 && !(P && (P.bossDone === n || n < (P.maxLevel || 1)))) {        // boss långt från start (inte om den redan är besegrad), med plats runt sig
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
    if (!pond) for (i = 0; i < C.prey.perLevel; i++) { var ps = freeSpot(false); if (ps) prey.push(newPrey(ps.x, ps.y, n)); }   // bytesdjur
    mapSeed = n; mapDirty = true; biome = biomeOf(n);
  }

  // ---------- natur (v3.3): damm, lin och bytesdjur ----------
  function placePond(n) {                                        // en liten damm var tredje nivå, en bit från start och portal
    if (n % C.nature.pondEvery !== 2) return;
    var rp = mulberry(n * 31337 + 7), x, y;
    for (var tries = 0; tries < 80; tries++) {
      var ww = 3 + (rp() < 0.5 ? 1 : 0), wh = 2, x0 = 2 + Math.floor(rp() * (W - ww - 6)), y0 = 2 + Math.floor(rp() * (H - wh - 6));
      var x1 = x0 + ww + 1, y1 = y0 + wh + 1;
      if (Math.hypot(x0 - 2, y0 - 2) < 9 || (x1 >= W - 6 && y1 >= H - 6)) continue;
      var bad = false;
      for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) { var tt = map[y][x]; if (isCave[y][x] || tt === EXIT || tt === SMELT || tt === DOOR || tt === BACK || x <= 0 || y <= 0 || x >= W - 1 || y >= H - 1) bad = true; }
      if (bad) continue;
      var bm = map.map(function (r) { return r.slice(); });
      for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) map[y][x] = (x > x0 && x < x1 && y > y0 && y < y1) ? WATER : GRASS;
      var op = reachable(2, 2, W - 3, H - 3) ? openFrom(2, 2) : null, shore = [];
      if (op) for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) if (map[y][x] === GRASS && op[y][x]) shore.push({ x: x, y: y });
      if (shore.length < 3) { map = bm; continue; }
      for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) { var k = x + ',' + y; delete oreHp[k]; delete treeHp[k]; delete oreT[k]; }
      pond = { x0: x0, y0: y0, ww: ww, wh: wh, fish: C.fishing.fishPerPond };
      for (var f = 0; f < C.nature.flaxByPond && shore.length > 2; f++) { var si = Math.floor(rp() * shore.length), sp = shore.splice(si, 1)[0]; map[sp.y][sp.x] = FLAX; }
      return;
    }
  }
  function ensureOre(n) {                                        // aldrig fastna: saknar du metallen till svärdet eller hackan får nivån sådan malm
    var rows = allRows(), need = [], mix = C.crafting.oreMix[lapOf(n) > 0 ? 4 : Math.min(4, Math.floor((n - 1) / 5))], minT = 0;
    while (minT < 3 && !mix[minT]) minT++;                       // bara metaller som världen har "lämnat bakom sig", aldrig guld i Ängen
    ['sword', 'pick'].forEach(function (k) {
      var c = rowByKey(rows, k).cost;
      if (c && c.metal != null && c.metal <= minT && metalAmt(c.metal) < c.n && need.indexOf(c.metal) < 0 && (c.metal <= P.pick || (c.metal === 0 && !P.hasPick))) need.push(c.metal);
    });
    if (!need.length) return;
    var re = mulberry(n * 4241 + 11), ores = [], x, y;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (map[y][x] === ORE) ores.push(x + ',' + y);
    need.forEach(function (t) {
      var have = ores.filter(function (k) { return oreT[k] === t; }).length, others = ores.filter(function (k) { return need.indexOf(oreT[k]) < 0; });
      while (have < C.bow.scarceOre && others.length) { var k = others.splice(Math.floor(re() * others.length), 1)[0]; oreT[k] = t; have++; }
    });
  }
  function placeFlax(n) {                                        // lin växer här och där på gräset
    var rf = mulberry(n * 7717 + 3), want = C.nature.flaxPerLevel, t = 0;
    while (want > 0 && t++ < 400) {
      var x = 2 + Math.floor(rf() * (W - 4)), y = 2 + Math.floor(rf() * (H - 4));
      if (map[y][x] !== GRASS || isCave[y][x] || (x <= 6 && y <= 5)) continue;
      map[y][x] = FLAX; want--;
    }
  }
  var PREY_KIND = ['rabbit', 'rabbit', 'lizard', 'hare', 'salamander'], PREY_NAME = { rabbit: 'kanin', lizard: 'ödla', hare: 'hare', salamander: 'salamander' };
  function newPrey(x, y, n) {
    return { kind: PREY_KIND[biomeOf(n).i], x: x, y: y, r: C.prey.radius, hp: 1, dead: false, moving: false, fx: 1, t: 0, dx: 0, dy: 0, run: 0, rest: 0, hop: 0 };
  }
  function updatePrey(dt) {                                      // djuren går omkring, flyr när du kommer nära och blir trötta efter en stund
    var Cp = C.prey;
    prey.forEach(function (p) {
      if (p.dead) return;
      var d = dist(p, P) || 0.01, vx = 0, vy = 0;
      if (p.rest > 0) { p.rest -= dt; p.moving = false; return; }
      if (d < Cp.fear) {
        p.run += dt;
        if (p.run > Cp.runTime) { p.run = 0; p.rest = Cp.restTime; p.moving = false; return; }
        vx = (p.x - P.x) / d * Cp.speed; vy = (p.y - P.y) / d * Cp.speed;
      } else {
        p.run = Math.max(0, p.run - dt * 0.5); p.t -= dt;
        if (p.t <= 0) { p.t = 1 + Math.random() * 2; var a = Math.random() * 6.283, go = Math.random() < 0.5; p.dx = go ? Math.cos(a) : 0; p.dy = go ? Math.sin(a) : 0; }
        vx = p.dx * Cp.wander; vy = p.dy * Cp.wander;
      }
      p.moving = !!(vx || vy); if (vx) p.fx = vx > 0 ? 1 : -1;
      var ox = p.x, oy = p.y; move(p, vx * dt, vy * dt);
      if (p.moving && p.x === ox && p.y === oy) move(p, -vy * dt, vx * dt);   // fast mot en vägg: glid åt sidan
      if (p.moving) p.hop += dt * 14;
    });
  }
  function dropLoot(m) {                                         // kött, annars ibland metall eller pilar; spindlar tappar lin
    var Dr = C.drops, r = Math.random(), pm = C.items.meatDropChance, dOre = DF().metalDrop != null ? DF().metalDrop : Dr.ore;   // v3.6: metall per svårighet
    if (r < pm) items.push({ t: 'meat', x: m.x, y: m.y });
    else if (r < pm + dOre) items.push({ t: 'ore', k: lootMetal(), x: m.x, y: m.y });
    else if (P.bow && r < pm + dOre + Dr.arrows) items.push({ t: 'arrows', x: m.x, y: m.y });
    if (m.type === 'spider' && Math.random() < Dr.spiderFlax) items.push({ t: 'flax', x: m.x + 12, y: m.y + 4 });
  }
  function lootMetal() {
    var mix = C.crafting.oreMix[lapOf(level) > 0 ? 4 : Math.min(4, Math.floor((level - 1) / 5))], rv = Math.random(), acc = 0;
    for (var i = 0; i < 4; i++) { acc += mix[i]; if (rv < acc) return i; }
    return 3;
  }
  function catchPrey(p) {
    p.dead = true; p.moving = false; sparks(p.x, p.y, '#ffffff', 8); sfx('hit');
    floatText(p.x, p.y - 16, 'fångad!', '#ffe7a8');
    say('Du fångade en ' + PREY_NAME[p.kind] + '! ' + (P.knife ? 'Tryck ' + (touchMode ? 'Flå' : 'E') + ' för att flå den.' : 'Gör en jaktkniv i smedjan för att kunna flå den.'));
  }


