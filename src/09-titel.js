  // ---------- titel och död ----------
  var saved = null;
  function chalkTitle(text, x, y, size) {
    g.font = 'bold ' + size + 'px ' + HAND; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 10; g.strokeText(text, x + 3, y + 4);
    g.fillStyle = PAL.chalk; g.fillText(text, x, y);
    g.globalAlpha = 0.35; g.fillText(text, x + 1.2, y - 1); g.globalAlpha = 1;   // kritstruktur
  }
  // ---------- sparplatser (v3.4) ----------
  var SLOT_N = 3, slot = 1, slots = [null, null, null], titleSel = 0, confirmDel = { i: -1, until: 0 }, titleMsg = '', titleMsgUntil = 0, importSlot = 0, importPending = false, newPick = -1, diffSel = 0, moreSlot = -1;   // moreSlot: platsen som visar Fler val   // newPick: platsen där man väljer svårighet för nytt spel
  var DIFF_DESC = { latt: 'Bra att börja med', medel: 'Lite svårare', svar: 'För den som vill ha en utmaning' };
  function slotKey(i) { return 'mm-plats-' + i; }
  function loadSlot(i) { try { var s = JSON.parse(localStorage.getItem(slotKey(i))); if (s && s.level >= 1) return s; } catch (e) {} return null; }
  function refreshSlots() { for (var i = 0; i < SLOT_N; i++) slots[i] = loadSlot(i + 1); }
  function migrateOldSave() {                                     // den gamla sparningen flyttas till första lediga plats
    try {
      var old = localStorage.getItem(SAVE_KEY); if (!old) return;
      for (var i = 1; i <= SLOT_N; i++) if (!localStorage.getItem(slotKey(i))) { localStorage.setItem(slotKey(i), old); localStorage.removeItem(SAVE_KEY); return; }
    } catch (e) {}
  }
  function tmsg(t) { titleMsg = t; titleMsgUntil = time + 4; }
  function playSlot(i) { slot = i; titleSel = i - 1; settings.slot = i; applySettings(); var s = loadSlot(i); if (s) continueGame(s); else newGame(); }
  function cardRect(i) { return { x: 55 + i * 290, y: 262, w: 270, h: 200 }; }
  function cardBtns(i) {                                         // stor knapp och en liten "Fler val"; där finns kopia och radera med förklaring
    var c = cardRect(i), del = confirmDel.i === i && time < confirmDel.until, sm = c.y + 162;
    if (newPick === i) return [0, 1, 2].map(function (j) { return { k: 'd' + j, x: c.x + 12 + j * 84, y: c.y + 70, w: 78, h: 46, t: DIFF_NAME[DIFF_ORDER[j]], main: true }; })
      .concat([{ k: 'cancel', x: c.x + 70, y: sm, w: 130, h: 28, t: 'Avbryt' }]);
    if (moreSlot === i) {
      var back = { k: 'back', x: c.x + 70, y: sm, w: 130, h: 28, t: 'Tillbaka' };
      if (slots[i]) return [{ k: 'exp', x: c.x + 12, y: c.y + 56, w: 246, h: 44, t: 'Spara en kopia', sub: 'Som fil, för att flytta eller säkra spelet', mid: true },
        { k: 'del', x: c.x + 12, y: c.y + 106, w: 246, h: 44, t: del ? 'Säker? Tryck igen' : 'Radera spelet', sub: del ? 'Det går inte att ångra' : 'Platsen blir tom', mid: true, red: del }, back];
      return [{ k: 'imp', x: c.x + 12, y: c.y + 56, w: 246, h: 44, t: 'Hämta en sparad kopia', sub: 'Välj filen du sparat tidigare', mid: true }, back];
    }
    return [{ k: slots[i] ? 'play' : 'new', x: c.x + 12, y: c.y + 100, w: 246, h: 48, t: slots[i] ? 'Fortsätt spela' : 'Starta nytt spel', main: true },
      { k: 'more', x: c.x + 70, y: sm, w: 130, h: 28, t: 'Fler val' }];
  }
  function startNew(i, d) { settings.diff = d; applySettings(); newPick = -1; playSlot(i + 1); }
  function chooseSlot(i) {                                       // spela, eller välj svårighet först på en tom plats
    if (slots[i]) { playSlot(i + 1); return; }
    newPick = i; diffSel = Math.max(0, DIFF_ORDER.indexOf(settings.diff)); sfx('click');
  }
  function inRect(p, r) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }
  function askDelete(i) {
    if (confirmDel.i === i && time < confirmDel.until) { try { localStorage.removeItem(slotKey(i + 1)); } catch (e) {} confirmDel.i = -1; moreSlot = -1; refreshSlots(); sfx('click'); tmsg('Plats ' + (i + 1) + ' är tom nu.'); }
    else { confirmDel = { i: i, until: time + 3 }; sfx('deny'); tmsg('Tryck Radera igen för att radera plats ' + (i + 1) + '. Det går inte att ångra.'); }
  }
  function exportSlot(i) {
    var s = slots[i]; if (!s) { tmsg('Plats ' + (i + 1) + ' är tom.'); return; }
    try {
      var blob = new Blob([JSON.stringify({ game: 'malm-och-monster', v: 1, save: s })], { type: 'application/json' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'Malm och Monster - plats ' + (i + 1) + ' - nivå ' + s.level + '.mms';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      sfx('craft'); tmsg('Sparfilen hamnar bland dina hämtade filer.');
    } catch (e) { tmsg('Det gick inte att spara filen.'); }
  }
  var fileIn = document.createElement('input'); fileIn.type = 'file'; fileIn.accept = '.mms,.json'; fileIn.style.display = 'none'; document.body.appendChild(fileIn);
  function openImport(i) { importSlot = i; fileIn.value = ''; fileIn.click(); }
  fileIn.addEventListener('change', function () {
    var f = fileIn.files && fileIn.files[0]; if (!f) return;
    if (f.size > 300000) { sfx('deny'); tmsg('Filen är för stor för att vara en sparfil.'); return; }
    var rd = new FileReader();
    rd.onload = function () {
      var s = null; try { var o = JSON.parse(rd.result); s = o && o.game === 'malm-och-monster' ? o.save : o; } catch (e) {}
      if (!s || typeof s !== 'object' || typeof s.level !== 'number' || s.level < 1 || s.level > 999 || typeof s.hearts !== 'number') { sfx('deny'); tmsg('Det där är ingen sparfil från Malm & Monster.'); return; }
      refreshSlots(); if (slots[importSlot]) { sfx('deny'); tmsg('Plats ' + (importSlot + 1) + ' är inte tom.'); return; }
      try { localStorage.setItem(slotKey(importSlot + 1), JSON.stringify(s)); } catch (e) { tmsg('Det gick inte att spara.'); return; }
      refreshSlots(); titleSel = importSlot; moreSlot = -1; sfx('heart'); tmsg('Spelet lästes in i plats ' + (importSlot + 1) + ' (nivå ' + s.level + ').');
    };
    rd.readAsText(f);
  });
  function titleHit(p, isTouch) {
    for (var i = 0; i < SLOT_N; i++) {
      var c = cardRect(i); if (!inRect(p, c)) continue;
      if (newPick >= 0 && newPick !== i) newPick = -1;
      if (moreSlot >= 0 && moreSlot !== i) moreSlot = -1;
      titleSel = i;
      var bs = cardBtns(i);
      for (var j = 0; j < bs.length; j++) if (inRect(p, bs[j])) {
        var k = bs[j].k;
        if (k.charAt(0) === 'd' && k.length === 2) startNew(i, DIFF_ORDER[+k.charAt(1)]);
        else if (k === 'cancel') { newPick = -1; sfx('click'); }
        else if (k === 'more') { moreSlot = i; sfx('click'); }
        else if (k === 'back') { moreSlot = -1; confirmDel.i = -1; sfx('click'); }
        else if (k === 'del') askDelete(i); else if (k === 'exp') exportSlot(i);
        else if (k === 'imp') { if (isTouch) { importPending = true; importSlot = i; } else openImport(i); }   // på plattan öppnas filväljaren när fingret släpper
        else chooseSlot(i);
        return;
      }
      if (newPick !== i && moreSlot !== i) chooseSlot(i);         // tryck var som helst på kortet
      return;
    }
    newPick = -1; moreSlot = -1;
  }
  function titleButton(b, hi) {
    if (b.main) {
      rr(g, b.x, b.y, b.w, b.h, 10); g.fillStyle = hi ? '#fff0a0' : PAL.bolt; g.fill(); g.strokeStyle = 'rgba(10,20,10,0.6)'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = '#1a2a1a'; g.font = 'bold ' + (b.w > 120 ? 21 : 17) + 'px ' + TXT;
    } else if (b.mid) {                                         // knapp med förklaring under
      rr(g, b.x, b.y, b.w, b.h, 9); g.fillStyle = b.red ? 'rgba(200,40,60,0.85)' : 'rgba(250,250,242,0.13)'; g.fill(); g.strokeStyle = 'rgba(250,250,242,0.5)'; g.lineWidth = 1.2; g.stroke();
      g.textAlign = 'center'; g.fillStyle = PAL.chalk; g.font = 'bold 16px ' + TXT; g.fillText(b.t, b.x + b.w / 2, b.y + 15);
      g.font = '12px ' + TXT; g.fillStyle = 'rgba(250,250,242,0.75)'; g.fillText(b.sub, b.x + b.w / 2, b.y + 32); return;
    } else {
      rr(g, b.x, b.y, b.w, b.h, 7); g.fillStyle = 'rgba(250,250,242,0.08)'; g.fill();
      g.strokeStyle = 'rgba(250,250,242,0.35)'; g.lineWidth = 1; g.stroke();
      g.fillStyle = 'rgba(250,250,242,0.85)'; g.font = 'bold 13px ' + TXT;
    }
    g.textAlign = 'center'; g.fillText(b.t, b.x + b.w / 2, b.y + b.h / 2 + 1);
  }
  function overlayTitle() {
    g.fillStyle = 'rgba(8,16,10,0.9)'; g.fillRect(0, 0, LW, LH);
    var cx = LW / 2, cy = 100;
    for (var i = 0; i < 7; i++) {                               // hjälten med blixtar, spelets kännetecken
      var a = time * 1.6 + i * 0.898, b = a + 0.55;
      drawBolt(cx + Math.cos(a) * 28, cy + Math.sin(a) * 28, cx + Math.cos(b) * 56, cy + Math.sin(b) * 56, Math.floor(time * 10) + i * 7, 2);
    }
    g.save(); g.translate(cx, cy + 6); g.scale(2.1, 2.1);
    stick(0, 0, 0.8, -0.6, 0, { sword: true, len: 26, col: '#ffe14d', glow: 'rgba(255,225,77,0.3)' }, time * 3, false);
    g.restore();
    chalkTitle('Malm & Monster', cx, 194, 56);
    g.font = 'bold 15px ' + TXT; g.fillStyle = PAL.bolt; g.fillText('Mines & Monsters, version 3.7.5', cx, 232);
    for (i = 0; i < SLOT_N; i++) {                              // tre sparplatser
      var c = cardRect(i), s = slots[i], del = confirmDel.i === i && time < confirmDel.until, pick = newPick === i;
      tag(c.x, c.y, c.w, c.h);
      if (del) { rr(g, c.x, c.y, c.w, c.h, 9); g.fillStyle = 'rgba(200,40,60,0.35)'; g.fill(); }
      if (i === titleSel && !touchMode) { rr(g, c.x, c.y, c.w, c.h, 9); g.strokeStyle = PAL.bolt; g.lineWidth = 2.5; g.stroke(); }
      g.textAlign = 'left'; g.font = 'bold 16px ' + TXT; g.fillStyle = PAL.bolt; g.fillText('Plats ' + (i + 1), c.x + 14, c.y + 20);
      g.font = 'bold 20px ' + TXT; g.fillStyle = PAL.chalk;
      if (moreSlot === i) {
        g.font = 'bold 17px ' + TXT; g.fillText('Fler val', c.x + 90, c.y + 20);
      } else if (pick) {
        g.fillText('Välj svårighet', c.x + 14, c.y + 50);
        g.font = '14px ' + TXT; g.fillStyle = 'rgba(250,250,242,0.8)'; g.fillText(DIFF_DESC[DIFF_ORDER[diffSel]] + (touchMode ? '' : ' (Enter startar)'), c.x + 14, c.y + 136);
      } else if (s) {
        g.fillText('Nivå ' + s.level + ', ' + biomeOf(s.level).name, c.x + 14, c.y + 50);
        g.font = '15px ' + TXT; g.fillStyle = 'rgba(250,250,242,0.8)';
        g.fillText((s.sword ? swordName(s.sword) : 'Pinne') + ', ' + (DIFF_NAME[s.diff] || DIFF_NAME[settings.diff]), c.x + 14, c.y + 76);
      } else {
        g.fillText('Tom plats', c.x + 14, c.y + 50);
        g.font = '15px ' + TXT; g.fillStyle = 'rgba(250,250,242,0.6)'; g.fillText('Inget sparat spel här', c.x + 14, c.y + 76);
      }
      cardBtns(i).forEach(function (bt) { titleButton(bt, pick && bt.k === 'd' + diffSel && !touchMode); });
      g.textAlign = 'left';
    }
    g.textAlign = 'center';
    g.font = '14px ' + UI; g.fillStyle = 'rgba(250,250,242,0.6)';
    g.fillText(touchMode ? 'Vänster tumme går, Slå-knappen slår. Paus finns uppe till höger.' : 'Gå med ' + moveKeysText() + ', ' + KN('attack') + ' slår, ' + KN('use') + ' smider och äter, ' + (lastInput === 'pad' ? 'Start' : 'Esc') + ' pausar.', cx, 494);
    var tm = time < titleMsgUntil ? titleMsg : (touchMode ? '' : 'Vänster och höger väljer plats, Enter spelar.');
    g.font = 'bold 15px ' + TXT; g.fillStyle = time < titleMsgUntil ? PAL.bolt : 'rgba(250,250,242,0.45)'; g.fillText(tm, cx, 526);
    g.textAlign = 'left';
  }
  function overlayDead() {
    var vg = g.createRadialGradient(LW / 2, LH / 2, 60, LW / 2, LH / 2, LW * 0.7);
    vg.addColorStop(0, 'rgba(40,0,0,0.55)'); vg.addColorStop(1, 'rgba(90,0,10,0.85)');
    g.fillStyle = vg; g.fillRect(0, 0, LW, LH);
    chalkTitle('Du föll!', LW / 2, LH / 2 - 24, 52);
    g.font = '16px ' + UI; g.fillStyle = 'rgba(250,250,242,0.9)';
    g.fillText((DF().keep >= 1 ? 'Du behöll all malm. ' : DF().keep >= 0.75 ? 'Du tappade en fjärdedel av malmen. ' : DF().keep > 0 ? 'Du tappade halva malmen. ' : 'Du tappade all malm. ') + (touchMode ? 'Tryck på skärmen' : 'Tryck Enter') + ' för att försöka nivå ' + level + ' igen.', LW / 2, LH / 2 + 30);
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
    drawDynamicTiles(); drawGroundFx(); drawItems(); drawPrey(); drawPuzzle(); drawMonsters(); drawStuns(); drawShots(); drawArrows(); drawChargeRings(); drawPlayer(); drawPowers(); drawEHint(); drawFx();
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
    if (state === 'keys') inBox960(overlayKeys);
    if (state === 'forge') inBox960(overlayForge);
    if (state === 'dead') inBox960(overlayDead);
    if (state === 'title') { g.fillStyle = 'rgba(8,16,10,0.9)'; g.fillRect(0, 0, LW, LH); inBox960(overlayTitle); }   // mörkt över hela skärmen, även utanför menyrutan
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
  function iconShieldRound() { drawShieldShape(0, 0, 1.5, Math.max(0, Math.min(3, P.shield > 0 ? P.shield - 1 : 0)), false); }
  function iconBow() { drawBowShape(5, 0, 0, 15, Math.max(1, P.bow || 1), 0.6, true); }
  function iconArrows() {
    for (var i = -1; i <= 1; i++) {
      g.save(); g.rotate(-0.7 + i * 0.25);
      g.strokeStyle = '#8a5a2b'; g.lineWidth = 2; g.beginPath(); g.moveTo(-12, i * 3); g.lineTo(10, i * 3); g.stroke();
      g.fillStyle = '#c9d0da'; g.beginPath(); g.moveTo(14, i * 3); g.lineTo(9, i * 3 - 3); g.lineTo(9, i * 3 + 3); g.closePath(); g.fill();
      g.restore();
    }
  }
  function iconArrowSmall(x, y) {
    g.save(); g.translate(x, y); g.rotate(-0.8); g.strokeStyle = '#c9a06a'; g.lineWidth = 2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-7, 0); g.lineTo(5, 0); g.stroke(); g.fillStyle = '#e1e4ea'; g.beginPath(); g.moveTo(8, 0); g.lineTo(4, -3); g.lineTo(4, 3); g.closePath(); g.fill(); g.restore();
  }
  function iconFlaxS(x, y) {
    g.save(); g.translate(x, y); g.strokeStyle = '#6aa64a'; g.lineWidth = 1.3;
    for (var i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 2, 8); g.quadraticCurveTo(i * 3, 0, i * 4, -5); g.stroke(); g.fillStyle = '#7ab0ff'; g.beginPath(); g.arc(i * 4, -5, 2.4, 0, 7); g.fill(); }
    g.restore();
  }
  function iconHideS(x, y) {
    g.save(); g.translate(x, y); g.fillStyle = '#b07a4a'; g.strokeStyle = '#5e3b18'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(-6, -5); g.quadraticCurveTo(0, -8, 6, -5); g.lineTo(8, -1); g.quadraticCurveTo(5, 1, 7, 6); g.quadraticCurveTo(0, 4, -7, 6); g.quadraticCurveTo(-5, 1, -8, -1); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  function iconRod() {
    g.lineCap = 'round'; g.strokeStyle = 'rgba(10,20,10,0.6)'; g.lineWidth = 4; g.beginPath(); g.moveTo(-13, 13); g.lineTo(11, -13); g.stroke();
    g.strokeStyle = '#a8743c'; g.lineWidth = 2.4; g.stroke();
    g.fillStyle = '#5e3b18'; g.beginPath(); g.arc(-7, 7, 3, 0, 7); g.fill();
    g.strokeStyle = 'rgba(240,240,240,0.9)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(11, -13); g.lineTo(12, 5); g.stroke();
    g.fillStyle = '#e53b3b'; g.beginPath(); g.arc(12, 8, 3.4, Math.PI, 0); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(12, 8, 3.4, 0, Math.PI); g.fill();
  }
  function iconKnife() {
    g.save(); g.rotate(-0.7);
    g.fillStyle = '#6b4220'; rr(g, -14, -3, 11, 6, 2); g.fill(); g.strokeStyle = 'rgba(10,15,30,0.7)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#9a9ea6'; g.beginPath(); g.moveTo(-3, -4); g.lineTo(9, -3); g.lineTo(15, 0); g.lineTo(9, 3.5); g.lineTo(-3, 4); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = '#e1e4ea'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-1, -2); g.lineTo(12, -1); g.stroke();
    g.restore();
  }
  function powerArc(col) { g.strokeStyle = col; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.arc(0, 0, 21, -2.6, 1.2); g.stroke(); g.beginPath(); g.moveTo(17, 12); g.lineTo(11, 19); g.lineTo(21, 20); g.fillStyle = col; g.fill(); }
  function iconSpin() { powerArc(PAL.bolt); g.save(); g.scale(0.7, 0.7); iconSwordBig(); g.restore(); }
  function iconBash() { powerArc('#a0d7ff'); g.save(); g.scale(0.75, 0.75); iconShieldRound(); g.restore(); }
  function iconPowerArrow() { g.save(); g.globalCompositeOperation = 'lighter'; glow(0, 0, 22, '124,200,255', 0.5); g.restore(); iconArrows(); }
  function iconRun() {                                          // v3.7.1: springande gubbe med fartstreck
    g.save(); g.scale(1.25, 1.25); stick(2, 4, 1, 0, 0, null, 2.2, true); g.restore();
    g.strokeStyle = '#7dff8a'; g.lineWidth = 2.5; g.lineCap = 'round';
    [[-20, -8, -10], [-22, 0, -12], [-20, 8, -10]].forEach(function (q) { g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(q[2], q[1]); g.stroke(); });
  }
  function iconQuiverBig() { g.save(); g.scale(1.8, 1.8); drawQuiver(0, 2, -1, 3); g.restore(); }
  function iconPause() { g.fillStyle = PAL.chalk; rr(g, -9, -11, 6, 22, 2); g.fill(); rr(g, 3, -11, 6, 22, 2); g.fill(); }

