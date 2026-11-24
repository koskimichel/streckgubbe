  // ---------- paus och inställningar ----------
  var pauseSel = 0, confirmNew = 0;                       // confirmNew: tid kvar för "Säker?"-läget
  var PROWS = [
    { k: 'diff', label: 'Svårighet (från nästa nivå)', vals: ['latt', 'medel', 'svar'], names: ['Lätt', 'Medel', 'Svår'] },
    { k: 'music', label: 'Musik', vals: [0, 0.25, 0.5], names: ['Av', 'Låg', 'Hög'] },
    { k: 'sfx', label: 'Ljudeffekter', vals: [0, 0.4, 0.8], names: ['Av', 'Låg', 'Hög'] },
    { k: 'shake', label: 'Skärmskak', vals: [0, 0.5, 1], names: ['Av', 'Lite', 'Full'] },
    { k: 'flash', label: 'Blinkningar vid träff', vals: [true, false], names: ['På', 'Av'] },
    { k: 'numbers', label: 'Skadetal', vals: [true, false], names: ['På', 'Av'] },
    { k: 'guide', label: 'Guide på nivå 1', vals: [true, false], names: ['På', 'Av'] },
    { k: 'controls', label: 'Styrning på datorn', action: true }   // v3.7.1: öppnar Styrning
  ];
  var PX = LW / 2 - 220, PW = 440, PY0 = 140, PH = 34, PSTEP = 40, PBY = PY0 + PROWS.length * PSTEP + 26;
  var PB_GO = { x: LW / 2 - 112, y: PBY, w: 200, h: 48 }, PB_NEW = { x: LW / 2 + 112, y: PBY, w: 200, h: 48 };
  function inBox(p, b) { return Math.abs(p.x - b.x) < b.w / 2 + 6 && Math.abs(p.y - b.y) < b.h / 2 + 6; }
  function askNew() {                                       // v3.4: till titeln (spelet är sparat), där väljer man plats
    save(); confirmNew = 0; state = 'title'; refreshSlots(); titleSel = slot - 1; if (window.LJUD) LJUD.duck(false); sfx('click');
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
    if (PROWS[i].action) { openKeys(); return; }
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
      var y = PY0 + i * PSTEP, idx = r.vals ? r.vals.indexOf(settings[r.k]) : 0;
      tag(PX, y, PW, PH);
      if (i === pauseSel && !touchMode) { rr(g, PX, y, PW, PH, 9); g.strokeStyle = PAL.bolt; g.lineWidth = 2.5; g.stroke(); }
      g.font = 'bold 18px ' + TXT; g.textAlign = 'left'; g.fillStyle = PAL.chalk; g.fillText(r.label, PX + 18, y + PH / 2 + 1);
      g.textAlign = 'right'; g.fillStyle = PAL.bolt; g.fillText(r.action ? 'Ändra' : r.names[idx < 0 ? 0 : idx], PX + PW - 18, y + PH / 2 + 1);
    });
    [[PB_GO, 'Fortsätt', PROWS.length], [PB_NEW, 'Till titeln', PROWS.length + 1]].forEach(function (b) {
      var B = b[0]; tag(B.x - B.w / 2, B.y - B.h / 2, B.w, B.h);
      if (b[2] === PROWS.length + 1 && confirmNew > 0) { rr(g, B.x - B.w / 2, B.y - B.h / 2, B.w, B.h, 9); g.fillStyle = 'rgba(200,40,60,0.55)'; g.fill(); }
      if (pauseSel === b[2] && !touchMode) { rr(g, B.x - B.w / 2, B.y - B.h / 2, B.w, B.h, 9); g.strokeStyle = PAL.bolt; g.lineWidth = 2.5; g.stroke(); }
      g.textAlign = 'center'; g.fillStyle = PAL.chalk; g.font = 'bold ' + (b[2] === PROWS.length + 1 && confirmNew > 0 ? 18 : 22) + 'px ' + TXT; g.fillText(b[1], B.x, B.y + 1);
    });
    g.font = '15px ' + TXT; g.fillStyle = 'rgba(250,250,242,0.75)';
    g.fillText(confirmNew > 0 ? 'Nytt spel börjar om från nivå 1. Svärd, malm och styrka försvinner.' : touchMode ? 'Tryck på en rad för att ändra den.' : 'Pilarna väljer och ändrar. Esc eller P fortsätter.', LW / 2, PBY + 44);
    g.font = '12px ' + TXT; g.fillStyle = 'rgba(250,250,242,0.45)'; g.fillText('Malm & Monster, version 3.7.2', LW / 2, LH - 14);
    g.textAlign = 'left';
  }

  // ---------- styrning på datorn (v3.7.1) ----------
  var keySel = 0, keySlot = 0, keyWait = false;
  var KX = LW / 2 - 270, KW = 540, KY0 = 112, KH = 32, KSTEP = 36, KBY = KY0 + KEY_ACTS.length * KSTEP + 30;
  var KB_RESET = { x: LW / 2 - 112, y: KBY, w: 200, h: 44 }, KB_DONE = { x: LW / 2 + 112, y: KBY, w: 200, h: 44 };
  function moveKeysText() {
    var b = keyBinds(), std = ['up', 'down', 'left', 'right'].every(function (a) { return b[a][0] === KEY_DEF[a][0] && b[a][1] === KEY_DEF[a][1]; });
    return std ? 'WASD eller pilarna' : ['up', 'left', 'down', 'right'].map(function (a) { return KS(a); }).join(' ');
  }
  function keyBoxX(j) { return KX + KW - 270 + j * 136; }
  function openKeys() { state = 'keys'; keySel = 0; keySlot = 0; keyWait = false; keys = {}; sfx('click'); }
  function closeKeys() { keyWait = false; state = 'paused'; keys = {}; applySettings(); sfx('click'); }
  function setKey(act, slot, k) {                                 // en tangent kan bara göra en sak: tas bort från andra handlingar
    var kb = keyBinds();
    KEY_ACTS.forEach(function (a) { var b = kb[a[0]]; for (var j = 0; j < 2; j++) if (b[j] === k) b[j] = ''; });
    kb[act][slot] = k; applySettings();
  }
  function resetKeys() { settings.keys = null; keyBinds(); applySettings(); sfx('click'); }
  function keysKey(k) {
    var N = KEY_ACTS.length;
    if (keyWait) {
      if (k === 'Escape') { keyWait = false; return; }
      if (k === 'Backspace' || k === 'Delete') { keyBinds()[KEY_ACTS[keySel][0]][keySlot] = ''; applySettings(); keyWait = false; sfx('click'); return; }
      if (k === 'p' || k === 'Enter' || k === 'Tab' || k === 'Meta' || k === 'Alt' || k === 'Control' || k === 'CapsLock') { sfx('deny'); return; }   // fasta eller osäkra tangenter
      setKey(KEY_ACTS[keySel][0], keySlot, k); keyWait = false; sfx('click'); return;
    }
    if (k === 'Escape' || k === 'p') closeKeys();
    else if (k === 'ArrowUp') keySel = (keySel + N + 1) % (N + 2);
    else if (k === 'ArrowDown') keySel = (keySel + 1) % (N + 2);
    else if (k === 'ArrowLeft' || k === 'ArrowRight') { if (keySel < N) keySlot = 1 - keySlot; else keySel = keySel === N ? N + 1 : N; }
    else if (k === 'Enter' || k === ' ') { if (keySel < N) keyWait = true; else if (keySel === N) resetKeys(); else closeKeys(); }
  }
  function keysHit(p, btn) {
    btn = btn || 0;
    var onBox = null;
    for (var i = 0; i < KEY_ACTS.length; i++) {
      var y = KY0 + i * KSTEP;
      for (var j = 0; j < 2; j++) if (p.x > keyBoxX(j) && p.x < keyBoxX(j) + 126 && p.y > y && p.y < y + KH) onBox = { i: i, j: j };
    }
    if (keyWait && (btn !== 0 || (onBox && onBox.i === keySel && onBox.j === keySlot))) {   // v3.7.2: en musknapp väljs som tangent
      setKey(KEY_ACTS[keySel][0], keySlot, 'Mouse' + btn); keyWait = false; sfx('click'); return;
    }
    if (btn !== 0) return;
    if (onBox) { keySel = onBox.i; keySlot = onBox.j; keyWait = true; sfx('click'); return; }
    keyWait = false;
    if (inBox(p, KB_RESET)) resetKeys(); else if (inBox(p, KB_DONE)) closeKeys();
  }
  function overlayKeys() {
    g.fillStyle = 'rgba(8,16,10,0.9)'; g.fillRect(0, 0, LW, LH);
    chalkTitle('Styrning', LW / 2, 66, 42);
    g.textBaseline = 'middle';
    var kb = keyBinds();
    KEY_ACTS.forEach(function (a, i) {
      var y = KY0 + i * KSTEP;
      tag(KX, y, KW, KH);
      if (i === keySel && !touchMode) { rr(g, KX, y, KW, KH, 8); g.strokeStyle = 'rgba(255,225,77,0.5)'; g.lineWidth = 1.5; g.stroke(); }
      g.font = 'bold 17px ' + TXT; g.textAlign = 'left'; g.fillStyle = PAL.chalk; g.fillText(a[1], KX + 16, y + KH / 2 + 1);
      for (var j = 0; j < 2; j++) {
        var bx = keyBoxX(j), on = i === keySel && j === keySlot, wait = on && keyWait, kk = kb[a[0]][j];
        rr(g, bx, y + 3, 126, KH - 6, 6); g.fillStyle = wait ? 'rgba(255,225,77,0.35)' : 'rgba(250,250,242,0.08)'; g.fill();
        g.strokeStyle = on ? PAL.bolt : 'rgba(250,250,242,0.3)'; g.lineWidth = on ? 2 : 1; g.stroke();
        g.textAlign = 'center'; g.font = (wait ? '' : 'bold ') + ((kk && kk.indexOf('Mouse') === 0) ? '13px ' : '15px ') + TXT; g.fillStyle = kk || wait ? PAL.chalk : 'rgba(250,250,242,0.35)';
        g.fillText(wait ? 'Tryck nu' : kk ? keyName(kk) : 'tom', bx + 63, y + KH / 2 + 1);
      }
    });
    [[KB_RESET, 'Som från början', KEY_ACTS.length], [KB_DONE, 'Klar', KEY_ACTS.length + 1]].forEach(function (b) {
      var B = b[0]; tag(B.x - B.w / 2, B.y - B.h / 2, B.w, B.h);
      if (keySel === b[2] && !touchMode) { rr(g, B.x - B.w / 2, B.y - B.h / 2, B.w, B.h, 9); g.strokeStyle = PAL.bolt; g.lineWidth = 2.5; g.stroke(); }
      g.textAlign = 'center'; g.fillStyle = PAL.chalk; g.font = 'bold 19px ' + TXT; g.fillText(b[1], B.x, B.y + 1);
    });
    g.font = '14px ' + TXT; g.fillStyle = 'rgba(250,250,242,0.75)'; g.textAlign = 'center';
    g.fillText(keyWait ? 'Tryck en tangent eller en musknapp (vänster: klicka i samma ruta). Backsteg tömmer, Esc ångrar.' : 'Klicka på en ruta och tryck sedan en tangent eller musknapp.', LW / 2, KBY + 40);
    g.textAlign = 'left';
  }

  // ---------- smedjan (v2.2) ----------
  var FX0 = LW / 2 - 270, FW = 540, FY0 = 164, FH = 50, FSTEP = 56, FBY = FY0 + 6 * FSTEP + 18, forgeTab = 0;   // två flikar, högst sex rader
  var TABS = ['Vapen och skydd', 'Verktyg', 'Krafter'], TAB_W = 186, TAB_Y = 118, TAB_H = 36;   // v3.7: tre flikar
  function tabX(i) { return 480 - (TABS.length * TAB_W + (TABS.length - 1) * 12) / 2 + i * (TAB_W + 12); }
  function recipe(k, lvl) {                                      // v3.6: metallen kostar mer på Medel och Svår (costMul, tal eller lista per metall)
    var c = baseRecipe(k, lvl), m = DF().costMul || 1;
    if (c && c.metal != null && m.length) m = m[c.metal];        // en faktor per metall: koppar, järn, guld, stjärnmalm
    if (!c || c.metal == null || m === 1) return c;
    var o = {}; for (var q in c) o[q] = c[q]; o.n = Math.round(c.n * m); return o;
  }
  function baseRecipe(k, lvl) {                                  // kostnaden för att nå nivå lvl (som i config)
    var Cc = C.crafting;
    if (k === 'sword') return Cc.sword[lvl];
    if (k === 'pick') return lvl === 1 ? Cc.stonePick : Cc.pick[lvl - 1];
    if (k === 'shield') return Cc.shield[lvl];
    if (k === 'bow') return Cc.bow[lvl];
    if (k === 'arrows') return P.bow ? Cc.arrows : null;
    if (k === 'armor') return Cc.armor[lvl];
    if (k === 'rod') return Cc.rod;
    if (k === 'knife') return Cc.knife;
    if (k === 'quiver') return Cc.quiver[lvl];
    if (k === 'head') return Cc.arrowHead[lvl];
    if (k === 'spin' || k === 'bash' || k === 'parrow') return { moon: C.powers.cost[lvl] };
    if (k === 'endure') return { moon: C.powers.endure.cost[lvl] };   // v3.7.1   // v3.7: krafter kostar månsten
    return Cc.lantern[lvl];                                       // v3.6: lyktan kostar metall, månsten blir kraft
  }
  var QUIVER_NAME = ['Större koger', 'Läderkoger', 'Förstärkt koger', 'Koger med kopparband', 'Stort koger med järnband'];   // v3.7.2: fem steg
  function swordName(l) { return l <= 2 ? 'Stensvärd' : l <= 5 ? 'Kopparsvärd' : l <= 8 ? 'Järnsvärd' : l <= 11 ? 'Guldsvärd' : 'Stjärnsvärd'; }
  function cap(s2) { return s2.charAt(0).toUpperCase() + s2.slice(1); }
  function allRows() {
    var U = C.upgrades, rows = [
      { tab: 0, k: 'sword', name: swordName(Math.min(P.sword + 1, C.weapon.maxSwordLevel)), lvl: P.sword, max: C.weapon.maxSwordLevel, desc: 'Mer skada mot monstren', icon: iconSwordBig },
      { tab: 0, k: 'armor', name: P.armor < U.armor.max ? ARMOR_PART[P.armor % 4] + ' av ' + MET[Math.floor(P.armor / 4)].name : 'Rustning', lvl: P.armor, max: U.armor.max,
        desc: P.armor < U.armor.max ? (P.armor < 4 ? 'Ny del till rustningen' : 'Byter ut ' + ARMOR_PART[P.armor % 4].toLowerCase() + ' av ' + MET[Math.floor(P.armor / 4) - 1].name) + ', mindre skada' : 'Hela rustningen är av stjärnmalm', icon: iconShield },
      { tab: 0, k: 'shield', name: P.shield < 4 ? 'Sköld av ' + MET[P.shield].name : 'Sköld', lvl: P.shield, max: 4,
        desc: P.shield < 4 ? 'Håll in för att parera: stoppar ' + Math.round(C.shield.block[P.shield + 1] * 100) + ' % framifrån' : 'Stoppar 90 % framifrån', icon: iconShieldRound },
      { tab: 0, k: 'bow', name: P.bow < 3 ? ['Träbåge', 'Järnbåge', 'Guldbåge'][P.bow] : 'Pilbåge', lvl: P.bow, max: 3,
        desc: P.bow === 0 ? 'Skjut pilar på avstånd, siktar själv' : 'Längre räckvidd och mer skada', icon: iconBow },
      { tab: 0, k: 'head', name: P.arrowHead < 4 ? 'Pilspetsar av ' + MET[P.arrowHead].name : 'Pilspetsar', lvl: P.arrowHead, max: 4,
        desc: 'Alla dina pilar gör mer skada' + (P.bow ? ': ' + fmt(arrowDamage()) + (P.arrowHead < 4 ? ' blir ' + fmt(Math.max(C.bow.headDmg[P.arrowHead + 1] * C.bow.bowMul[P.bow], damage() * C.bow.dmgMul[P.bow])) : '') : ''), icon: iconArrows },
      { tab: 0, k: 'arrows', name: 'Pilar med ' + (P.arrowHead ? MET[P.arrowHead - 1].name : 'sten') + 'spets (+' + C.bow.arrowsPerCraft + ')', lvl: P.arrows, max: maxArrows(),
        desc: P.bow ? 'Trä och sten. Skada ' + fmt(arrowDamage()) + ' (spetsen ovan)' : 'Kräver en pilbåge', icon: iconArrows },
      { tab: 1, k: 'pick', name: !P.hasPick ? 'Stenhacka' : P.pick < 3 ? cap(PICK_NAME[P.pick + 1]) : 'Guldhacka', lvl: P.hasPick ? P.pick + 1 : 0, max: 4,
        desc: !P.hasPick ? 'Behövs för att bryta koppar' : P.pick < 3 ? 'Kan bryta ' + MET[P.pick + 1].name : 'Bryter all malm', icon: iconPick },
      { tab: 1, k: 'lamp', name: 'Lykta', lvl: P.lamp, max: U.lantern.max, desc: P.lamp === 0 ? 'Mer ljus i grottorna' : 'Starkare ljus i grottorna och på natten', icon: iconLamp },
      { tab: 1, k: 'rod', name: 'Fiskespö', lvl: P.rod, max: 1, desc: 'Fiska vid dammar. En fisk räknas som mat.', icon: iconRod },
      { tab: 1, k: 'knife', name: 'Jaktkniv', lvl: P.knife, max: 1, desc: 'Flå djur som du fångat. Ger kött och ibland skinn.', icon: iconKnife },
      { tab: 2, k: 'spin', name: 'Snurrslag' + (P.spin ? ', nivå ' + Math.min(3, P.spin + 1) : ''), lvl: P.spin, max: 3,
        desc: P.spin ? 'Större och starkare snurr' : (touchMode ? 'Håll fingret till höger, släpp: slår alla runt dig' : 'Håll in ' + KN('attack') + ', släpp: slår alla runt dig'), icon: iconSpin },
      { tab: 2, k: 'bash', name: 'Sköldknuff' + (P.bash ? ', nivå ' + Math.min(3, P.bash + 1) : ''), lvl: P.bash, max: 3,
        desc: !P.shield ? 'Kräver en sköld' : P.bash ? 'Längre knuff, yrare monster' : 'Tryck snabbt på Sköld: alla runt dig flyger', icon: iconBash },
      { tab: 2, k: 'parrow', name: 'Kraftpil' + (P.parrow ? ', nivå ' + Math.min(3, P.parrow + 1) : ''), lvl: P.parrow, max: 3,
        desc: !P.bow ? 'Kräver en pilbåge' : P.parrow ? 'Starkare, går igenom fler' : (touchMode ? 'Håll in Skjut, släpp: pilen går igenom flera' : 'Håll in ' + KN('bow') + ', släpp: pilen går igenom flera'), icon: iconPowerArrow },
      { tab: 2, k: 'endure', name: 'Uthållighet' + (P.endure ? ', nivå ' + Math.min(3, P.endure + 1) : ''), lvl: P.endure, max: 3,
        desc: P.endure < 3 ? 'Spring längre: ' + fmt(C.powers.endure.stamina[P.endure + 1]) + ' s i stället för ' + fmt(C.powers.endure.stamina[P.endure]) + ' s' : 'Du orkar springa ' + fmt(C.powers.endure.stamina[3]) + ' s', icon: iconRun },
      { tab: 1, k: 'quiver', name: P.quiver < QUIVER_NAME.length ? QUIVER_NAME[P.quiver] : 'Koger', lvl: P.quiver, max: QUIVER_NAME.length,
        desc: P.quiver < QUIVER_NAME.length ? 'Bär ' + maxArrows(P.quiver + 1) + ' pilar i stället för ' + maxArrows() : 'Bär ' + maxArrows() + ' pilar', icon: iconQuiverBig }
    ];
    rows.forEach(function (r) { r.cost = r.lvl < r.max ? recipe(r.k, r.lvl + 1) : null; });
    return rows;
  }
  function forgeRows() { return allRows().filter(function (r) { return r.tab === forgeTab; }); }
  function rowByKey(rows, k) { for (var i = 0; i < rows.length; i++) if (rows[i].k === k) return rows[i]; return null; }
  function canAfford(c) { return !!c && P.wood >= (c.wood || 0) && P.stone >= (c.stone || 0) && P.flax >= (c.flax || 0) && P.hide >= (c.hide || 0) && (c.metal == null || metalAmt(c.metal) >= c.n) && P.moon >= (c.moon || 0); }
  function costText(c) {
    if (!c) return ''; var p = [];
    if (c.wood) p.push(c.wood + ' trä'); if (c.stone) p.push(c.stone + ' sten'); if (c.flax) p.push(c.flax + ' lin'); if (c.hide) p.push(c.hide + ' skinn');
    if (c.metal != null) p.push(c.n + ' ' + MET[c.metal].name); if (c.moon) p.push(c.moon + (c.moon === 1 ? ' månsten' : ' månstenar'));
    return p.join(' + ');
  }
  function missingText(c) {
    var p = [];
    if ((c.wood || 0) > P.wood) p.push((c.wood - P.wood) + ' trä');
    if ((c.stone || 0) > P.stone) p.push((c.stone - P.stone) + ' sten');
    if ((c.flax || 0) > P.flax) p.push((c.flax - P.flax) + ' lin');
    if ((c.hide || 0) > P.hide) p.push((c.hide - P.hide) + ' skinn');
    if (c.metal != null && metalAmt(c.metal) < c.n) p.push((c.n - metalAmt(c.metal)) + ' ' + MET[c.metal].name + (P.pick < c.metal ? ' (kräver ' + PICK_NAME[c.metal] + ')' : ''));
    if ((c.moon || 0) > P.moon) p.push((c.moon - P.moon) + ' månsten');
    return p.join(' och ');
  }
  function pay(c) { P.wood -= c.wood || 0; P.stone -= c.stone || 0; P.flax -= c.flax || 0; P.hide -= c.hide || 0; if (c.metal != null) addMetal(c.metal, -c.n); P.moon -= c.moon || 0; }
  function forgeGoal() {                                        // nästa mål: svärdet, eller hackan om svärdet kräver malm du inte kan bryta
    var rows = allRows(), sw = rowByKey(rows, 'sword'), pk = rowByKey(rows, 'pick'), r = sw;
    if (!sw.cost) r = rowByKey(rows, 'armor').cost ? rowByKey(rows, 'armor') : null;
    else if (sw.cost.metal != null && (!P.hasPick || sw.cost.metal > P.pick) && pk.cost) r = pk;
    return r && r.cost ? { k: r.k, tab: r.tab, name: r.name, price: costText(r.cost), can: canAfford(r.cost) } : null;
  }
  function canBuyAny() { return allRows().some(function (r) { return r.cost && canAfford(r.cost); }); }
  function openForge() {
    state = 'forge'; var gl = forgeGoal(); forgeTab = gl ? gl.tab : 0; forgeSel = 0;
    if (gl) forgeRows().forEach(function (r, i) { if (r.k === gl.k) forgeSel = i; });
    keys = {}; mouse.down = false; touch.joyId = touch.atkId = touch.eId = null;
    sfx('click'); if (window.LJUD) LJUD.duck(true);
  }
  function closeForge() { if (state !== 'forge') return; state = 'play'; if (window.LJUD) LJUD.duck(false); if (powerReminder) { say(powerReminder); powerReminder = ''; } }
  function switchTab(t) { if (forgeTab === t) return; forgeTab = t; forgeSel = 0; sfx('click'); }
  var howToT = 0, powerReminder = '';                            // v3.7.2: Så gör du-rutan lyser efter köp; påminnelse när smedjan stängs
  function howTo(k) {                                            // hur man använder en kraft, tre rader
    var T = touchMode;
    if (k === 'spin') return [T ? 'Håll fingret på högra sidan av skärmen.' : 'Håll in ' + KN('attack') + '.', 'En gul ring växer runt gubben. Släpp när den är hel:', 'svärdet snurrar runt dig och träffar alla nära. Ett kort tryck slår som vanligt.'];
    if (k === 'bash') return ['Tryck snabbt på ' + (T ? 'Sköld-knappen' : KN('shield')) + ' och släpp direkt.', 'Alla monster nära dig knuffas bort och blir yra en stund.', 'Håller du in ' + (T ? 'Sköld' : KN('shield')) + ' skyddar skölden dig som förut.' + (T ? ' Blå ring på knappen = redo.' : '')];
    if (k === 'parrow') return ['Håll in ' + (T ? 'Skjut-knappen' : KN('bow')) + '. En blå ring växer runt gubben.', 'Släpp när ringen är hel: en kraftpil som går igenom flera monster.', 'Ett kort tryck skjuter en vanlig pil.'];
    if (k === 'endure') return ['Spring: ' + (T ? 'dra styrspaken ända ut.' : 'håll in ' + KN('run') + ' medan du går.'), 'Mätaren under gubben visar hur länge du orkar.', 'Tom mätare: gubben är trött en liten stund. Mer Uthållighet = längre spring.'];
    return null;
  }
  function buy(i) {
    var r = forgeRows()[i]; if (!r) return;
    forgeSel = i;                                                 // v3.7.2: Så gör du visar det man just köpt
    if (r.k === 'arrows' && !P.bow) { sfx('deny'); say('Du behöver en pilbåge först.'); return; }
    if (r.k === 'bash' && !P.shield) { sfx('deny'); say('Sköldknuffen kräver en sköld. Gör en under Vapen och skydd.'); return; }
    if (r.k === 'parrow' && !P.bow) { sfx('deny'); say('Kraftpilen kräver en pilbåge. Gör en under Vapen och skydd.'); return; }
    if (!r.cost) { sfx('deny'); say(r.k === 'arrows' ? 'Kogret är fullt. Gör ett större koger under Verktyg.' : r.max === 1 ? 'Du har redan ' + r.name.toLowerCase() + '.' : r.name + ' är redan på högsta nivån'); return; }
    if (!canAfford(r.cost)) { sfx('deny'); say('Behöver ' + missingText(r.cost) + ' till'); return; }
    pay(r.cost);
    if (r.k === 'sword') { P.sword++; say(P.sword === 1 ? 'Du gjorde ett stensvärd!' : swordName(P.sword) + ', nivå ' + P.sword); }
    else if (r.k === 'armor') { var ap = (P.armor) % 4, am = Math.floor(P.armor / 4); P.armor++; say(ARMOR_PART[ap] + ' av ' + MET[am].name + '! Rustningen är nu nivå ' + P.armor + ' av 16.'); }
    else if (r.k === 'pick') { if (!P.hasPick) { P.hasPick = true; say('Du gjorde en stenhacka! Nu kan du bryta koppar.'); } else { P.pick++; say('Ny ' + PICK_NAME[P.pick] + '! Nu kan du bryta ' + MET[P.pick].name + '.'); } }
    else if (r.k === 'lamp') { P.lamp++; say('Lyktan är nu nivå ' + P.lamp); }
    else if (r.k === 'shield') { P.shield++; say('Ny sköld av ' + MET[P.shield - 1].name + '! Håll in ' + (touchMode ? 'Sköld' : KN2('shield')) + ' för att parera.'); }
    else if (r.k === 'bow') { P.bow++; if (P.bow === 1) P.arrows = Math.max(P.arrows, Math.min(5, maxArrows())); say(['Träbåge', 'Järnbåge', 'Guldbåge'][P.bow - 1] + '! ' + (touchMode ? 'Tryck Skjut' : 'Tryck ' + KN('bow')) + ' för att skjuta.'); }
    else if (r.k === 'arrows') { var a0 = P.arrows; P.arrows = Math.max(a0, Math.min(maxArrows(), a0 + C.bow.arrowsPerCraft)); say('+' + (P.arrows - a0) + ' pilar (du har ' + P.arrows + ' av ' + maxArrows() + ')'); }
    else if (r.k === 'head') { P.arrowHead++; say('Pilspetsar av ' + MET[P.arrowHead - 1].name + '! Pilarna gör nu ' + fmt(arrowDamage()) + ' i skada.'); }
    else if (r.k === 'rod') { P.rod = 1; say('Ett fiskespö! Ställ dig vid en damm och tryck ' + (touchMode ? 'Fiska' : KN('use')) + '.'); }
    else if (r.k === 'knife') { P.knife = 1; say('En jaktkniv! Fånga ett djur och tryck ' + (touchMode ? 'Flå' : KN('use')) + ' för att flå det.'); }
    else if (r.k === 'endure') { P.endure++; P.stamina = C.powers.endure.stamina[P.endure]; say('Uthållighet nivå ' + P.endure + '! Nu orkar du springa ' + fmt(P.stamina) + ' sekunder.'); }
    else if (r.k === 'spin') { P.spin++; say(P.spin === 1 ? 'Snurrslag! ' + (touchMode ? 'Håll fingret på högra sidan tills ringen är full och släpp.' : 'Håll in ' + KN('attack') + ' tills ringen är full och släpp.') : 'Snurrslaget är nu nivå ' + P.spin + '.'); }
    else if (r.k === 'bash') { P.bash++; say(P.bash === 1 ? 'Sköldknuff! Tryck snabbt på ' + (touchMode ? 'Sköld' : KN('shield')) + ' och släpp direkt.' : 'Sköldknuffen är nu nivå ' + P.bash + '.'); }
    else if (r.k === 'parrow') { P.parrow++; say(P.parrow === 1 ? 'Kraftpil! Håll in ' + (touchMode ? 'Skjut' : KN('bow')) + ' tills den blå ringen är full och släpp.' : 'Kraftpilen är nu nivå ' + P.parrow + '.'); }
    else { P.quiver++; say(QUIVER_NAME[P.quiver - 1] + '! Nu kan du bära ' + maxArrows() + ' pilar.'); }
    if (howTo(r.k)) { howToT = 3; powerReminder = { spin: 'Snurrslag: håll in och släpp när ringen är hel.', bash: 'Sköldknuff: tryck snabbt på Sköld.', parrow: 'Kraftpil: håll in Skjut och släpp när ringen är hel.', endure: 'Spring: ' + (touchMode ? 'dra styrspaken ända ut.' : 'håll in ' + KN('run') + '.') }[r.k]; }
    sfx('craft'); powerUp(); save();
  }
  function forgeHit(p) {
    for (var t = 0; t < TABS.length; t++) if (p.x > tabX(t) && p.x < tabX(t) + TAB_W && p.y > TAB_Y - 4 && p.y < TAB_Y + TAB_H + 4) { switchTab(t); return; }
    var n = forgeRows().length;
    for (var i = 0; i < n; i++) { var y = FY0 + i * FSTEP; if (p.x > FX0 && p.x < FX0 + FW && p.y > y - 3 && p.y < y + FH + 3) { forgeSel = i; buy(i); return; } }
    if (Math.abs(p.x - 480) < 100 && Math.abs(p.y - FBY) < 30) closeForge();   // menyrutan är alltid 960 bred
  }
  function iconShield() {
    g.beginPath(); g.moveTo(0, -14); g.lineTo(12, -9); g.quadraticCurveTo(11, 8, 0, 15); g.quadraticCurveTo(-11, 8, -12, -9); g.closePath();
    g.fillStyle = ARMOR_MAT[Math.min(3, Math.floor(P.armor / 4))].col; g.fill(); g.strokeStyle = 'rgba(10,15,30,0.8)'; g.lineWidth = 1.6; g.stroke();   // färgen på nästa del
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
    chalkTitle('Smedjan', LW / 2, 54, 40);
    g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillStyle = PAL.gold;
    var inv = ['trä ' + P.wood, 'sten ' + P.stone];
    for (var mt2 = 0; mt2 < 4; mt2++) if (metalAmt(mt2) > 0 || mt2 <= P.pick) inv.push(MET[mt2].name + ' ' + metalAmt(mt2));
    if (P.flax > 0 || P.rod) inv.push('lin ' + P.flax); if (P.hide > 0) inv.push('skinn ' + P.hide);
    if (P.moonEver || P.moon > 0) inv.push('månsten ' + P.moon);
    g.font = 'bold 16px ' + TXT; g.fillText('Du har: ' + inv.join(', '), LW / 2, 94);
    var all = allRows();
    for (var t = 0; t < TABS.length; t++) {                     // flikar
      var tx = tabX(t), on = t === forgeTab;
      tag(tx, TAB_Y, TAB_W, TAB_H);
      if (on) { rr(g, tx, TAB_Y, TAB_W, TAB_H, 9); g.fillStyle = 'rgba(255,225,77,0.16)'; g.fill(); g.strokeStyle = PAL.bolt; g.lineWidth = 2.5; g.stroke(); }
      g.font = 'bold 17px ' + TXT; g.fillStyle = on ? PAL.chalk : 'rgba(250,250,242,0.6)'; g.fillText(TABS[t], tx + TAB_W / 2, TAB_Y + TAB_H / 2 + 1);
      if (all.some(function (r) { return r.tab === t && r.cost && canAfford(r.cost); })) {   // något går att köpa här
        g.fillStyle = PAL.bolt; g.beginPath(); g.arc(tx + TAB_W - 14, TAB_Y + TAB_H / 2, 8, 0, 7); g.fill();
        g.fillStyle = '#1a2a1a'; g.font = 'bold 13px ' + TXT; g.fillText('!', tx + TAB_W - 14, TAB_Y + TAB_H / 2 + 1);
      }
    }
    var goal = forgeGoal();
    forgeRows().forEach(function (r, i) {
      var y = FY0 + i * FSTEP, maxed = r.lvl >= r.max, can = !maxed && canAfford(r.cost);
      tag(FX0, y, FW, FH);
      if (i === forgeSel && !touchMode) { rr(g, FX0, y, FW, FH, 9); g.strokeStyle = PAL.bolt; g.lineWidth = 2.5; g.stroke(); }
      g.save(); g.translate(FX0 + 34, y + FH / 2); g.scale(0.72, 0.72); r.icon(); g.restore();
      g.textAlign = 'left'; g.font = 'bold 18px ' + TXT; g.fillStyle = PAL.chalk; g.fillText(r.name, FX0 + 66, y + 19);
      if (goal && goal.k === r.k && !maxed) {                  // rekommendation
        var nw = g.measureText(r.name).width; g.font = 'bold 12px ' + TXT; var bt = 'Bra att köpa nu', bw3 = g.measureText(bt).width + 14;
        rr(g, FX0 + 76 + nw, y + 10, bw3, 19, 6); g.fillStyle = PAL.bolt; g.fill(); g.fillStyle = '#1a2a1a'; g.fillText(bt, FX0 + 83 + nw, y + 20);
      }
      g.font = '13px ' + TXT; g.fillStyle = 'rgba(250,250,242,0.75)'; g.fillText(r.desc, FX0 + 66, y + 37);
      g.textAlign = 'right'; g.font = '12px ' + TXT; g.fillStyle = 'rgba(250,250,242,0.8)';
      g.fillText(r.k === 'arrows' ? r.lvl + ' av ' + r.max + ' pilar' : r.max === 1 ? (r.lvl ? 'Har den' : '') : 'Nivå ' + r.lvl + ' av ' + r.max, FX0 + FW - 18, y + 17);
      g.font = 'bold 15px ' + TXT; g.fillStyle = maxed ? '#c9bfff' : can ? '#7dff8a' : '#ff9a8a';
      g.fillText(maxed ? (r.k === 'arrows' ? 'Fullt' : 'Klar') : r.cost ? costText(r.cost) : 'Kräver båge', FX0 + FW - 18, y + 36);
    });
    var hr = forgeTab === 2 && forgeRows()[forgeSel], ht2 = hr && howTo(hr.k);   // v3.7.2: Så gör du, för den valda kraften
    if (ht2) {
      var hy = FY0 + forgeRows().length * FSTEP + 4, hh = 86;
      tag(FX0, hy, FW, hh);
      if (howToT > 0) { rr(g, FX0, hy, FW, hh, 9); g.fillStyle = 'rgba(255,225,77,' + 0.16 * Math.min(1, howToT) + ')'; g.fill(); g.strokeStyle = PAL.bolt; g.lineWidth = 2; g.stroke(); howToT -= 1 / 60; }
      g.textAlign = 'left'; g.font = 'bold 15px ' + TXT; g.fillStyle = PAL.bolt; g.fillText('Så gör du: ' + hr.name.replace(/, nivå \d/, ''), FX0 + 16, hy + 18);
      g.font = '14px ' + TXT; g.fillStyle = PAL.chalk; ht2.forEach(function (ln, li) { g.fillText(ln, FX0 + 16, hy + 39 + li * 18); });
    }
    tag(LW / 2 - 95, FBY - 24, 190, 48);
    g.textAlign = 'center'; g.fillStyle = PAL.chalk; g.font = 'bold 22px ' + TXT; g.fillText('Stäng', LW / 2, FBY + 1);
    g.font = '15px ' + TXT; g.fillStyle = 'rgba(250,250,242,0.75)';
    g.fillText(touchMode ? 'Tryck på en flik eller en rad för att köpa.' : 'Tab byter flik. Pilarna väljer, Enter köper (eller 1 till 6). E eller Esc stänger.', LW / 2, FBY + 42);
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
    var T = touchMode, hit = T ? 'tryck Slå' : 'slå med ' + KN('attack');
    if (guideMoved < 80 && P.sword === 0 && P.wood === 0) return { t: T ? 'Dra med vänster tumme för att gå.' : 'Gå med ' + moveKeysText() + '.' };
    if (P.sword === 0 && P.wood < 2) return { t: 'Hugg träd: gå fram till ett träd och ' + hit + '. Trä: ' + P.wood + ' av 2.', target: nearest(treeList()) };
    if (P.sword === 0 && P.stone < 3) return { t: 'Bryt sten: ' + hit + ' på en grå sten. Sten: ' + P.stone + ' av 3.', target: nearest(stoneList()) };
    if (P.sword === 0) return { t: 'Gå till ugnen, ' + (T ? 'tryck Smid' : 'tryck ' + KN('use')) + ' och gör ett stensvärd.', target: smeltPos };
    if (!P.hasPick && P.wood < 2) return { t: 'Nu behövs en stenhacka. Hugg mer trä: ' + P.wood + ' av 2.', target: nearest(treeList()) };
    if (!P.hasPick && P.stone < 3) return { t: 'Bryt mer sten till stenhackan: ' + P.stone + ' av 3.', target: nearest(stoneList()) };
    if (!P.hasPick) return { t: 'Gå till ugnen och gör en stenhacka. Den behövs för att bryta koppar.', target: smeltPos };
    if (P.sword < 3 && P.ore < 4) return { t: 'Med stenhackan kan du bryta den orange kopparmalmen. Koppar: ' + P.ore + '.', target: nearest(oreList(0)) };
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
    if (P.shield > 0) touchButton(BTN_SHIELD, touch.shieldId != null, iconShieldRound, 'Sköld');
    if (P.shield > 0 && P.bash > 0) {                          // v3.7.2: blå ring = knuffen är redo, annars laddar den
      var bcd = Math.max(0, P.bashCd) / C.powers.bash.cooldown[P.bash]; g.lineCap = 'round'; g.lineWidth = 4;
      g.strokeStyle = bcd > 0 ? 'rgba(160,215,255,0.55)' : 'rgba(160,215,255,' + (0.55 + 0.4 * Math.sin(time * 5)) + ')';
      g.beginPath(); g.arc(BTN_SHIELD.x, BTN_SHIELD.y, BTN_SHIELD.r + 5, -1.571, -1.571 + (1 - bcd) * 6.283); g.stroke();
    }
    if (P.bow > 0) touchButton(BTN_BOW, touch.bowId != null, iconBow, 'Skjut', P.arrows === 0, P.arrows || null);
    var em = eMode();
    if (em === 'forge' || nearSmelt) touchButton(BTN_E, touch.eId !== null, iconHammer, 'Smid', false);
    else if (em === 'skin') touchButton(BTN_E, touch.eId !== null, iconKnife, 'Flå', !P.knife);
    else if (em === 'fish') touchButton(BTN_E, touch.eId !== null, iconRod, 'Fiska', false);
    else touchButton(BTN_E, touch.eId !== null, iconMeat, 'Ät', P.meat === 0 || P.hp >= maxHp(), P.meat);
    g.restore();
  }

