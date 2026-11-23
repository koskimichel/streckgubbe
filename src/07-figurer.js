  // ---------- figurer ----------
  function shadow(x, y, rw, a) { g.fillStyle = 'rgba(0,0,0,' + (a || 0.3) + ')'; g.beginPath(); g.ellipse(x, y, rw, rw * 0.35, 0, 0, 7); g.fill(); }

  function stick(x, y, fx_, fy_, swing, armed, walk, moving, offH) {
    var lg_ = moving ? Math.sin(walk) * 5 : 0, bob = moving ? Math.abs(Math.cos(walk)) * 1.2 : 0;
    var ang = Math.atan2(fy_, fx_) + (swing > 0 ? (0.18 - swing) * 8 - 0.7 : 0);
    var hx = x + fx_ * 9, hy = y - 2 - bob + fy_ * 6;
    function body(col, w) {
      g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.arc(x, y - 14 - bob, 5, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(x, y - 9 - bob); g.lineTo(x, y + 3 - bob);
      g.moveTo(x, y + 3 - bob); g.lineTo(x - 5 + lg_, y + 12); g.moveTo(x, y + 3 - bob); g.lineTo(x + 5 - lg_, y + 12);
      g.moveTo(x, y - 6 - bob); g.lineTo(hx, hy);
      g.moveTo(x, y - 6 - bob);
      if (offH) g.lineTo(offH.x, offH.y); else g.lineTo(x - fx_ * 6 - lg_ * 0.4, y - 1 - bob - fy_ * 2);
      g.stroke();
    }
    body('rgba(10,20,10,0.55)', 5.5);                    // kontur
    body(PAL.chalk, 2.6);
    if (armed) drawWeapon(hx, hy, ang, armed);
  }

  function swordLook(l) {                                       // svärdet ser ut som sitt material
    if (l <= 2) return { col: '#9a9ea6', edge: '#e1e4ea', glow: null, stone: true };
    if (l <= 5) return { col: '#e0763a', edge: '#ffc49a', glow: null };
    if (l <= 8) return { col: '#c9d0da', edge: '#ffffff', glow: l >= 8 ? 'rgba(210,225,255,0.18)' : null };
    if (l <= 11) return { col: '#f0c94a', edge: '#fff1a8', glow: 'rgba(255,225,77,0.25)' };
    return { col: '#6ab8ff', edge: '#e6f5ff', glow: 'rgba(120,190,255,0.35)', star: true };
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
    g.strokeStyle = a.edge || 'rgba(255,255,255,0.75)'; g.lineWidth = 0.9;
    g.beginPath(); g.moveTo(bx + px * 0.6, by + py * 0.6); g.lineTo(hx + ca * (L - 4), hy + sa * (L - 4)); g.stroke();
    if (a.stone) {                                         // stenklinga med prickar
      g.fillStyle = 'rgba(60,62,70,0.7)';
      for (var gi = 0; gi < 4; gi++) { var f0 = 0.3 + gi * 0.15, sg2 = gi % 2 ? 0.8 : -0.8; g.beginPath(); g.arc(hx + ca * L * f0 + px * sg2, hy + sa * L * f0 + py * sg2, 0.9, 0, 7); g.fill(); }
    }
    if (a.star && Math.sin(time * 9) > 0.3) {               // stjärnsvärdet glittrar
      var sf = 0.35 + 0.55 * ((Math.sin(time * 2.7) + 1) / 2), sxp = hx + ca * L * sf, syp = hy + sa * L * sf;
      g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.beginPath(); g.moveTo(sxp - 3, syp); g.lineTo(sxp + 3, syp); g.moveTo(sxp, syp - 3); g.lineTo(sxp, syp + 3); g.stroke();
    }
    g.strokeStyle = '#8a6a2a'; g.lineWidth = 3; g.lineCap = 'round';   // parerstång
    g.beginPath(); g.moveTo(bx + px * 5, by + py * 5); g.lineTo(bx - px * 5, by - py * 5); g.stroke();
    if (a.glow) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = a.glow; g.lineWidth = 6;
      g.beginPath(); g.moveTo(bx, by); g.lineTo(hx + ca * L, hy + sa * L); g.stroke(); g.restore();
    }
  }

  // Rustningen växer: 1 bröstplåt, 2 axelskydd, 3 hjälm, 4 blått stål med plym, 5 guld som glimmar
  // Rustningen har fyra delar (0 bröstplåt, 1 hjälm, 2 axelskydd, 3 benskydd) som byggs och byts en i taget.
  var ARMOR_MAT = [{ col: '#e0763a', dark: '#7a3414' }, { col: '#c9d0da', dark: '#545c6a' }, { col: '#f0c94a', dark: '#a8781f' }, { col: '#6ab8ff', dark: '#2a5aa0' }];
  var ARMOR_PART = ['Bröstplåt', 'Hjälm', 'Axelskydd', 'Benskydd'];
  function armorPartTier(p, a) { a = a == null ? P.armor : a; return a < p + 1 ? -1 : Math.min(3, Math.floor((a - p - 1) / 4)); }
  function drawArmor() {
    var a = P.armor; if (a <= 0) return;
    var bob = P.moving ? Math.abs(Math.cos(P.walk)) * 1.2 : 0, lgw = P.moving ? Math.sin(P.walk) * 5 : 0, x = P.x, y = P.y - bob, M, s;
    g.lineJoin = 'round'; g.lineWidth = 1.2; g.lineCap = 'round';
    var tl = armorPartTier(3);                                   // benskydd
    if (tl >= 0) {
      M = ARMOR_MAT[tl]; g.lineWidth = 3.4;
      for (s = -1; s <= 1; s += 2) {
        var fx2 = x + s * 5 - s * lgw, k1 = 0.45, k2 = 0.9;
        g.strokeStyle = M.dark; g.lineWidth = 4.4; g.beginPath(); g.moveTo(x + (fx2 - x) * k1, y + 3 + 9 * k1 + bob * k1); g.lineTo(x + (fx2 - x) * k2, y + 3 + 9 * k2 + bob * k2); g.stroke();
        g.strokeStyle = M.col; g.lineWidth = 2.8; g.stroke();
      }
      g.lineWidth = 1.2;
    }
    var tc = armorPartTier(0);                                   // bröstplåt
    if (tc >= 0) {
      M = ARMOR_MAT[tc];
      g.beginPath(); g.moveTo(x - 5, y - 9); g.lineTo(x + 5, y - 9); g.lineTo(x + 4, y + 1); g.quadraticCurveTo(x, y + 4, x - 4, y + 1); g.closePath();
      g.fillStyle = M.col; g.fill(); g.strokeStyle = M.dark; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.moveTo(x - 2.5, y - 7); g.lineTo(x - 2.5, y - 1); g.stroke();
    }
    var ts = armorPartTier(2);                                   // axelskydd
    if (ts >= 0) {
      M = ARMOR_MAT[ts];
      for (s = -1; s <= 1; s += 2) { g.beginPath(); g.ellipse(x + s * 5.5, y - 8, 3.4, 2.6, 0, Math.PI, 0); g.closePath(); g.fillStyle = M.col; g.fill(); g.strokeStyle = M.dark; g.stroke(); }
    }
    var th = armorPartTier(1);                                   // hjälm
    if (th >= 0) {
      M = ARMOR_MAT[th];
      g.beginPath(); g.arc(x, y - 14, 6.3, Math.PI * 1.02, Math.PI * 1.98); g.lineTo(x + 6.3, y - 13); g.lineTo(x - 6.3, y - 13); g.closePath();
      g.fillStyle = M.col; g.fill(); g.strokeStyle = M.dark; g.stroke();
      g.fillStyle = M.dark; g.fillRect(x - 0.8, y - 14, 1.6, 4);
      if (th >= 2) { g.fillStyle = th >= 3 ? '#ff4d6a' : '#e8eef5'; g.beginPath(); g.moveTo(x, y - 20); g.quadraticCurveTo(x + 5, y - 26, x + 1, y - 27); g.quadraticCurveTo(x - 2, y - 24, x, y - 20); g.fill(); }
    }
    var lowest = Math.min(tl, tc, ts, th);                       // hel rustning av guld eller bättre glimmar
    if (lowest >= 2) { g.save(); g.globalCompositeOperation = 'lighter'; glow(x, y - 4, 20, lowest >= 3 ? '120,190,255' : '255,210,80', 0.12 + 0.08 * Math.sin(time * 4)); g.restore(); }
  }

  // Sköld: rak överkant och spets nedåt, emblem efter material (koppar nitar, järn blått kors, guld rött fält, stjärnmalm stjärna).
  function drawShieldShape(cx, cy, sc, tier, lit) {
    var M = ARMOR_MAT[tier];
    g.save(); g.translate(cx, cy); g.scale(sc, sc); g.lineJoin = 'round';
    function path() { g.beginPath(); g.moveTo(-6, -7); g.quadraticCurveTo(0, -9, 6, -7); g.lineTo(6, -1); g.quadraticCurveTo(5.5, 5.5, 0, 9.5); g.quadraticCurveTo(-5.5, 5.5, -6, -1); g.closePath(); }
    path(); g.strokeStyle = 'rgba(10,20,10,0.55)'; g.lineWidth = 3.4; g.stroke();
    g.fillStyle = M.col; g.fill();
    g.save(); path(); g.clip();
    if (tier === 0) {
      g.fillStyle = M.dark; g.fillRect(-7, -2.6, 14, 2.4);
      g.fillStyle = '#ffd08a'; [[-3.6, -5.2], [3.6, -5.2], [-3, 3], [3, 3]].forEach(function (q) { g.beginPath(); g.arc(q[0], q[1], 0.85, 0, 7); g.fill(); });
    } else if (tier === 1) {
      g.fillStyle = '#3d6fb8'; g.fillRect(-1.7, -9, 3.4, 19); g.fillRect(-7, -3.6, 14, 3.4);
    } else if (tier === 2) {
      g.strokeStyle = M.dark; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, -9); g.lineTo(0, 10); g.moveTo(-7, -1.4); g.lineTo(7, -1.4); g.stroke();
      g.fillStyle = '#c8324a'; g.beginPath(); g.moveTo(0, -5.4); g.lineTo(3, -1.4); g.lineTo(0, 2.6); g.lineTo(-3, -1.4); g.closePath(); g.fill();   /* röd ädelsten */
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.moveTo(0, -4.4); g.lineTo(1.2, -2.6); g.lineTo(0, -1.8); g.closePath(); g.fill();
    } else {
      g.fillStyle = '#ffffff'; g.beginPath();
      for (var si = 0; si < 10; si++) { var sa = -Math.PI / 2 + si * Math.PI / 5, sr = si % 2 ? 1.8 : 4.2; g.lineTo(Math.cos(sa) * sr, -0.5 + Math.sin(sa) * sr); }
      g.closePath(); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(-6, -8, 2, 13);   /* glans */
    g.restore();
    if (tier < 2) { g.fillStyle = '#d9b24a'; g.beginPath(); g.arc(0, -1.4, 1.7, 0, 7); g.fill(); g.strokeStyle = M.dark; g.lineWidth = 0.6; g.stroke(); }
    path(); g.lineWidth = 1.4; g.strokeStyle = lit ? '#ffffff' : M.dark; g.stroke();
    if (tier >= 2) { g.save(); g.globalCompositeOperation = 'lighter'; glow(0, 0, 12, tier === 3 ? '120,190,255' : '255,210,80', 0.14 + 0.06 * Math.sin(time * 4)); g.restore(); }
    if (tier === 3 && Math.sin(time * 7) > 0.4) { g.strokeStyle = '#ffffff'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(2, -6); g.lineTo(5, -6); g.moveTo(3.5, -7.5); g.lineTo(3.5, -4.5); g.stroke(); }
    g.restore();
  }
  // Båge: ang = skjutriktning, L = halva längden, pull 0-1 drar strängen bakåt, nocked = pil på strängen.
  var BOW_COL = [null, { limb: '#a8743c', dark: '#5e3b18' }, { limb: '#c9d0da', dark: '#545c6a' }, { limb: '#f0c94a', dark: '#a8781f' }];
  function drawBowShape(cx, cy, ang, L, tier, pull, nocked) {
    var B = BOW_COL[Math.max(1, Math.min(3, tier))], dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx, back = L * 0.42;
    var t1x = cx + px * L - dx * back, t1y = cy + py * L - dy * back, t2x = cx - px * L - dx * back, t2y = cy - py * L - dy * back;
    var nx = cx - dx * (back + pull * 5), ny = cy - dy * (back + pull * 5);
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(245,245,235,0.95)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(t1x, t1y); g.lineTo(nx, ny); g.lineTo(t2x, t2y); g.stroke();
    if (nocked) {
      var ax = cx + dx * L * 0.55, ay = cy + dy * L * 0.55;
      g.strokeStyle = '#8a5a2b'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(nx, ny); g.lineTo(ax, ay); g.stroke();
      g.fillStyle = '#e1e4ea'; g.beginPath(); g.moveTo(ax + dx * 3, ay + dy * 3); g.lineTo(ax + px * 1.6, ay + py * 1.6); g.lineTo(ax - px * 1.6, ay - py * 1.6); g.closePath(); g.fill();
    }
    function limbs() {
      g.beginPath(); g.moveTo(t1x, t1y);
      g.quadraticCurveTo(cx + px * L * 0.75 + dx * L * 0.14, cy + py * L * 0.75 + dy * L * 0.14, cx, cy);
      g.quadraticCurveTo(cx - px * L * 0.75 + dx * L * 0.14, cy - py * L * 0.75 + dy * L * 0.14, t2x, t2y);
    }
    limbs(); g.strokeStyle = 'rgba(10,20,10,0.6)'; g.lineWidth = 4; g.stroke();
    g.strokeStyle = B.limb; g.lineWidth = 2.3; g.stroke();
    g.strokeStyle = B.dark; g.lineWidth = 3; g.beginPath(); g.moveTo(cx + px * 2, cy + py * 2); g.lineTo(cx - px * 2, cy - py * 2); g.stroke();   /* handtag */
    g.fillStyle = B.dark; g.beginPath(); g.arc(t1x, t1y, 1.1, 0, 7); g.arc(t2x, t2y, 1.1, 0, 7); g.fill();
    if (tier >= 3) { g.save(); g.globalCompositeOperation = 'lighter'; glow(cx, cy, L * 1.2, '255,210,80', 0.16); g.restore(); }
  }
  function drawQuiver(x, y, s, n) {                              // koger på ryggen med fjädrar som sticker upp
    g.save(); g.translate(x, y); g.rotate(-s * 0.5);
    var k = Math.min(3, n);
    for (var i = 0; i < k; i++) {
      var ox = (i - (k - 1) / 2) * 2.2;
      g.strokeStyle = '#8a5a2b'; g.lineWidth = 1; g.beginPath(); g.moveTo(ox, -4); g.lineTo(ox, -8); g.stroke();
      g.fillStyle = i % 2 ? '#f4f4f4' : '#e0503a'; g.beginPath(); g.moveTo(ox, -7); g.lineTo(ox - 1.4, -10.5); g.lineTo(ox + 1.4, -10.5); g.closePath(); g.fill();
    }
    rr(g, -3, -5, 6, 11, 1.5); g.fillStyle = '#7a4a22'; g.fill(); g.strokeStyle = 'rgba(10,20,10,0.6)'; g.lineWidth = 1; g.stroke();
    g.strokeStyle = '#c9a06a'; g.beginPath(); g.moveTo(-3, -2); g.lineTo(3, -2); g.moveTo(-3, 3); g.lineTo(3, 3); g.stroke();
    g.restore();
  }

  function drawPlayer() {
    var pw = power(), armed;
    if (P.sword === 0) armed = { len: 20 };
    else { var sl = swordLook(P.sword); armed = { sword: true, len: 22 + Math.min(P.sword, 10) * 1.5, col: sl.col, edge: sl.edge, glow: sl.glow, wood: sl.wood, star: sl.star }; }
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
    var sd = P.fx >= 0 ? 1 : -1, bobP = P.moving ? Math.abs(Math.cos(P.walk)) * 1.2 : 0, shooting = P.bow > 0 && P.shotT > 0, offH = null;
    if (P.bow > 0 && P.arrows > 0) drawQuiver(P.x - sd * 4, P.y - 5 - bobP, sd, P.arrows);                    // på ryggen, bakom kroppen
    if (P.bow > 0 && !shooting) drawBowShape(P.x - sd * 2, P.y - 4 - bobP, sd > 0 ? Math.PI + 0.9 : -0.9, 10, P.bow, 0, false);
    if (P.shield > 0 && !P.blocking) drawShieldShape(P.x - sd * 5, P.y - 3 - bobP, 0.7, P.shield - 1, false);
    var hxP = P.x + P.fx * 9, hyP = P.y - 2 - bobP + P.fy * 6, pull = shooting ? clamp((P.shotT - 0.2) / 0.15, 0, 1) : 0;
    var shX = P.x + P.fx * 9, shY = P.y - 5 - bobP + P.fy * 5, bf = Math.max(0, P.blockFlash);
    if (shooting) offH = { x: hxP - P.fx * (4.6 + pull * 5), y: hyP - P.fy * (4.6 + pull * 5) };   // handen på strängen
    else if (P.blocking) offH = { x: shX, y: shY + 2 };
    stick(P.x, P.y, P.fx, P.fy, P.swing, (shooting || P.fish) ? null : armed, P.walk, P.moving, offH);
    drawArmor();
    if (shooting) drawBowShape(hxP, hyP, Math.atan2(P.fy, P.fx), 11, P.bow, pull, pull > 0);
    if (P.fish) drawRodLine(hxP, hyP);
    if (P.shield > 0 && P.blocking) {                          // skölden uppe framför
      g.save(); g.globalCompositeOperation = 'lighter'; glow(shX, shY, 16 + bf * 40, '230,245,255', 0.18 + bf * 1.6); g.restore();
      drawShieldShape(shX, shY, 1, P.shield - 1, bf > 0);
    }
    if (P.slow > 0) {                                          // fast i nät
      g.save(); g.globalAlpha = Math.min(1, P.slow); g.strokeStyle = 'rgba(235,235,245,0.85)'; g.lineWidth = 1;
      for (var wi = 0; wi < 5; wi++) { var wa = wi * 1.26; g.beginPath(); g.moveTo(P.x + Math.cos(wa) * 14, P.y - 2 + Math.sin(wa) * 14); g.lineTo(P.x - Math.cos(wa) * 14, P.y - 2 - Math.sin(wa) * 14); g.stroke(); }
      g.beginPath(); g.arc(P.x, P.y - 2, 9, 0, 7); g.stroke(); g.restore();
    }
    g.restore();
  }

  function drawRodLine(hx, hy) {                                 // fiskespö, lina och flöte
    var f = P.fish, dx = f.x - hx, dy = f.y - hy, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
    var tx = hx + ux * 18, ty = hy + uy * 10 - 12, bite = f.phase === 'bite', by = f.y + (bite ? 2.5 : Math.sin(time * 3) * 1.2);
    g.lineCap = 'round'; g.strokeStyle = 'rgba(10,20,10,0.55)'; g.lineWidth = 3.4; g.beginPath(); g.moveTo(hx, hy); g.lineTo(tx, ty); g.stroke();
    g.strokeStyle = '#a8743c'; g.lineWidth = 1.8; g.stroke();
    g.strokeStyle = 'rgba(240,240,240,0.85)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo((tx + f.x) / 2, Math.max(ty, by) + 6, f.x, by - 3); g.stroke();
    var rr2 = (time * (bite ? 24 : 8)) % 10 + 3;
    g.strokeStyle = 'rgba(255,255,255,' + (bite ? 0.75 : 0.3) + ')'; g.lineWidth = 1; g.beginPath(); g.ellipse(f.x, by + 2, rr2, rr2 * 0.4, 0, 0, 7); g.stroke();
    g.fillStyle = '#e53b3b'; g.beginPath(); g.arc(f.x, by - 1, 2.8, Math.PI, 0); g.fill();
    if (!bite) { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(f.x, by - 1, 2.8, 0, Math.PI); g.fill(); }
    if (bite) {                                                  // napp! gul pratbubbla
      var ey3 = P.y - 36 + Math.sin(time * 14) * 1.5;
      g.save(); g.globalCompositeOperation = 'lighter'; glow(P.x, ey3, 16, '255,225,77', 0.45); g.restore();
      g.fillStyle = PAL.bolt; g.beginPath(); g.arc(P.x, ey3, 8, 0, 7); g.fill();
      g.fillStyle = '#1a2a1a'; g.font = 'bold 13px ' + TXT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', P.x, ey3 + 1); g.textAlign = 'left';
    }
  }
  function drawEHint() {                                         // liten lapp ovanför gubben: vad E gör här
    if (state !== 'play') return;
    if (backPos && level >= 2 && Math.hypot(backPos.x - P.x, backPos.y - P.y) < 80) {
      g.font = 'bold 12px ' + TXT; var bt = 'Tillbaka till nivå ' + (level - 1), bw = g.measureText(bt).width + 14;
      tag(backPos.x - bw / 2 + 12, backPos.y - 38, bw, 18); g.fillStyle = '#bff4fb'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(bt, backPos.x + 12, backPos.y - 29); g.textAlign = 'left';
    }
    if (touchMode || P.fish) return;
    var mode = eMode(), txt = mode === 'skin' ? 'E: flå' : mode === 'fish' ? 'E: fiska' : null;
    if (!txt) return;
    g.font = 'bold 12px ' + TXT; var w = g.measureText(txt).width + 14;
    tag(P.x - w / 2, P.y - 46, w, 18); g.fillStyle = PAL.chalk; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, P.x, P.y - 37); g.textAlign = 'left';
  }
  var PREY_COL = { rabbit: ['#a8774a', '#5e3b18'], hare: ['#f2f2ee', '#8a909a'], lizard: ['#9bb34a', '#4e5e1f'], salamander: ['#e2552a', '#6a1a0a'] };
  function drawPrey() {
    prey.forEach(function (p) {
      var col = PREY_COL[p.kind], hopY = p.moving ? -Math.abs(Math.sin(p.hop)) * 4 : 0;
      shadow(p.x, p.y + 7, 7, 0.25);
      g.save(); g.translate(p.x, p.y + hopY); if (p.fx < 0) g.scale(-1, 1); if (p.dead) g.rotate(Math.PI / 2 * 0.9);
      g.lineWidth = 1; g.strokeStyle = col[1]; g.fillStyle = col[0];
      if (p.kind === 'rabbit' || p.kind === 'hare') {
        g.beginPath(); g.ellipse(0, 0, 7, 5, 0, 0, 7); g.fill(); g.stroke();
        g.beginPath(); g.arc(6, -3, 3.6, 0, 7); g.fill(); g.stroke();
        g.beginPath(); g.ellipse(4.6, -9, 1.4, 4, -0.25, 0, 7); g.fill(); g.stroke();
        g.beginPath(); g.ellipse(7.4, -8.6, 1.4, 4, 0.25, 0, 7); g.fill(); g.stroke();
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(-7, -1, 2, 0, 7); g.fill();
      } else {
        g.lineWidth = 2.6; g.strokeStyle = col[0]; g.beginPath(); g.moveTo(-5, 0); g.quadraticCurveTo(-11, 1, -15, 4); g.stroke();   /* svans */
        g.lineWidth = 1.6; g.strokeStyle = col[1];
        g.beginPath(); g.moveTo(-3, 2); g.lineTo(-5, 6); g.moveTo(3, 2); g.lineTo(5, 6); g.moveTo(-3, -2); g.lineTo(-5, -5); g.moveTo(3, -2); g.lineTo(5, -5); g.stroke();
        g.lineWidth = 1; g.fillStyle = col[0]; g.beginPath(); g.ellipse(0, 0, 7, 3.2, 0, 0, 7); g.fill(); g.stroke();
        g.beginPath(); g.ellipse(8, 0, 3.4, 2.4, 0, 0, 7); g.fill(); g.stroke();
        g.fillStyle = p.kind === 'salamander' ? '#1a1a1a' : '#6f8a2a'; g.beginPath(); g.arc(-2, 0, 1, 0, 7); g.arc(2, -0.5, 1, 0, 7); g.fill();
      }
      if (p.dead) { g.strokeStyle = '#1a1a1a'; g.lineWidth = 1; var exx = p.kind === 'rabbit' || p.kind === 'hare' ? 7 : 9, eyy = p.kind === 'rabbit' || p.kind === 'hare' ? -3.5 : -0.6; g.beginPath(); g.moveTo(exx - 1, eyy - 1); g.lineTo(exx + 1, eyy + 1); g.moveTo(exx + 1, eyy - 1); g.lineTo(exx - 1, eyy + 1); g.stroke(); }
      else { g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(p.kind === 'rabbit' || p.kind === 'hare' ? 7.3 : 9, p.kind === 'rabbit' || p.kind === 'hare' ? -3.6 : -0.6, 0.9, 0, 7); g.fill(); }
      g.restore();
    });
  }

  function eyes(x, y, gap, r, pr) {
    var d = Math.hypot(P.x - x, P.y - y) || 1, lx = (P.x - x) / d * r * 0.45, ly = (P.y - y) / d * r * 0.45;
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x - gap, y, r, 0, 7); g.arc(x + gap, y, r, 0, 7); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(x - gap + lx, y + ly, pr, 0, 7); g.arc(x + gap + lx, y + ly, pr, 0, 7); g.fill();
  }

  function drawMonsters() {
    mons.forEach(function (m) {
      var d = m.type === 'boss' ? { color: biome.bossColor } : C.monsters[m.type], flash = m.hit > 0, white = flash && FXC.flash !== false;
      var col = white ? '#ffffff' : flash ? shade(d.color, 0.35) : d.color;
      if (m.type === 'boss' && (m.ai === 'windCharge' || m.ai === 'windSlam') && Math.sin(time * 25) > 0) col = '#ff6b5a';   // varning
      var k = clamp(m.pop / 0.18, 0, 1), e = easeOutBack(k), sx = 1, sy = 1;
      if (k < 1) { sx = 1.3 + (1 - 1.3) * e; sy = 0.7 + (1 - 0.7) * e; }
      var fly = (m.type === 'bat' || m.type === 'ghost') ? 6 + Math.sin(time * 4 + m.ph) * 2 : 0;
      shadow(m.x, m.y + m.r * 0.85 + (fly ? 4 : 0), m.r * (fly ? 0.7 : 1), fly ? 0.2 : 0.3);
      if (m.elite) { g.save(); g.globalCompositeOperation = 'lighter'; glow(m.x, m.y - fly, m.r * 2.2, '200,120,255', 0.32 + 0.1 * Math.sin(time * 5 + m.ph)); g.restore(); }
      g.save(); g.translate(m.x, m.y + m.r); g.scale(sx, sy); g.translate(-m.x, -(m.y + m.r) - fly);
      if (m.type === 'boss') { drawBoss(m, white); } else if (m.type === 'slime') {
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
      } else if (m.type === 'spider') {
        var lgp = Math.sin(time * 14 + m.ph) * 2;
        g.strokeStyle = shade(d.color, -0.4); g.lineWidth = 1.6; g.lineCap = 'round';
        for (var li = 0; li < 4; li++) {
          for (var sd = -1; sd <= 1; sd += 2) {
            var ly = m.y - 4 + li * 3, o = li % 2 ? lgp : -lgp;
            g.beginPath(); g.moveTo(m.x + sd * 4, ly); g.quadraticCurveTo(m.x + sd * 11, ly - 6 + o, m.x + sd * 14, ly + 4 + o); g.stroke();
          }
        }
        g.fillStyle = col; g.beginPath(); g.ellipse(m.x, m.y + 4, 7, 8, 0, 0, 7); g.fill();
        g.fillStyle = shade(col, 0.15); g.beginPath(); g.arc(m.x, m.y - 5, 5, 0, 7); g.fill();
        g.fillStyle = '#ff3b3b'; [-2.5, -1, 1, 2.5].forEach(function (ex) { g.beginPath(); g.arc(m.x + ex, m.y - 6, 0.9, 0, 7); g.fill(); });
        g.fillStyle = '#d6203f'; g.beginPath(); g.moveTo(m.x, m.y + 1); g.lineTo(m.x + 2.5, m.y + 4); g.lineTo(m.x, m.y + 7); g.lineTo(m.x - 2.5, m.y + 4); g.closePath(); g.fill();
      } else if (m.type === 'ghost') {
        var wv = time * 6 + m.ph;
        g.globalAlpha = 0.72 + 0.15 * Math.sin(time * 3 + m.ph);
        g.fillStyle = col; g.beginPath(); g.moveTo(m.x - 10, m.y + 8); g.lineTo(m.x - 10, m.y - 2); g.arc(m.x, m.y - 2, 10, Math.PI, 0); g.lineTo(m.x + 10, m.y + 8);
        for (var wi2 = 0; wi2 < 4; wi2++) { var wx = m.x + 10 - (wi2 + 0.5) * 5; g.quadraticCurveTo(wx + 1, m.y + 12 + Math.sin(wv + wi2) * 2, wx - 2.5, m.y + 8); }
        g.closePath(); g.fill(); g.strokeStyle = 'rgba(80,90,140,0.6)'; g.lineWidth = 1.2; g.stroke();
        g.fillStyle = '#1a1a2e'; g.beginPath(); g.ellipse(m.x - 3.5, m.y - 3, 2, 3, 0, 0, 7); g.ellipse(m.x + 3.5, m.y - 3, 2, 3, 0, 0, 7); g.fill();
        g.beginPath(); g.ellipse(m.x, m.y + 3, 2, 1.6, 0, 0, 7); g.fill();
        g.globalAlpha = 1;
      } else {
        var r2 = m.r, arm = Math.sin(time * 5 + m.ph) * 2;
        g.fillStyle = shade(d.color, -0.25); g.strokeStyle = shade(d.color, -0.65); g.lineWidth = 1.6;
        g.beginPath(); g.arc(m.x - r2 - 2, m.y + 3 + arm, 5, 0, 7); g.fill(); g.stroke();
        g.beginPath(); g.arc(m.x + r2 + 2, m.y + 3 - arm, 5, 0, 7); g.fill(); g.stroke();
        g.beginPath(); g.ellipse(m.x, m.y + 1, r2 * 1.05, r2 * 0.95, 0, 0, 7);   // rund kropp, ingen låda
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
      if (m.type === 'boss') drawBossExtras(m);
      if (m.hp < m.maxHp && m.type !== 'boss') {
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
      } else if (it.t === 'ore') iconMetal(it.x, it.y + bob, it.k || 0);
      else if (it.t === 'moon') moonShape(it.x, it.y + bob, 1);
      else if (it.t === 'arrows') { iconArrowSmall(it.x - 3, it.y + bob); iconArrowSmall(it.x + 3, it.y + bob + 2); }
      else if (it.t === 'flax') { g.save(); g.translate(it.x, it.y + bob); g.scale(1.3, 1.3); iconFlaxS(0, 0); g.restore(); }
      else crystalShape(it.x, it.y + bob, 1);
    });
  }

  function drawPuzzle() {                                       // kista, runstenar, plattor, block och spak
    var pz = puzzle; if (!pz) return;
    var ch = pz.chest;
    if (!ch.taken) {
      shadow(ch.x, ch.y + 9, 11, 0.3);
      rr(g, ch.x - 11, ch.y - 7, 22, 15, 3); g.fillStyle = '#8a5a2b'; g.fill(); g.strokeStyle = '#3a220c'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = '#d9b24a'; g.fillRect(ch.x - 11, ch.y - 2, 22, 2.5); g.fillRect(ch.x - 1.5, ch.y - 4, 3, 6);
      if (pz.solved) { g.save(); g.globalCompositeOperation = 'lighter'; glow(ch.x, ch.y, 26, '255,210,80', 0.35 + 0.15 * Math.sin(time * 5)); g.restore(); }
    }
    if (pz.kind === 'runes') {
      pz.runes.forEach(function (ru, i) {
        shadow(ru.x, ru.y + 11, 8, 0.3);
        rr(g, ru.x - 7, ru.y - 12, 14, 22, 5); g.fillStyle = '#7b7f86'; g.fill(); g.strokeStyle = '#3a3c41'; g.lineWidth = 1.5; g.stroke();
        var lit = ru.lit > 0, bad = ru.bad > 0;
        if (lit || bad || pz.solved) { g.save(); g.globalCompositeOperation = 'lighter'; glow(ru.x, ru.y - 2, 22, bad ? '255,70,70' : '255,225,77', pz.solved && !lit ? 0.22 : 0.6); g.restore(); }
        g.strokeStyle = bad ? '#ff6b6b' : (lit || pz.solved) ? PAL.bolt : '#c9ccd2'; g.lineWidth = 2; g.lineCap = 'round';
        runeGlyph(ru.x, ru.y - 2, i);
      });
    } else {
      pz.plates.forEach(function (pl) {
        var cx = (pl.tx + 0.5) * TS, cy = (pl.ty + 0.5) * TS, on = !!blockAt(pl.tx, pl.ty);
        g.fillStyle = on ? '#ffe14d' : '#8a8f99'; g.beginPath(); g.ellipse(cx, cy + 2, 11, 7, 0, 0, 7); g.fill(); g.strokeStyle = '#3a3c41'; g.lineWidth = 1.5; g.stroke();
        if (on) { g.save(); g.globalCompositeOperation = 'lighter'; glow(cx, cy, 20, '255,225,77', 0.35); g.restore(); }
      });
      var lv = pz.lever, la = lv.flip > 0 ? 0.7 : -0.6;
      g.fillStyle = '#5c6069'; rr(g, lv.x - 7, lv.y + 3, 14, 7, 2); g.fill();
      g.strokeStyle = '#8a5a2b'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(lv.x, lv.y + 6); g.lineTo(lv.x + Math.sin(la) * 13, lv.y + 6 - Math.cos(la) * 13); g.stroke();
      g.fillStyle = '#ff4d6a'; g.beginPath(); g.arc(lv.x + Math.sin(la) * 13, lv.y + 6 - Math.cos(la) * 13, 3.4, 0, 7); g.fill();
      pz.blocks.forEach(function (b) {
        var bx = b.tx * TS + b.ox, by = b.ty * TS + b.oy;
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(bx + 4, by + TS - 5, TS - 4, 5);
        rr(g, bx + 2, by + 1, TS - 4, TS - 4, 4);
        var gr = g.createLinearGradient(0, by, 0, by + TS); gr.addColorStop(0, '#b4b8c2'); gr.addColorStop(1, '#5c6069'); g.fillStyle = gr; g.fill();
        g.strokeStyle = '#2f3138'; g.lineWidth = 1.6; g.stroke();
        g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(bx + 8, by + 8); g.lineTo(bx + 14, by + 14); g.lineTo(bx + 12, by + 20); g.stroke();
      });
    }
  }
  function runeGlyph(x, y, i) {                                  // sju olika runtecken
    var G = [[[-4, -6, 4, -6], [0, -6, 0, 6]], [[-4, -6, 0, 0], [0, 0, 4, -6], [0, 0, 0, 6]], [[-4, 6, 0, -6], [0, -6, 4, 6], [-2, 1, 2, 1]],
      [[-4, -6, -4, 6], [-4, 0, 4, -6], [-4, 0, 4, 6]], [[-4, -6, 4, 6], [4, -6, -4, 6]], [[0, -6, 4, 0], [4, 0, 0, 6], [0, 6, -4, 0], [-4, 0, 0, -6]],
      [[-4, -6, 4, -6], [4, -6, -4, 6], [-4, 6, 4, 6]]];
    g.beginPath(); G[i % G.length].forEach(function (l) { g.moveTo(x + l[0], y + l[1]); g.lineTo(x + l[2], y + l[3]); }); g.stroke();
  }
  function drawArrows() {
    arrows.forEach(function (a) {
      var l = Math.hypot(a.vx, a.vy) || 1, ux = a.vx / l, uy = a.vy / l;
      g.strokeStyle = '#8a5a2b'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(a.x - ux * 12, a.y - uy * 12); g.lineTo(a.x, a.y); g.stroke();
      g.fillStyle = ['#9a9ea6', '#e0763a', '#c9d0da', '#f0c94a', '#6ab8ff'][a.head || 0]; g.beginPath(); g.moveTo(a.x + ux * 4, a.y + uy * 4); g.lineTo(a.x - uy * 2.5, a.y + ux * 2.5); g.lineTo(a.x + uy * 2.5, a.y - ux * 2.5); g.closePath(); g.fill();
      g.strokeStyle = '#f4f4f4'; g.lineWidth = 1.2; g.beginPath();
      g.moveTo(a.x - ux * 12, a.y - uy * 12); g.lineTo(a.x - ux * 15 - uy * 3, a.y - uy * 15 + ux * 3);
      g.moveTo(a.x - ux * 12, a.y - uy * 12); g.lineTo(a.x - ux * 15 + uy * 3, a.y - uy * 15 - ux * 3); g.stroke();
    });
  }
  function drawShots() {                                     // spindelnät i luften
    shots.forEach(function (sh) {
      g.strokeStyle = 'rgba(240,240,250,0.9)'; g.lineWidth = 1.2; g.beginPath();
      for (var i = 0; i < 4; i++) { var a = i * 0.785 + time * 3; g.moveTo(sh.x - Math.cos(a) * 6, sh.y - Math.sin(a) * 6); g.lineTo(sh.x + Math.cos(a) * 6, sh.y + Math.sin(a) * 6); }
      g.stroke(); g.beginPath(); g.arc(sh.x, sh.y, 3.5, 0, 7); g.stroke();
    });
  }
  function drawBossExtras(m) {
    var top = m.y - m.r * 1.65;
    if (m.phase2 && !m.hidden) { g.save(); g.globalCompositeOperation = 'lighter'; glow(m.x, m.y, m.r * 2.2, '255,60,40', 0.12 + 0.06 * Math.sin(time * 6)); g.restore(); }
    if (m.ai === 'windCharge') {                               // varning: rusar längs linjen
      g.save(); g.setLineDash([8, 6]); g.strokeStyle = 'rgba(255,60,60,' + (0.5 + 0.4 * Math.sin(time * 20)) + ')'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(m.x, m.y); g.lineTo(m.x + m.dirx * 220, m.y + m.diry * 220); g.stroke(); g.restore();
    } else if (m.ai === 'windSlam') {                          // varning: chockvåg inom ringen
      var k2 = clamp(1 - m.aiT / (0.85 * DF().wind), 0, 1);
      g.save(); g.setLineDash([10, 8]); g.strokeStyle = 'rgba(255,60,60,0.75)'; g.lineWidth = 3;
      g.beginPath(); g.arc(m.x, m.y + 6, C.boss.slamRadius, 0, 7); g.stroke(); g.restore();
      g.fillStyle = 'rgba(255,60,60,' + (0.14 * k2) + ')'; g.beginPath(); g.arc(m.x, m.y + 6, C.boss.slamRadius * k2, 0, 7); g.fill();
    } else if (m.ai === 'emerge') {                            // varning: Sandkungen dyker upp här
      g.save(); g.setLineDash([6, 5]); g.strokeStyle = 'rgba(255,60,60,' + (0.6 + 0.3 * Math.sin(time * 18)) + ')'; g.lineWidth = 3;
      g.beginPath(); g.arc(m.ex, m.ey, 46, 0, 7); g.stroke(); g.restore();
    } else if (m.ai === 'stun') {                              // yr
      for (var i = 0; i < 3; i++) { var a = time * 5 + i * 2.1; g.fillStyle = PAL.bolt; g.beginPath(); g.arc(m.x + Math.cos(a) * 16, top + Math.sin(a) * 5, 2.4, 0, 7); g.fill(); }
    }
  }
  function rockShape(cx, cy, rw, rh, light, dark, seed) {
    g.beginPath();
    for (var i = 0; i < 8; i++) { var a = i / 8 * 6.283, kk = 0.82 + hash(seed, i, 400) * 0.26, px = cx + Math.cos(a) * rw * kk, py = cy + Math.sin(a) * rh * kk; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
    g.closePath();
    var gr = g.createLinearGradient(cx, cy - rh, cx, cy + rh); gr.addColorStop(0, light); gr.addColorStop(1, dark);
    g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(15,15,25,0.6)'; g.lineWidth = 1.5; g.stroke();
  }
  function furBlob(cx, cy, r, c1, c2) {
    g.beginPath();
    for (var i = 0; i < 18; i++) { var a = i / 18 * 6.283, r2 = r * (i % 2 ? 0.86 : 1.06), px = cx + Math.cos(a) * r2, py = cy + Math.sin(a) * r2; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
    g.closePath();
    var gr = g.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
    g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(90,110,140,0.6)'; g.lineWidth = 1.2; g.stroke();
  }
  function bossEyes(cx, cy, gap, r, rgb) {
    g.save(); g.globalCompositeOperation = 'lighter';
    [-1, 1].forEach(function (s) { glow(cx + s * gap, cy, r * 3.2, rgb, 0.5); g.fillStyle = 'rgba(' + rgb + ',1)'; g.beginPath(); g.arc(cx + s * gap, cy, r, 0, 7); g.fill(); });
    g.restore();
  }
  // Varje boss har en egen form: stengolem, gorilla, skorpion, yeti och lavademon.
  function drawBoss(m, white) {
    var k = m.kind, R = m.r * 1.3, t = time + m.ph, i, s;
    var look = Math.atan2(P.y - m.y, P.x - m.x), lx = Math.cos(look), ly = Math.sin(look);
    var up = (m.ai === 'windSlam' || m.ai === 'windRain') ? 1 : 0, lean = (m.ai === 'windCharge' || m.ai === 'charge') ? 1 : 0, dizzy = m.ai === 'stun' ? 1 : 0;
    var rage = m.phase2 ? 1 : 0, br = 1 + Math.sin(t * 2.4) * 0.03;
    function W_(c) { return white ? '#ffffff' : c; }
    if (m.hidden) {                                             // en sandhög som rör sig
      g.fillStyle = '#d9b56a'; g.beginPath(); g.ellipse(m.x, m.y + 6, R * 0.75, R * 0.38, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#c49a52'; for (i = 0; i < 4; i++) { g.beginPath(); g.arc(m.x - R * 0.4 + i * R * 0.27, m.y + 6 - Math.abs(Math.sin(t * 8 + i)) * 4, 3, 0, 7); g.fill(); }
      return;
    }
    g.save(); g.translate(m.x + lx * lean * 5, m.y + dizzy * 3); g.scale(br, 2 - br);
    if (k === 'golem') {
      var st = W_('#9a9da6'), sd = W_('#5b5e66');
      var armY = up ? -R * 0.95 : R * 0.1 + Math.sin(t * 3) * 2;
      for (s = -1; s <= 1; s += 2) rockShape(s * R * 0.95, armY, R * 0.36, R * 0.32, st, sd, 7 + s);
      rockShape(0, R * 0.15, R * 0.8, R * 0.7, st, sd, 1);
      rockShape(-R * 0.35, -R * 0.32, R * 0.45, R * 0.4, st, sd, 2);
      rockShape(R * 0.38, -R * 0.28, R * 0.42, R * 0.38, st, sd, 3);
      rockShape(0, -R * 0.62, R * 0.42, R * 0.36, st, sd, 4);
      g.fillStyle = W_('#5f8f3a'); g.beginPath(); g.ellipse(-R * 0.3, R * 0.05, R * 0.25, R * 0.12, 0.3, 0, 7); g.ellipse(R * 0.35, -R * 0.45, R * 0.18, R * 0.09, -0.4, 0, 7); g.fill();
      if (rage) {
        g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,140,40,' + (0.6 + 0.3 * Math.sin(t * 8)) + ')'; g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(-R * 0.2, -R * 0.1); g.lineTo(0, R * 0.2); g.lineTo(R * 0.25, R * 0.05); g.moveTo(0, R * 0.2); g.lineTo(-R * 0.1, R * 0.5); g.stroke(); g.restore();
      }
      g.fillStyle = W_('#757880');
      [-1, 0, 1].forEach(function (q) { g.beginPath(); g.moveTo(q * R * 0.22 - R * 0.09, -R * 0.9); g.lineTo(q * R * 0.22, -R * 1.18 - (q ? 0 : R * 0.1)); g.lineTo(q * R * 0.22 + R * 0.09, -R * 0.9); g.closePath(); g.fill(); });
      bossEyes(lx * 2, -R * 0.64 + ly * 1.5, R * 0.16, R * 0.08, rage ? '255,80,60' : '255,220,90');
    } else if (k === 'ape') {
      var fur = W_('#5a4130'), furD = W_('#33241a'), skin = W_('#a08a6a');   // brun päls syns mot djungelns gröna mark
      for (s = -1; s <= 1; s += 2) {
        var hx = s * R * (up ? 0.7 : 1.0), hy = up ? -R * 1.05 : R * 0.75 + Math.sin(t * 6 + s) * 2;
        g.strokeStyle = fur; g.lineWidth = R * 0.32; g.lineCap = 'round';
        g.beginPath(); g.moveTo(s * R * 0.55, -R * 0.35); g.quadraticCurveTo(s * R * 1.05, -R * 0.1, hx, hy); g.stroke();
        g.fillStyle = furD; g.beginPath(); g.arc(hx, hy, R * 0.2, 0, 7); g.fill();
      }
      g.fillStyle = fur; g.beginPath(); g.ellipse(0, R * 0.05, R * 0.78, R * 0.72, 0, 0, 7); g.fill();
      g.fillStyle = skin; g.beginPath(); g.ellipse(0, R * 0.15, R * 0.42, R * 0.38, 0, 0, 7); g.fill();
      for (i = 0; i < 9; i++) {                                 // man av löv
        var la = Math.PI * (1.05 + i * 0.1);
        g.fillStyle = W_(i % 2 ? '#2f7a2a' : '#4f9a3c'); g.beginPath(); g.ellipse(Math.cos(la) * R * 0.78, -R * 0.2 + Math.sin(la) * R * 0.62, R * 0.2, R * 0.09, la, 0, 7); g.fill();
      }
      g.fillStyle = fur; g.beginPath(); g.arc(0, -R * 0.62, R * 0.36, 0, 7); g.fill();
      g.fillStyle = skin; g.beginPath(); g.ellipse(lx * 2, -R * 0.55 + ly, R * 0.24, R * 0.2, 0, 0, 7); g.fill();
      bossEyes(lx * 2, -R * 0.66 + ly, R * 0.11, R * 0.06, rage ? '255,70,50' : '150,255,110');
      g.fillStyle = W_('#1a1a12'); g.fillRect(lx * 2 - R * 0.1, -R * 0.48 + ly, R * 0.2, 2);
    } else if (k === 'scorpion') {
      var sh = W_('#c98a3a'), shD = W_('#7a4f1c');
      g.rotate(look);
      g.strokeStyle = shD; g.lineWidth = 2.4; g.lineCap = 'round';
      for (i = 0; i < 3; i++) for (s = -1; s <= 1; s += 2) {
        var bx = -R * 0.25 + i * R * 0.25, wg = Math.sin(t * 12 + i * 2 + s) * 3;
        g.beginPath(); g.moveTo(bx, s * R * 0.3); g.lineTo(bx - 4 + wg, s * R * 0.75); g.lineTo(bx - 8 + wg, s * R * 0.95); g.stroke();
      }
      for (s = -1; s <= 1; s += 2) {
        var opn = (up || lean) ? 0.55 : 0.2 + 0.1 * Math.sin(t * 4);
        g.strokeStyle = sh; g.lineWidth = 4; g.beginPath(); g.moveTo(R * 0.4, s * R * 0.25); g.lineTo(R * 0.85, s * R * 0.45); g.stroke();
        g.fillStyle = sh; g.beginPath(); g.ellipse(R * 1.0, s * R * 0.45, R * 0.24, R * 0.14, s * opn, 0, 7); g.fill(); g.strokeStyle = shD; g.lineWidth = 1.2; g.stroke();
      }
      for (i = 0; i < 3; i++) { g.fillStyle = i % 2 ? shD : sh; g.beginPath(); g.ellipse(R * 0.25 - i * R * 0.33, 0, R * 0.3, R * (0.36 - i * 0.04), 0, 0, 7); g.fill(); }
      for (i = 0; i < 6; i++) {                                 // svansen böjer sig över ryggen
        var th = Math.PI * (1 + i * 0.17) + Math.sin(t * 3) * 0.05 * (lean ? 0 : 1);
        var tx = -R * 0.45 + Math.cos(th) * R * 0.55, ty = Math.sin(th) * R * 0.38 - i * R * 0.03;
        g.fillStyle = i % 2 ? shD : sh; g.beginPath(); g.arc(tx, ty, R * (0.2 - i * 0.02), 0, 7); g.fill();
        if (i === 5) { g.fillStyle = W_('#3a2a1a'); g.beginPath(); g.moveTo(tx + R * 0.08, ty); g.lineTo(tx + R * 0.36, ty + R * 0.12); g.lineTo(tx + R * 0.06, ty + R * 0.16); g.closePath(); g.fill(); }
      }
      if (rage) bossEyes(R * 0.52, 0, R * 0.1, R * 0.05, '255,70,50');
      else { g.fillStyle = '#1a0f08'; g.beginPath(); g.arc(R * 0.52, -R * 0.1, R * 0.05, 0, 7); g.arc(R * 0.52, R * 0.1, R * 0.05, 0, 7); g.fill(); }
    } else if (k === 'yeti') {
      var fW = W_('#f2f6fb'), fS = W_('#c8d6e6');
      for (s = -1; s <= 1; s += 2) furBlob(s * R * 0.95, up ? -R * 0.95 : R * 0.35 + Math.sin(t * 4 + s) * 2, R * 0.3, fW, fS);
      furBlob(0, R * 0.05, R * 0.82, fW, fS);
      furBlob(0, -R * 0.55, R * 0.42, fW, fS);
      g.fillStyle = W_('#6f9bd1'); g.beginPath(); g.ellipse(lx * 2, -R * 0.5 + ly, R * 0.26, R * 0.22, 0, 0, 7); g.fill();
      g.fillStyle = W_('#bfe6ff');
      for (s = -1; s <= 1; s += 2) { g.beginPath(); g.moveTo(s * R * 0.2, -R * 0.85); g.lineTo(s * R * 0.48, -R * 1.25); g.lineTo(s * R * 0.36, -R * 0.82); g.closePath(); g.fill(); }
      bossEyes(lx * 2, -R * 0.56 + ly, R * 0.1, R * 0.05, rage ? '255,70,50' : '210,245,255');
      g.fillStyle = W_('#2a3a5a'); g.beginPath(); g.arc(lx * 2, -R * 0.42 + ly, R * 0.08, 0, Math.PI); g.fill();
    } else {
      var bas = W_('#2a1f22'), basL = W_('#4d3c3c');
      for (s = -1; s <= 1; s += 2) rockShape(s * R * 0.95, up ? -R * 0.95 : R * 0.25 + Math.sin(t * 5 + s) * 2, R * 0.3, R * 0.28, basL, bas, 20 + s);
      rockShape(0, R * 0.05, R * 0.8, R * 0.75, basL, bas, 21);
      rockShape(0, -R * 0.6, R * 0.4, R * 0.36, basL, bas, 22);
      g.save(); g.globalCompositeOperation = 'lighter';
      g.strokeStyle = 'rgba(255,120,30,' + (0.75 + 0.2 * Math.sin(t * 6)) + ')'; g.lineWidth = rage ? 3 : 2;
      g.beginPath(); g.moveTo(-R * 0.4, -R * 0.2); g.lineTo(-R * 0.1, R * 0.1); g.lineTo(-R * 0.25, R * 0.5); g.moveTo(-R * 0.1, R * 0.1); g.lineTo(R * 0.3, 0); g.lineTo(R * 0.45, R * 0.4); g.stroke();
      for (i = 0; i < 5; i++) {                                 // flammande krona
        var fx2 = (i - 2) * R * 0.16, fh = R * (0.35 + 0.15 * Math.sin(t * 10 + i * 1.7)) * (rage ? 1.3 : 1);
        g.fillStyle = i % 2 ? 'rgba(255,200,60,0.9)' : 'rgba(255,110,30,0.9)';
        g.beginPath(); g.moveTo(fx2 - R * 0.1, -R * 0.85); g.quadraticCurveTo(fx2, -R * 0.85 - fh * 1.2, fx2 + R * 0.1, -R * 0.85); g.closePath(); g.fill();
      }
      g.restore();
      bossEyes(lx * 2, -R * 0.62 + ly, R * 0.11, R * 0.06, '255,230,120');
    }
    g.restore();
  }
  function drawGroundFx() {                                     // is, eld och stenregnets skuggor ligger under figurerna
    fx.forEach(function (f) {
      if (f.k === 'ice') {
        var ia = Math.min(1, f.t);
        g.fillStyle = 'rgba(190,230,255,' + 0.45 * ia + ')'; g.beginPath(); g.arc(f.x, f.y, f.R, 0, 7); g.fill();
        g.strokeStyle = 'rgba(255,255,255,' + 0.7 * ia + ')'; g.lineWidth = 1.2; g.beginPath();
        for (var i = 0; i < 6; i++) { var an = i * 1.05; g.moveTo(f.x, f.y); g.lineTo(f.x + Math.cos(an) * f.R * 0.8, f.y + Math.sin(an) * f.R * 0.8); }
        g.stroke();
      } else if (f.k === 'fire') {
        var fa = Math.min(1, f.t / 0.6), fl = 6 + Math.sin(time * 15 + f.x) * 2;
        g.save(); g.globalCompositeOperation = 'lighter'; glow(f.x, f.y, 16, '255,120,30', 0.4 * fa);
        g.fillStyle = 'rgba(255,170,50,' + 0.9 * fa + ')'; g.beginPath(); g.moveTo(f.x - 5, f.y); g.quadraticCurveTo(f.x, f.y - fl * 2, f.x + 5, f.y); g.closePath(); g.fill(); g.restore();
      } else if (f.k === 'rock') {
        var rk = 1 - f.t / f.life;
        g.fillStyle = 'rgba(0,0,0,' + (0.15 + 0.35 * rk) + ')'; g.beginPath(); g.ellipse(f.x, f.y, 6 + 14 * rk, (6 + 14 * rk) * 0.5, 0, 0, 7); g.fill();
        g.strokeStyle = 'rgba(255,60,60,0.55)'; g.lineWidth = 1.5; g.beginPath(); g.arc(f.x, f.y, 22, 0, 7); g.stroke();
      }
    });
  }
  function drawRock(f) { var k = f.t / f.life; rockShape(f.x, f.y - k * k * 240 - 6, 9, 8, biome.stone[0], biome.stone[1], 50); }
  function drawBossIntro() {                                    // bossens namn glider in
    var k = bossIntro / 2.4, slide = k > 0.83 ? (1 - k) / 0.17 : 1, a = k < 0.17 ? k / 0.17 : 1;
    g.save(); g.globalAlpha = a;
    g.fillStyle = 'rgba(10,6,6,0.7)'; g.fillRect(0, LH / 2 - 62, LW, 124);
    var x = LW / 2 - (1 - easeOutCubic(slide)) * LW * 0.6;
    chalkTitle(biome.boss, x, LH / 2 - 8, 58);
    g.font = 'bold 17px ' + TXT; g.fillStyle = '#ff8a7a'; g.textAlign = 'center'; g.fillText('Boss i ' + biome.name, x, LH / 2 + 38);
    g.restore(); g.textAlign = 'left';
  }

  function moonShape(x, y, sc) {                                // månsten
    g.save(); g.globalCompositeOperation = 'lighter'; glow(x, y, 16 * sc, '170,210,255', 0.35); g.restore();
    g.beginPath(); g.moveTo(x, y - 8 * sc); g.lineTo(x + 6 * sc, y - 2 * sc); g.lineTo(x + 4 * sc, y + 7 * sc); g.lineTo(x - 4 * sc, y + 7 * sc); g.lineTo(x - 6 * sc, y - 2 * sc); g.closePath();
    g.fillStyle = '#dcecff'; g.fill(); g.strokeStyle = '#6a8fc0'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = '#9fc2ee'; g.beginPath(); g.arc(x + sc, y + sc, 2.8 * sc, 0, 7); g.fill();
    g.fillStyle = '#dcecff'; g.beginPath(); g.arc(x + 2.3 * sc, y + 0.2 * sc, 2.3 * sc, 0, 7); g.fill();
  }

  function drawFx() {
    fx.forEach(function (f) {
      if (f.k === 'ice' || f.k === 'fire') return;                // ritas i drawGroundFx
      if (f.k === 'rock') { drawRock(f); return; }
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
      } else if (f.k === 'a') {                              // luftpartiklar
        var ak = Math.min(1, f.t / 1.5, (f.life - f.t) / 1);
        if (f.blink) ak *= 0.5 + 0.5 * Math.sin(time * 4 + f.s * 9 + f.life);
        g.save(); if (f.glow) g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.max(0, ak); g.fillStyle = f.col;
        g.beginPath(); g.arc(f.x, f.y, f.s, 0, 7); g.fill(); g.restore();
      } else if (f.k === 'w') {                              // chockvåg
        var wk = 1 - f.t / f.life;
        g.strokeStyle = 'rgba(255,170,80,' + (1 - wk) * 0.9 + ')'; g.lineWidth = 8 * (1 - wk) + 2;
        g.beginPath(); g.arc(f.x, f.y, f.R * wk, 0, 7); g.stroke();
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
      g.globalAlpha = 1 - k * k; g.font = 'bold 15px ' + TXT;
      g.strokeStyle = 'rgba(10,15,10,0.85)'; g.lineWidth = 4; g.strokeText(t.txt, 0, 0);
      g.fillStyle = t.col; g.fillText(t.txt, 0, 0);
      g.restore();
    });
    g.textAlign = 'left';
  }

