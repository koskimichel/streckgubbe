  // ---------- uppdatering ----------
  function update(dt) {
    time += dt; if (msgT > 0) msgT -= dt;
    if (state !== 'play') return;
    P.cd -= dt; P.inv -= dt; P.swing -= dt; P.shootCd -= dt; P.shotT -= dt; P.blockFlash -= dt;
    P.spinCd -= dt; P.bashCd -= dt; P.pwrCd -= dt; P.spinT -= dt; if (P.bowHold > 0) P.bowHold += dt;   // v3.7: krafter
    P.blocking = P.shield > 0 && !!(keys.Shift || mouse.rdown || touch.shieldId != null);   // håller skölden uppe
    P.calmT += dt;
    if (DF().regen && P.calmT > 3 && P.hp < maxHp() && !mons.some(function (m) { return !m.hidden && dist(m, P) < 170; })) {   /* Lätt: läker när det är lugnt */
      P.hp = Math.min(maxHp(), P.hp + DF().regen * C.player.hpPerHeart * dt);
      if (Math.random() < dt * 3) sparks(P.x + (Math.random() - 0.5) * 14, P.y - 10, PAL.heart, 1);
    }
    if (P.pu > 0) P.pu -= dt; if (P.slow > 0) P.slow -= dt; if (P.icy > 0) P.icy -= dt; if (bossIntro > 0) bossIntro -= dt;
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
      var slowK = (P.slow > 0 ? C.spider.slowFactor : 1) * (P.blocking ? C.shield.slow : 1);   // nät och sköld gör en långsam
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
    var atkHeld = !!(keys[' '] || mouse.down || touch.atkId !== null);
    if (!chargeSpin(atkHeld, dt) && atkHeld) attack();         // v3.7: håller man in laddas snurrslaget

    // monster
    mons.forEach(function (m) {
      m.hit -= dt; m.cd -= dt; m.pop += dt;
      var d = dist(m, P) || 0.01, inCave = isCave[clamp(Math.floor(m.y / TS), 0, H - 1)][clamp(Math.floor(m.x / TS), 0, W - 1)];
      if (m.type === 'boss') { updateBoss(m, dt, d); return; }
      var range = inCave ? C.monsters.caveAggroRange : C.monsters.aggroRange;
      if (m.type === 'spider' && !(m.stunT > 0) && spiderAI(m, dt, d)) return;
      var vx = m.kx, vy = m.ky; m.kx *= 0.85; m.ky *= 0.85;
      if (m.stunT > 0) { m.stunT -= dt; move(m, vx * dt, vy * dt); return; }   // v3.6: yr efter sköldstuds, glider bakåt och anfaller inte
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
      if (d < m.r + P.r + 3 && m.cd <= 0 && P.inv <= 0) { m.cd = C.monsters.attackCooldown; hurtPlayer(m.dmg, m.x, m.y, m); }
    });
    if (P.fish) {                                               // fiske: vänta, napp, för sent
      if (P.moving || P.blocking) P.fish = null;
      else { P.fish.t -= dt;
        if (P.fish.t <= 0 && P.fish.phase === 'wait') { P.fish.phase = 'bite'; P.fish.t = C.fishing.biteWindow * (settings.diff === 'latt' ? 1.4 : 1); sfx('bite'); }
        else if (P.fish.t <= 0) { P.fish = null; say('Fisken slapp. Försök igen!'); } }
    }
    updatePrey(dt);
    if (!P.flaxSeen && level <= 3) {                            // första gången: berätta vad de blå blommorna är
      var ftx = Math.floor(P.x / TS), fty = Math.floor(P.y / TS);
      for (var fy = -2; fy <= 2 && !P.flaxSeen; fy++) for (var fxx = -2; fxx <= 2; fxx++) if (map[fty + fy] && map[fty + fy][ftx + fxx] === FLAX) { P.flaxSeen = true; say('De blå blommorna är lin! Slå på dem för att plocka. Lin blir fiskelina och koger.'); break; }
    }
    // spindelnät i luften
    shots = shots.filter(function (sh) {
      sh.t -= dt; sh.x += sh.vx * dt; sh.y += sh.vy * dt;
      if (sh.t <= 0 || blockedAt(sh.x, sh.y, 2)) { sparks(sh.x, sh.y, '#e8e8f0', 4); return false; }
      if (Math.hypot(sh.x - P.x, sh.y - P.y) < P.r + 5) {
        if (!blockedFrom(sh.x - sh.vx, sh.y - sh.vy)) P.slow = C.spider.slowTime;   // skölden stoppar nätet
        sparks(sh.x, sh.y, '#ffffff', 8); sfx('webhit');
        floatText(P.x, P.y - 40, 'fast i nät!', '#e8e8f0'); hurtPlayer(C.spider.shotDamage, sh.x - sh.vx, sh.y - sh.vy);
        return false;
      }
      return true;
    });
    // pilar i luften
    arrows = arrows.filter(function (a) {
      var stp = Math.hypot(a.vx, a.vy) * dt; a.x += a.vx * dt; a.y += a.vy * dt; a.left -= stp;
      if (a.left <= 0 || blockedAt(a.x, a.y, 2)) { sparks(a.x, a.y, '#c9a06a', 4); return false; }
      for (var ai = 0; ai < mons.length; ai++) {
        var m = mons[ai]; if (m.hidden || m.hp <= 0) continue;
        if (Math.hypot(m.x - a.x, m.y - a.y) < m.r + (a.power ? 8 : 4)) {
          if (a.hits && a.hits.indexOf(m) >= 0) continue;        // kraftpilen träffar varje monster en gång
          var l2 = Math.hypot(a.vx, a.vy) || 1, kb = C.monsters.knockback * 0.4 * (m.type === 'boss' ? 0.25 : 1);
          m.hp -= a.dmg; m.hit = 0.12; m.pop = 0; m.kx = a.vx / l2 * kb; m.ky = a.vy / l2 * kb;
          sparks(m.x, m.y, PAL.bolt, 5); floatText(m.x, m.y - m.r - 8, fmt(a.dmg), '#ffffff'); sfx('hit');
          if (a.power && a.pierce > 1) { a.pierce--; a.hits.push(m); continue; }
          return false;
        }
      }
      for (var pi = 0; pi < prey.length; pi++) { var pp = prey[pi]; if (!pp.dead && Math.hypot(pp.x - a.x, pp.y - a.y) < pp.r + 4) { catchPrey(pp); return false; } }
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
      dropLoot(m);
      if (m.type === 'ghost' && Math.random() < 0.05) items.push({ t: 'moon', x: m.x, y: m.y });   // sällsynt månsten
      return false;
    });
    // plocka upp
    items = items.filter(function (it) {
      if (Math.hypot(it.x - P.x, it.y - P.y) > 18) return true;
      if (it.t === 'meat') { if (P.meat >= C.items.maxMeat) return true; P.meat++; say('+ köttklubba'); sfx('meat'); floatText(it.x, it.y - 14, '+1 kött', '#ffb38a'); }
      else if (it.t === 'moon') { P.moon++; P.moonEver = true; say('Månsten! I smedjan kan du lära dig krafter med den.'); sfx('heart'); floatText(it.x, it.y - 14, '+1 månsten', '#cfe6ff'); }
      else if (it.t === 'arrows') { if (P.arrows >= maxArrows()) return true; P.arrows = Math.min(maxArrows(), P.arrows + C.drops.arrowsN); sfx('meat'); floatText(it.x, it.y - 14, '+' + C.drops.arrowsN + ' pilar', '#e1e4ea'); }
      else if (it.t === 'flax') { P.flax++; sfx('meat'); floatText(it.x, it.y - 14, '+1 lin', '#a8c8ff'); }
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
    // utgång framåt och portalen tillbaka
    var et = tileAt(P.x, P.y), etT = map[et.y] ? map[et.y][et.x] : -1;
    if (P.portalLock && etT !== EXIT && etT !== BACK) P.portalLock = false;
    if (etT === EXIT && !P.portalLock) {
      if (exitOpen()) {
        if (kills >= quota) P.hp = Math.min(maxHp(), P.hp + maxHp() * C.player.levelClearHeal);
        if (level + 1 < P.maxLevel) delete P.minedMap[level + 1];   // tidigare nivå: allt har vuxit tillbaka
        startLevel(level + 1); return;
      } else if (msgT <= 0) say('Portalen är låst: ' + (quota - kills) + ' monster kvar');
    } else if (etT === BACK && !P.portalLock && level >= 2) { delete P.minedMap[level - 1]; startLevel(level - 1, true); return; }
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
        if (!f.hitDone && pd < wr + 16 && pd <= f.R + 10) { f.hitDone = true; hurtPlayer(f.dmg, f.x, f.y); }
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
  function shieldBounce(m) {                                  // v3.6: den som slår på skölden kastas bakåt och blir yr
    var dx = m.x - P.x, dy = m.y - P.y, l = Math.hypot(dx, dy) || 1, boss = m.type === 'boss', kb = C.shield.bounce * (boss ? 0.3 : 1);
    m.kx = dx / l * kb; m.ky = dy / l * kb;
    if (!boss) { m.stunT = C.shield.stun[P.shield]; m.cd = Math.max(m.cd, m.stunT); }
  }
  function blockedFrom(sx, sy) {                              // kommer skadan framifrån medan skölden är uppe?
    if (!P.blocking || !P.shield || sx == null) return false;
    var dx = sx - P.x, dy = sy - P.y, l = Math.hypot(dx, dy) || 1;
    return (dx * P.fx + dy * P.fy) / l > C.shield.arc;            // v3.6: skyddar en bred båge, inte bara rakt fram
  }
  function hurtPlayer(dmg, sx, sy, src) {                     // rustningen minskar all skada, skölden det som kommer framifrån
    if (P.inv > 0 || state !== 'play') return false;
    if (blockedFrom(sx, sy)) {
      if (src) shieldBounce(src);                              // v3.6: monstret studsar tillbaka och blir yrt
      dmg *= 1 - C.shield.block[P.shield]; sfx('block'); P.blockFlash = 0.25;
      sparks(P.x + P.fx * 12, P.y - 4 + P.fy * 12, '#ffffff', 10); floatText(P.x, P.y - 40, 'parerad!', '#e6f5ff');
    }
    var d = dmg * (1 - C.upgrades.armor.reducePerLevel * P.armor);
    P.hp -= d; P.inv = C.player.invulnAfterHit * (DF().invMul || 1); P.calmT = 0;
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
        if (Math.hypot(P.x - m.x, P.y - m.y) < 46) hurtPlayer(m.dmg * 1.2, m.x, m.y);
      }
    } else if (m.aiT <= 0) { m.ai = 'walk'; m.aiT = (Df.gap[0] + Math.random() * (Df.gap[1] - Df.gap[0])) * (m.phase2 ? 0.7 : 1); }
    if (!m.hidden && d < m.r + P.r + 3 && m.cd <= 0 && hurtPlayer(m.ai === 'charge' ? m.dmg * 1.4 : m.dmg, m.x, m.y, m)) m.cd = 0.8;
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
    if (d < m.r + P.r + 3 && m.cd <= 0 && P.inv <= 0) { m.cd = C.monsters.attackCooldown; hurtPlayer(m.dmg, m.x, m.y, m); }
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

  function pressBow() {                                       // v3.7: med kraftpil laddar man genom att hålla in
    if (P.parrow > 0 && P.bow > 0 && state === 'play' && P.arrows > 0) { if (!(P.bowHold > 0)) P.bowHold = 0.001; }
    else shoot();
  }
  function releaseBow() {
    if (!(P.bowHold > 0)) return;
    var full = P.bowHold >= C.powers.arrow.charge && P.pwrCd <= 0; P.bowHold = 0; shoot(full);
  }
  function shoot(power) {                                     // pilbåge: siktar själv på närmaste monster inom räckhåll
    if (state !== 'play' || P.blocking) return;
    if (!P.bow) { say('Du har ingen pilbåge. Gör en i smedjan.'); sfx('deny'); return; }
    if (P.arrows <= 0) { say('Slut på pilar. Gör fler i smedjan av trä och sten.'); sfx('deny'); return; }
    if (P.shootCd > 0) return;
    var B = C.bow, PA = C.powers.arrow, best = null, bd = B.range[P.bow] * (power ? PA.rangeMul : 1);
    mons.forEach(function (m) { if (m.hidden) return; var d = dist(m, P); if (d < bd) { bd = d; best = m; } });
    if (!best) prey.forEach(function (p) { if (p.dead) return; var d = dist(p, P); if (d < bd) { bd = d; best = p; } });   // annars ett bytesdjur
    var dx = best ? best.x - P.x : P.fx, dy = best ? best.y - P.y : P.fy, l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l; P.fx = dx; P.fy = dy;
    var ar = { x: P.x + dx * 12, y: P.y - 4 + dy * 12, vx: dx * B.speed, vy: dy * B.speed, left: B.range[P.bow], dmg: arrowDamage(), head: P.arrowHead };
    if (power) { ar.power = true; ar.dmg *= PA.dmgMul[P.parrow]; ar.pierce = PA.pierce[P.parrow]; ar.hits = []; ar.left *= PA.rangeMul; ar.vx *= 1.25; ar.vy *= 1.25; P.pwrCd = PA.cooldown[P.parrow]; addTrauma(0.25); }
    arrows.push(ar);
    P.arrows--; P.shootCd = B.cooldown; P.shotT = 0.35; sfx('bow'); save();
  }

  function die() {
    state = 'dead'; deadAt = performance.now();
    var kp = DF().keep; P.ore = Math.floor(P.ore * kp); P.iron = Math.floor(P.iron * kp); P.gold = Math.floor(P.gold * kp); P.star = Math.floor(P.star * kp); P.wood = Math.floor(P.wood * kp); P.stone = Math.floor(P.stone * kp); save();
    addTrauma(1); sparks(P.x, P.y, '#ffffff', 26); sfx('death');
  }

