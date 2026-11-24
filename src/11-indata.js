  // ---------- indata ----------
  window.addEventListener('keydown', function (e) {
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].indexOf(k) >= 0) e.preventDefault();
    if (window.LJUD) LJUD.init();                        // ljud får starta först efter en tangent eller ett tryck
    if (state === 'keys') { e.preventDefault(); keysKey(k); return; }   // v3.7.1: välj egna tangenter
    if (keys[k]) return; keys[k] = true;
    if (state === 'forge') {
      if (k === 'Escape' || k === 'e' || k === 'p' || isKey('use', k)) closeForge();
      else if (k === 'Tab' || k === 'ArrowRight' || k === 'd') switchTab((forgeTab + 1) % TABS.length);
      else if (k === 'ArrowLeft' || k === 'a') switchTab((forgeTab + TABS.length - 1) % TABS.length);
      else if (k === 'ArrowUp' || k === 'w') forgeSel = (forgeSel + forgeRows().length - 1) % forgeRows().length;
      else if (k === 'ArrowDown' || k === 's') forgeSel = (forgeSel + 1) % forgeRows().length;
      else if (k === 'Enter' || k === ' ') buy(forgeSel);
      else if ('123456'.indexOf(k) >= 0 && k.length === 1 && +k <= forgeRows().length) { forgeSel = +k - 1; buy(forgeSel); }
      return;
    }
    if (k === 'Escape' || k === 'p') { if (state === 'play') pauseGame(); else if (state === 'paused') resumeGame(); else if (state === 'title') { newPick = -1; moreSlot = -1; } return; }
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
    if (isKey('shield', k)) shieldPress();
    if (state === 'play' && isKey('attack', k)) attack();   // slå direkt, så att korta tryck aldrig missas
    if (state === 'title') {                               // sparplatser
      if (moreSlot >= 0 && (k === 'Enter' || k === ' ')) return;
      if (newPick >= 0) {                                   // välj svårighet för nytt spel
        if (k === 'ArrowLeft' || k === 'a') diffSel = (diffSel + 2) % 3; else if (k === 'ArrowRight' || k === 'd') diffSel = (diffSel + 1) % 3;
        else if (k === 'Enter' || k === ' ') startNew(newPick, DIFF_ORDER[diffSel]); else if (k === 'Backspace') newPick = -1;
        return;
      }
      if (k === 'ArrowLeft' || k === 'a') { titleSel = (titleSel + SLOT_N - 1) % SLOT_N; sfx('click'); }
      else if (k === 'ArrowRight' || k === 'd') { titleSel = (titleSel + 1) % SLOT_N; sfx('click'); }
      else if (k === 'Enter' || k === ' ') chooseSlot(titleSel);
      else if ((k === 'Delete' || k === 'Backspace') && slots[titleSel]) askDelete(titleSel);
      return;
    }
    if (isKey('bolt', k)) castStorm();
    if (isKey('bow', k)) pressBow();
    if (isKey('use', k)) useE();
    if (k === 'Enter') {
      if (state === 'dead') { P.hp = maxHp(); startLevel(level); }
    }
  });
  window.addEventListener('keyup', function (e) { var k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = false; if (isKey('bow', k)) releaseBow(); if (isKey('shield', k)) shieldRelease(); });
  window.addEventListener('blur', function () { keys = {}; mouse.down = false; touch.shieldId = null; touch.bowId = null; touch.joyId = touch.atkId = touch.eId = null; if (P) { P.bowHold = 0; P.atkHold = 0; P.spinCharge = 0; } pauseGame(); });
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
    if (e.button === 1 || e.button > 2) e.preventDefault();     // mitten- och sidoknappar: ingen rullning eller bakåt
    if (state === 'keys') { keysHit(toBox(mp), e.button); return; }
    if (state !== 'play' && e.button !== 0) return;            // menyerna svarar bara på vänster knapp
    if (state === 'forge') { forgeHit(toBox(mp)); return; }
    if (state === 'paused') { pauseHit(toBox(mp)); return; }
    if (state === 'title') { titleHit(toBox(mp), false); return; }
    if (state === 'dead') { if (performance.now() - deadAt > 700) { P.hp = maxHp(); startLevel(level); } return; }
    if (state === 'play' && onPauseBtn(mp)) { pauseGame(); return; }
    var mk = 'Mouse' + e.button;                                 // v3.7.2: musknapparna är som tangenter (Styrning)
    if (keys[mk]) return; keys[mk] = true; mouse.down = true;
    if (!P.moving && (isKey('attack', mk) || isKey('bow', mk))) { var mw2 = toWorld(mouse.x, mouse.y), dx = mw2.x - P.x, dy = mw2.y - P.y, l = Math.hypot(dx, dy) || 1; P.fx = dx / l; P.fy = dy / l; }
    if (isKey('shield', mk)) shieldPress();
    if (isKey('attack', mk)) attack();
    if (isKey('bow', mk)) pressBow();
    if (isKey('bolt', mk)) castStorm();
    if (isKey('use', mk)) useE();
  });
  window.addEventListener('mouseup', function (e) {
    var mk = 'Mouse' + e.button; if (e.button === 1 || e.button > 2) e.preventDefault();
    if (!keys[mk]) return; keys[mk] = false; mouse.down = e.buttons !== 0;
    if (isKey('bow', mk)) releaseBow();
    if (isKey('shield', mk)) shieldRelease();
  });
  window.addEventListener('auxclick', function (e) { if (e.button !== 0) e.preventDefault(); });
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
    if (state === 'keys') { keysHit(toBox(p)); return; }
    if (state === 'play' && onPauseBtn(p)) { pauseGame(); return; }
    if (state === 'title') {
      goFullscreen();
      titleHit(toBox(p), true);
      return;
    }
    if (state === 'dead') {
      if (performance.now() - deadAt > 700) { P.hp = maxHp(); startLevel(level); }   // spärr så att ett kvarglömt finger inte startar om direkt
      return;
    }
    if (P.shield > 0 && Math.hypot(p.x - BTN_SHIELD.x, p.y - BTN_SHIELD.y) < BTN_SHIELD.r * 1.1) { touch.shieldId = e.pointerId; shieldPress(); return; }
    if (P.bow > 0 && Math.hypot(p.x - BTN_BOW.x, p.y - BTN_BOW.y) < BTN_BOW.r * 1.1) { touch.bowId = e.pointerId; pressBow(); return; }
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
    if (importPending) { importPending = false; openImport(importSlot); }   // filväljaren kräver att fingret släpper
    if (e.pointerId === touch.joyId) { touch.joyId = null; touch.jx = touch.jy = 0; }
    if (e.pointerId === touch.atkId) touch.atkId = null;
    if (e.pointerId === touch.eId) touch.eId = null;
    if (e.pointerId === touch.boltId) touch.boltId = null;
    if (e.pointerId === touch.shieldId) { touch.shieldId = null; shieldRelease(); }
    if (e.pointerId === touch.bowId) { touch.bowId = null; releaseBow(); }
  }
  cv.addEventListener('pointerup', endTouch);
  cv.addEventListener('pointercancel', endTouch);

  // ---------- huvudloop ----------
  P = newPlayer(); level = 1; buildLevel(1, 0); state = 'title'; applySettings();
  migrateOldSave(); refreshSlots(); titleSel = Math.max(0, Math.min(SLOT_N - 1, (settings.slot || 1) - 1)); slot = titleSel + 1;
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
  window.__sg = { get keys() { return keys; }, get settings() { return settings; }, maxArrows: maxArrows, setDiff: function (d) { settings.diff = d; applySettings(); }, go: function (n) { startLevel(n); }, pressBow: function () { pressBow(); }, shieldTap: function () { shieldPress(); shieldRelease(); }, releaseBow: function () { releaseBow(); }, allRows: function () { return allRows(); }, get P() { return P; }, get state() { return state; }, get level() { return level; }, get mons() { return mons; },
    get items() { return items; }, get map() { return map; }, build: function (n) { buildLevel(n, 0); }, get puzzle() { return puzzle; }, get oreT() { return oreT; },
    get shots() { return shots; }, get biome() { return biome.name; }, buy: function (i) { buy(i); }, forge: function () { openForge(); },
    step: function (sec) { for (var t = 0; t < sec; t += 0.02) { realUpdate(0.02); if (hitStop > 0) hitStop -= 0.02; else update(0.02); } },   // test: spola fram
    get bossIntro() { return bossIntro; }, get slots() { return slots; }, get slot() { return slot; }, playSlot: function (i) { playSlot(i); }, titleHit: function (x, y, t) { titleHit({ x: x, y: y }, t); }, toTitle: function () { askNew(); }, get prey() { return prey; }, get pond() { return pond; }, useE: function () { useE(); }, tab: function (t) { forgeTab = t; }, get backPos() { return backPos; }, get arrows() { return arrows; }, shoot: function () { shoot(); }, hurt: function (d, x, y) { return hurtPlayer(d, x, y); },
    get fx() { return { trauma: trauma, hitStop: hitStop, texts: texts.length, particles: fx.length }; } };
})();
