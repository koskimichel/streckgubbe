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
    var hasFlax = P.flax > 0 || P.rod;
    if (hasFlax) stats.splice(2, 0, [iconFlaxS, String(P.flax)]);
    if (P.hide > 0 || P.quiver) stats.splice(hasFlax ? 3 : 2, 0, [iconHideS, String(P.hide)]);
    if (P.moonEver || P.moon > 0) stats.splice(2, 0, [function (x, y) { moonShape(x, y, 0.62); }, String(P.moon)]);
    stats.splice(0, 0, [function (x, y) { g.save(); g.translate(x, y); g.scale(0.55, 0.55); iconBolt(); g.restore(); }, P.bolts + '/' + C.boltPower.max, touchMode ? null : 'Q']);
    var metStats = [];                                           // metaller som du har eller kan bryta
    for (var mt = 0; mt < 4; mt++) if (metalAmt(mt) > 0 || mt <= P.pick) (function (q) { metStats.push([function (x, y) { iconMetal(x, y, q); }, String(metalAmt(q))]); })(mt);
    stats.splice.apply(stats, [3, 0].concat(metStats));
    if (P.bow > 0) stats.splice(1, 0, [iconArrowSmall, String(P.arrows), touchMode ? null : 'F']);   // pilar
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
      if (gtx !== goalLast) { goalLast = gtx; goalUntil = time + 6; }      // visas en stund när målet ändras, och alltid när du har råd
      var gA = goal.can ? 1 : clamp((goalUntil - time) / 0.6, 0, 1);
      if (gA > 0) { g.save(); g.globalAlpha = gA; tag(x0, 42, gw, 22); g.fillStyle = goal.can ? '#7dff8a' : 'rgba(250,250,242,0.85)'; g.fillText(gtx, x0 + 11, 53); g.restore(); }
      g.font = 'bold 15px ' + TXT;
    }
    // nivå och monster kvar, högerställt
    var left = quota - kills, t2 = 'Nivå ' + level + (lapOf(level) ? ', varv ' + (lapOf(level) + 1) : ''), t3 = left > 0 && !exitOpen() ? String(left) : 'portalen är öppen';
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

