  // ---------- skattkammare (v3.0) ----------
  // Ett rum (7 x 4 med stenväggar och en dörr) med en plan framför (7 x 5) där pusslet finns. Dörren öppnas när pusslet är löst.
  function placeTreasure(n, rnd, tw) {
    var kind = tw % 2 === 0 ? 'runes' : 'blocks', wi = tw % 5, lap = lapOf(n);
    for (var tries = 0; tries < 60; tries++) {
      var x0 = 7 + Math.floor(rnd() * (W - 15)), ry = 1 + Math.floor(rnd() * (H - 11)), x, y;
      if (x0 + 6 >= W - 1 || ry + 8 >= H - 1) continue;
      if (x0 + 6 >= W - 5 && ry + 8 >= H - 5) continue;               // inte vid portalen
      var wet = false; for (y = ry - 1; y <= ry + 9; y++) for (x = x0 - 1; x <= x0 + 7; x++) if (map[y] && map[y][x] === WATER) wet = true;
      if (wet) continue;                                           // inte i dammen
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
    var mk = String(level); (P.minedMap[mk] || (P.minedMap[mk] = [])).push(x + ',' + y);
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
    ch.taken = true; P.chests.push(level); P.wood += C.treasure.chestWood; addMetal(tier, n); P.moon += C.treasure.moon; P.moonEver = true;
    sfx('bossdown'); addTrauma(0.4); sparks(ch.x, ch.y, PAL.bolt, 30); fx.push({ k: 'r', x: ch.x, y: ch.y, t: 0.6, life: 0.6 });
    floatText(ch.x, ch.y - 30, '+' + n + ' ' + MET[tier].name, MET[tier].c2);
    floatText(ch.x - 34, ch.y - 12, '+' + C.treasure.chestWood + ' trä', '#d9a46a'); floatText(ch.x + 34, ch.y - 12, '+1 månsten', '#cfe6ff');
    say('Skatten! ' + n + ' ' + MET[tier].name + (pz.perfect ? ' (perfekt-bonus)' : '') + ', ' + C.treasure.chestWood + ' trä och en månsten.'); save();
  }

  function startLevel(n, back) {
    level = n; P.maxLevel = Math.max(P.maxLevel || 1, n); P.fish = null; goalLast = '';
    Object.keys(P.minedMap).forEach(function (k) { if (+k < P.maxLevel - 12) delete P.minedMap[k]; });   // gamla nivåer glöms
    buildLevel(n, 0);
    if (back) { P.x = (W - 3.5) * TS; P.y = (H - 2.5) * TS; P.portalLock = true; } else { P.x = 2.5 * TS; P.y = 3.5 * TS; P.portalLock = false; }
    P.inv = 1; camSnap = true; fx = []; texts = []; fade = 1; shots = []; arrows = []; P.slow = 0;
    state = 'play'; save(); sfx('level');
    if (n >= 2 && settings.guide) { settings.guide = false; applySettings(); }   // guiden behövs bara första gången
    var bossLvl = n % C.boss.every === 0 && P.bossDone !== n && n >= P.maxLevel, firstInWorld = (n - 1) % 5 === 0;
    say(bossLvl ? 'Nivå ' + n + ': ' + biome.boss + ' väntar!' : (firstInWorld ? 'Välkommen till ' + biome.name + (lapOf(n) ? ', varv ' + (lapOf(n) + 1) : '') + '! ' : '') + 'Nivå ' + n + ': besegra ' + quota + ' monster');
    if (n < P.maxLevel) say('Tillbaka på nivå ' + n + '. Malmen har vuxit tillbaka, och portalen framåt är öppen.');
    else if (n >= 2 && !P.backSeen && !bossLvl) { P.backSeen = true; say('Nivå ' + n + ': besegra ' + quota + ' monster. Den blå portalen vid starten tar dig tillbaka till förra nivån.'); save(); }
    if (pond && n >= P.maxLevel && !bossLvl && !P.rod) say('Nivå ' + n + ': det finns en damm här! Med ett fiskespö kan du fiska mat.');
    if (window.LJUD) LJUD.setBiome(biome.i);
    if (puzzle && !P.treasureSeen) { P.treasureSeen = true; say('En skattkammare finns på den här nivån! Leta efter en stängd dörr.'); save(); }
    if (n >= 6 && P.lamp === 0) { P.lamp = 1; say('Du hittade en lykta! Den lyser upp de mörka grottorna.'); powerUp(); save(); }
    bossIntro = bossLvl ? 2.4 : 0;
  }

  function newGame() { P = newPlayer(); settings.guide = true; applySettings(); if (window.LJUD) LJUD.duck(false); startLevel(1); }
  function continueGame(s) {
    if (s.diff && C.difficulty[s.diff]) { settings.diff = s.diff; applySettings(); }   // svårigheten följer sparplatsen
    P = newPlayer(); P.hearts = s.hearts; P.str = s.str; P.ore = s.ore; P.meat = s.meat; P.sword = Math.min(s.sword, C.weapon.maxSwordLevel); P.armor = s.armor || 0; if (s.armorV !== 2 && P.armor > 0) P.armor = [0, 3, 6, 10, 13, 16][Math.min(5, P.armor)]; /* äldre sparningar: samma skydd i nya skalan */ P.pick = s.pick || 0; P.lamp = s.lamp || 0; P.moon = s.moon || 0; P.moonEver = !!s.moonEver; P.bolts = s.bolts || 0; P.wood = s.wood || 0; P.stone = s.stone || 0; P.bossDone = s.bossDone || 0; P.chests = s.chests || oldChests(s.chestDone || 0); P.minedMap = s.minedMap || {}; if (!s.minedMap && s.mined && s.minedLevel) P.minedMap[s.minedLevel] = s.mined; P.maxLevel = s.maxLevel || s.level; P.flax = s.flax || 0; P.hide = s.hide || 0; P.rod = s.rod || 0; P.knife = s.knife || 0; P.quiver = s.quiverV ? (s.quiver || 0) : (s.quiver ? 3 : 0); P.arrowHead = s.arrowHead || 0; P.backSeen = !!s.backSeen; P.flaxSeen = !!s.flaxSeen; P.hasPick = s.hasPick != null ? !!s.hasPick : true; P.shield = s.shield || 0; P.bow = s.bow || 0; P.arrows = s.arrows || 0; P.iron = s.iron || 0; P.gold = s.gold || 0; P.star = s.star || 0; P.treasureSeen = !!s.treasureSeen; P.hp = maxHp();
    startLevel(s.level);
  }

