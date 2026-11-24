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
    if (P.cd > 0 || state !== 'play' || P.blocking) return;
    P.cd = C.player.attackCooldown; P.swing = 0.18; sfx('swing'); P.fish = null;
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
    prey.forEach(function (p) {                                 // bytesdjur
      if (p.dead) return; var dx = p.x - P.x, dy = p.y - P.y, d = Math.hypot(dx, dy);
      if (d > rc + p.r) return; var dot = d > 0 ? (dx * P.fx + dy * P.fy) / d : 1;
      if (dot < 0.2 && d > p.r + 14) return; catchPrey(p);
    });
    if (hitAny) { addTrauma(0.32); freeze(0.05); sfx('hit'); }
    if (puzzle && !puzzle.solved) puzzleHit(rc);
    // hugg träd och hacka malm framför
    var tx = P.x + P.fx * (P.r + 10), ty = P.y + P.fy * (P.r + 10), t = tileAt(tx, ty);
    if (t.x >= 0 && t.y >= 0 && t.x < W && t.y < H) {
      var tile = map[t.y][t.x], key = t.x + ',' + t.y, cx2 = (t.x + 0.5) * TS, cy2 = (t.y + 0.5) * TS;
      if (tile === FLAX) {                                     // lin: ett slag räcker
        map[t.y][t.x] = GRASS; mapDirty = true; P.flax += 1; markMined(t.x, t.y);
        sparks(cx2, cy2 - 4, '#7ab0ff', 6); sparks(cx2, cy2, '#5aa64e', 6); sfx('chop'); floatText(cx2, t.y * TS, '+1 lin', '#a8c8ff'); save();
      } else if (tile === TREE) {
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
        if (!P.hasPick) {                                      // malm kräver en hacka, först en stenhacka
          sparks(cx2, cy2, '#cfd6e0', 5); sfx('deny');
          if (msgT <= 0 || msg.indexOf('stenhacka') < 0) say('Du behöver en stenhacka för att bryta ' + MET[ot].name + '. Smid den vid ugnen.');
        } else if (P.pick < ot) {                                     // för hård malm: visar vad man behöver
          sparks(cx2, cy2, '#cfd6e0', 5); sfx('deny');
          if (msgT <= 0 || msg.indexOf('För hård') < 0) say('För hård! Du behöver en ' + PICK_NAME[ot] + ' för ' + MET[ot].name + '.');
        } else {
          oreHp[key] -= C.mining.hitsPerOre / Math.max(1, C.mining.hitsPerOre - (P.pick - ot));
          sparks(cx2, cy2, MET[ot].c2, 7); addTrauma(0.1); sfx('mine');
          if (oreHp[key] <= 0.001) {
            map[t.y][t.x] = isCave[t.y][t.x] ? CAVE : GRASS; delete oreHp[key]; mapDirty = true; markMined(t.x, t.y);
            sparks(cx2, cy2, '#9a9ea6', 12);
            var yieldN = C.mining.oreYield + (P.pick - ot >= 2 && DF().bonusYield !== false ? 1 : 0);   /* v3.6: dubbel malm bara på Lätt */ addMetal(ot, yieldN); sfx('ore');
            floatText(cx2, t.y * TS, '+' + yieldN + ' ' + MET[ot].name, MET[ot].c2); save();
          }
        }
      }
    }
  }

  function waterNear() {                                         // närmaste vattenruta intill gubben
    var tx = Math.floor(P.x / TS), ty = Math.floor(P.y / TS), best = null, bd = TS * 1.5;   // även snett intill
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
      if (!map[ty + dy] || map[ty + dy][tx + dx] !== WATER) continue;
      var cx = (tx + dx + 0.5) * TS, cy = (ty + dy + 0.5) * TS, d = Math.hypot(cx - P.x, cy - P.y);
      if (d < bd) { bd = d; best = { x: cx, y: cy }; }
    }
    return best;
  }
  function carcassNear() { for (var i = 0; i < prey.length; i++) if (prey[i].dead && dist(prey[i], P) < 30) return prey[i]; return null; }
  function eMode() {
    if (smeltPos && Math.hypot(smeltPos.x - P.x, smeltPos.y - P.y) < TS * 2) return 'forge';
    if (carcassNear()) return 'skin';
    if (P.fish || (P.rod && waterNear())) return 'fish';
    return 'eat';
  }
  function skinPrey(p) {
    if (!P.knife) { sfx('deny'); say('Du behöver en jaktkniv för att flå ' + PREY_NAME[p.kind] + 'n. Gör den i smedjan, under Verktyg.'); return; }
    prey.splice(prey.indexOf(p), 1);
    P.meat = Math.min(C.items.maxMeat, P.meat + C.prey.meat); var gotHide = Math.random() < C.prey.hideChance; if (gotHide) P.hide++;
    sparks(p.x, p.y, '#ffb38a', 10); sfx('chop'); floatText(p.x, p.y - 16, '+1 kött', '#ffb38a'); if (gotHide) floatText(p.x + 22, p.y - 4, '+1 skinn', '#d9a46a');
    say(gotHide ? 'Du fick kött och ett skinn!' : 'Du fick kött!'); save();
  }
  function fishE() {
    var F = C.fishing;
    if (!P.fish) {
      var w = waterNear(); if (!w) return;
      if (pond && pond.fish <= 0) { sfx('deny'); say('Fiskarna här har slutat nappa.'); return; }
      var dx = w.x - P.x, dy = w.y - P.y, l = Math.hypot(dx, dy) || 1; P.fx = dx / l; P.fy = dy / l;
      P.fish = { x: w.x, y: w.y, phase: 'wait', t: F.waitMin + Math.random() * (F.waitMax - F.waitMin) };
      sfx('click'); say('Vänta tills flötet dyker. Tryck då ' + (touchMode ? 'Fiska' : 'E') + '!'); return;
    }
    if (P.fish.phase === 'bite') {
      var fx2 = P.fish.x, fy2 = P.fish.y; P.fish = null; if (pond) pond.fish--;
      P.meat = Math.min(C.items.maxMeat, P.meat + 1); sfx('splash'); sparks(fx2, fy2, '#9fd8ff', 14);
      floatText(fx2, fy2 - 16, '+1 fisk', '#9fd8ff'); say('En fisk! Den räknas som mat.'); save();
    } else { P.fish = null; sfx('deny'); say('För tidigt! Fisken simmade iväg.'); }
  }
  function useE() {
    if (state !== 'play') return;
    var mode = eMode();
    if (mode === 'forge') { openForge(); return; }
    if (mode === 'skin') { skinPrey(carcassNear()); return; }
    if (mode === 'fish') { fishE(); return; }
    if (P.meat > 0 && P.hp < maxHp()) {
      P.meat--; P.hp = Math.min(maxHp(), P.hp + C.items.meatHeal); say('Mums! + hälsa'); sparks(P.x, P.y, '#ff7a7a', 8); sfx('eat');
      floatText(P.x, P.y - 24, '+' + C.items.meatHeal, '#7dff8a'); save();
    } else if (waterNear() && !P.rod) say('Här kan man fiska! Gör ett fiskespö av trä och lin i smedjan.');
    else if (P.meat > 0) say('Full hälsa'); else say('Ingen mat. Stå vid smältstationen för att smida.');
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

