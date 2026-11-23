  // ---------- skala till fönstret (skarp grafik på alla skärmar) ----------
  var RS = 1, RSW = 1, mapDirty = true, vignette = null;   // RS = vyns upplösning, RSW = världens
  var miniCv = document.createElement('canvas'), mn = miniCv.getContext('2d');   // liten karta i hörnet (mobil)
  var mapCv = document.createElement('canvas'), mg = mapCv.getContext('2d');
  var caveCv = document.createElement('canvas'), cg = caveCv.getContext('2d');
  var lightCv = document.createElement('canvas'), lg = lightCv.getContext('2d');
  var canCv = document.createElement('canvas'), ng = canCv.getContext('2d');   // djungelns lövtak
  var oreTiles = [], smeltPos = null, exitPos = null, backPos = null;

  function resize() {
    var dpr = window.devicePixelRatio || 1, cw = window.innerWidth, ch = window.innerHeight, unit;
    PHONE = Math.min(cw, ch) < 520;                              // mobil: liten skärm
    if (PHONE) {                                                 // vyn fyller skärmen, kameran zoomar in och följer gubben
      LH = 430; LW = Math.max(200, Math.round(LH * cw / ch)); unit = ch / LH;
      ZW = clamp(42 / (TS * unit), 1, 2.2);                      // en ruta blir ungefär 42 skärmpixlar
      cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    } else {                                                     // dator och platta: hela kartan som förut
      LW = WW; LH = WH; unit = Math.min(cw / LW, ch / LH); if (!(unit > 0)) unit = 1; ZW = 1;
      cv.style.width = Math.floor(LW * unit) + 'px'; cv.style.height = Math.floor(LH * unit) + 'px';
    }
    BOX.s = Math.min(LW / 960, LH / 576); BOX.ox = (LW - 960 * BOX.s) / 2; BOX.oy = (LH - 576 * BOX.s) / 2;
    layoutButtons();
    var rs = clamp(unit * dpr, 1, 3), rsw = clamp(rs * ZW, 1, PHONE ? 2.2 : 3);
    if (Math.abs(rs - RS) > 0.01 || Math.abs(rsw - RSW) > 0.01 || cv.width !== Math.round(LW * rs) || cv.height !== Math.round(LH * rs)) {
      RS = rs; RSW = rsw; cv.width = Math.round(LW * RS); cv.height = Math.round(LH * RS); mapDirty = true; vignette = null;
    }
    camSnap = true;
  }
  function layoutButtons() {                                     // pekknappar sitter i vyns hörn
    BTN_ATK.x = LW - 96; BTN_ATK.y = LH - 96; BTN_E.x = LW - 214; BTN_E.y = LH - 66;
    BTN_PAUSE.x = LW - 30; BTN_BOLT.x = LW - 96; BTN_BOLT.y = LH - 202;
    BTN_SHIELD.x = LW - 214; BTN_SHIELD.y = LH - 168; BTN_BOW.x = LW - 214; BTN_BOW.y = LH - 262;
  }
  // kamera, skärm och värld
  function camTarget() {
    var vw = LW / ZW, vh = LH / ZW;
    var mg2 = PHONE ? 4 * TS : 0;                               // på mobil får kameran gå lite utanför kanten, så att gubben inte hamnar under knapparna
    return { x: vw >= WW ? (WW - vw) / 2 : clamp(P.x - vw / 2, -mg2, WW - vw + mg2), y: vh >= WH ? (WH - vh) / 2 : clamp(P.y - vh / 2, -mg2, WH - vh + mg2) };
  }
  function updateCamera(dt) {
    var t = camTarget();
    if (camSnap) { camX = t.x; camY = t.y; camSnap = false; }
    else { var k = Math.min(1, dt * 7); camX += (t.x - camX) * k; camY += (t.y - camY) * k; }
  }
  function toScreen(x, y) { return { x: (x - camX) * ZW, y: (y - camY) * ZW }; }
  function toWorld(x, y) { return { x: x / ZW + camX, y: y / ZW + camY }; }
  function toBox(q) { return { x: (q.x - BOX.ox) / BOX.s, y: (q.y - BOX.oy) / BOX.s }; }
  function inBox960(fn) {                                        // menyer ritas i sin 960 x 576-ruta, skalad till skärmen
    var lw = LW, lh = LH;
    if (BOX.ox > 0.5 || BOX.oy > 0.5) { g.fillStyle = 'rgba(8,16,10,0.55)'; g.fillRect(0, 0, LW, LH); }
    LW = 960; LH = 576;
    g.save(); g.translate(BOX.ox, BOX.oy); g.scale(BOX.s, BOX.s);
    try { fn(); } finally { g.restore(); LW = lw; LH = lh; }
  }
  function drawMinimap() {                                       // liten karta: portal, monster, föremål, vad kameran ser
    var mw = 150, mh = mw * WH / WW, x = LW - mw - 12, y = 46, k = mw / WW;
    g.save(); g.globalAlpha = 0.92;
    tag(x - 5, y - 5, mw + 10, mh + 10);
    g.drawImage(miniCv, x, y, mw, mh); g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(x, y, mw, mh);
    if (exitPos) { g.fillStyle = exitOpen() ? '#c9bfff' : '#8a8a8a'; g.beginPath(); g.arc(x + exitPos.x * k, y + exitPos.y * k, 3.5, 0, 7); g.fill(); }
    items.forEach(function (it) {
      if (it.t !== 'moon' && it.t !== 'crystal' && it.t !== 'heart') return;
      g.fillStyle = it.t === 'moon' ? '#dcecff' : it.t === 'heart' ? PAL.heart : '#8ff0ff'; g.fillRect(x + it.x * k - 1.6, y + it.y * k - 1.6, 3.2, 3.2);
    });
    mons.forEach(function (m) {
      if (m.hidden) return; var b = m.type === 'boss';
      g.fillStyle = b ? '#ff3b3b' : '#ff8a7a'; g.beginPath(); g.arc(x + m.x * k, y + m.y * k, b ? 3.6 : 1.6, 0, 7); g.fill();
    });
    if (backPos) { g.fillStyle = '#5fe0f0'; g.beginPath(); g.arc(x + backPos.x * k, y + backPos.y * k, 3, 0, 7); g.fill(); }
    if (puzzle && puzzle.found && !puzzle.chest.taken) { g.fillStyle = '#ffd23f'; g.fillRect(x + puzzle.chest.x * k - 3, y + puzzle.chest.y * k - 3, 6, 6); }
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x + P.x * k, y + P.y * k, 2.8, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,225,77,0.85)'; g.lineWidth = 1; g.strokeRect(x + Math.max(0, camX) * k, y + Math.max(0, camY) * k, Math.min(WW, LW / ZW) * k, Math.min(WH, LH / ZW) * k);
    g.restore();
  }
  window.addEventListener('resize', resize);

  // ---------- kartan ritas en gång per nivå ----------
  function renderMapCache() {
    var pw = Math.round(WW * RSW), ph = Math.round(WH * RSW), x, y;
    [mapCv, caveCv, lightCv, canCv].forEach(function (c) { if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; } });
    mg.setTransform(RSW, 0, 0, RSW, 0, 0); mg.clearRect(0, 0, WW, WH);
    oreTiles = []; smeltPos = null; exitPos = null; backPos = null;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) drawGround(mg, x, y);
    drawCaveRims(mg);
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var t = map[y][x];
      if (t === ORE) oreTiles.push({ x: x, y: y });
      else if (t === SMELT) smeltPos = { x: (x + 0.5) * TS, y: (y + 0.5) * TS };
      else if (t === EXIT) exitPos = { x: (x + 0.5) * TS, y: (y + 0.5) * TS };
      else if (t === BACK) backPos = { x: (x + 0.5) * TS, y: (y + 0.5) * TS };
      drawObject(mg, t, x, y);
    }
    // mörker över grottorna, mjuka kanter
    cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, pw, ph);
    cg.setTransform(RSW, 0, 0, RSW, 0, 0);
    cg.filter = 'blur(' + Math.round(9 * RSW) + 'px)';
    cg.fillStyle = 'rgba(6,7,18,' + CAVE_DARK[biome.i] + ')';
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (isCave[y][x]) cg.fillRect(x * TS - 3, y * TS - 3, TS + 6, TS + 6);
    cg.filter = 'none';
    ng.setTransform(1, 0, 0, 1, 0, 0); ng.clearRect(0, 0, pw, ph);
    if (biome.canopy) {                                          // skugga från trädkronor med ljusfläckar och lianer
      ng.setTransform(RSW, 0, 0, RSW, 0, 0);
      ng.fillStyle = 'rgba(6,34,10,0.34)'; ng.fillRect(0, 0, WW, WH);
      ng.globalCompositeOperation = 'destination-out';
      for (var ci = 0; ci < 28; ci++) {
        var lx = hash(ci, 3, 300) * WW, ly = hash(ci, 5, 301) * WH, lr = 30 + hash(ci, 7, 302) * 55;
        var lgr = ng.createRadialGradient(lx, ly, lr * 0.2, lx, ly, lr); lgr.addColorStop(0, 'rgba(0,0,0,0.9)'); lgr.addColorStop(1, 'rgba(0,0,0,0)');
        ng.fillStyle = lgr; ng.beginPath(); ng.arc(lx, ly, lr, 0, 7); ng.fill();
      }
      ng.globalCompositeOperation = 'source-over';
      for (ci = 0; ci < 20; ci++) {
        var vx = hash(ci, 9, 303) * WW, vl = 24 + hash(ci, 11, 304) * 70;
        ng.strokeStyle = '#1f5a22'; ng.lineWidth = 2; ng.beginPath(); ng.moveTo(vx, 0); ng.quadraticCurveTo(vx + 8, vl * 0.5, vx, vl); ng.stroke();
        ng.fillStyle = '#2f7a2a'; for (var lf = 8; lf < vl; lf += 10) { ng.beginPath(); ng.ellipse(vx + (lf % 20 ? 4 : -4), lf, 4.5, 2, lf % 20 ? 0.6 : -0.6, 0, 7); ng.fill(); }
      }
      for (ci = 0; ci < 14; ci++) {                              // stora blad längs kanterna
        var side = ci % 4, bx2 = side === 0 ? hash(ci, 1, 305) * WW : side === 1 ? hash(ci, 1, 305) * WW : side === 2 ? 0 : WW;
        var by2 = side === 0 ? 0 : side === 1 ? WH : hash(ci, 2, 306) * WH, ba = Math.atan2(WH / 2 - by2, WW / 2 - bx2);
        ng.save(); ng.translate(bx2, by2); ng.rotate(ba);
        ng.fillStyle = ci % 2 ? '#1c4f1f' : '#2a6a28'; ng.beginPath(); ng.ellipse(22, 0, 26, 9, 0, 0, 7); ng.fill();
        ng.strokeStyle = 'rgba(120,200,100,0.35)'; ng.lineWidth = 1; ng.beginPath(); ng.moveTo(0, 0); ng.lineTo(46, 0); ng.stroke(); ng.restore();
      }
    }
    miniCv.width = 300; miniCv.height = 180; mn.clearRect(0, 0, 300, 180); mn.drawImage(mapCv, 0, 0, 300, 180);
    mapDirty = false;
  }

  function drawGround(c, x, y) {
    var px = x * TS, py = y * TS, r = hash(x, y, 1), i, a, b;
    if (puzzle && x > puzzle.x0 && x < puzzle.x0 + 6 && y > puzzle.ry && y < puzzle.ry + 3) {   // skattkammarens stengolv
      c.fillStyle = r < 0.5 ? '#8a8578' : '#938e80'; c.fillRect(px, py, TS, TS); c.strokeStyle = 'rgba(40,35,30,0.45)'; c.lineWidth = 1;
      c.strokeRect(px + 0.5, py + 0.5, TS / 2, TS / 2); c.strokeRect(px + TS / 2 + 0.5, py + TS / 2 + 0.5, TS / 2 - 1, TS / 2 - 1); return;
    }
    if (isCave[y][x]) {
      c.fillStyle = biome.cave[r < 0.5 ? 0 : 1]; c.fillRect(px, py, TS, TS);
      for (i = 0; i < 4; i++) {
        a = hash(x, y, 10 + i); b = hash(x, y, 20 + i);
        c.fillStyle = i === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(170,180,255,0.06)';
        c.beginPath(); c.ellipse(px + 4 + a * 24, py + 4 + b * 24, 1.5 + a * 2.5, 1 + b * 1.5, 0, 0, 7); c.fill();
      }
      return;
    }
    c.fillStyle = biome.ground[Math.floor(r * 4)]; c.fillRect(px, py, TS, TS);
    a = hash(x, y, 2);
    c.fillStyle = a < 0.5 ? 'rgba(255,255,170,0.045)' : 'rgba(0,40,0,0.06)';
    c.beginPath(); c.ellipse(px + 16, py + 16, 14 + a * 6, 10 + a * 4, a * 3, 0, 7); c.fill();
    c.lineWidth = 1.2; c.lineCap = 'round';
    for (i = 0; i < 5; i++) {
      var bx = px + 3 + hash(x, y, 30 + i) * 26, by = py + 7 + hash(x, y, 40 + i) * 23, lean = (hash(x, y, 50 + i) - 0.5) * 5;
      c.strokeStyle = biome.blade[i % 2];
      c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + lean, by - 3.5 - hash(x, y, 60 + i) * 3.5); c.stroke();
    }
    if (biome.flowers && hash(x, y, 70) < 0.07) {        // små blommor
      var fx_ = px + 6 + hash(x, y, 71) * 20, fy_ = py + 6 + hash(x, y, 72) * 20;
      c.fillStyle = biome.flowers[Math.floor(hash(x, y, 73) * biome.flowers.length)];
      for (i = 0; i < 5; i++) { c.beginPath(); c.arc(fx_ + Math.cos(i * 1.257) * 2, fy_ + Math.sin(i * 1.257) * 2, 1.4, 0, 7); c.fill(); }
      c.fillStyle = '#e0a020'; c.beginPath(); c.arc(fx_, fy_, 1.1, 0, 7); c.fill();
    }
    if (biome.canopy && hash(x, y, 77) < 0.16) {               // ormbunkar i djungeln
      var fxb = px + 6 + hash(x, y, 78) * 20, fyb = py + 20 + hash(x, y, 79) * 8;
      c.strokeStyle = '#1d5a1f'; c.lineWidth = 1.6; c.lineCap = 'round';
      for (i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(fxb, fyb); c.quadraticCurveTo(fxb + i * 4, fyb - 10, fxb + i * 7, fyb - 12 + Math.abs(i) * 3); c.stroke(); }
    }
    if (biome.cracks && hash(x, y, 74) < 0.16) {           // glödande sprickor i lavalandet
      var kx = px + 4 + hash(x, y, 75) * 22, ky = py + 4 + hash(x, y, 76) * 20;
      c.lineCap = 'round'; c.beginPath(); c.moveTo(kx, ky); c.lineTo(kx + 6, ky + 3); c.lineTo(kx + 9, ky + 9); c.moveTo(kx + 6, ky + 3); c.lineTo(kx + 12, ky + 1);
      c.strokeStyle = 'rgba(255,200,80,0.3)'; c.lineWidth = 4; c.stroke(); c.strokeStyle = 'rgba(255,110,30,0.9)'; c.lineWidth = 1.6; c.stroke();
    }
  }

  function drawCaveRims(c) {
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      if (!isCave[y][x]) continue;
      var px = x * TS, py = y * TS;
      [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(function (d) {
        var nx = x + d[0], ny = y + d[1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || isCave[ny][nx]) return;
        c.fillStyle = 'rgba(0,0,0,0.35)';                 // inre skugga
        if (d[1] === -1) c.fillRect(px, py, TS, 6); else if (d[1] === 1) c.fillRect(px, py + TS - 3, TS, 3);
        else if (d[0] === -1) c.fillRect(px, py, 5, TS); else c.fillRect(px + TS - 5, py, 5, TS);
        c.fillStyle = biome.rim;                          // stenkant ut mot marken
        for (var i = 0; i < 4; i++) {
          var k = (i + 0.5) / 4 * TS, rr_ = 3 + hash(x * 4 + i, y, 77 + d[0] * 3 + d[1]) * 2.5;
          var ex = d[0] === 0 ? px + k : (d[0] === -1 ? px : px + TS), ey = d[1] === 0 ? py + k : (d[1] === -1 ? py : py + TS);
          c.beginPath(); c.arc(ex, ey, rr_, 0, 7); c.fill();
        }
      });
    }
  }

  function boulder(c, cx, cy, rw, rh, light, dark, seed) {
    c.fillStyle = 'rgba(0,0,0,0.28)'; c.beginPath(); c.ellipse(cx + 3, cy + rh * 0.8, rw * 1.02, rh * 0.42, 0, 0, 7); c.fill();
    c.beginPath();
    for (var i = 0; i < 9; i++) {
      var a = i / 9 * Math.PI * 2, k = 0.84 + hash(seed, i, 80) * 0.24;
      var px = cx + Math.cos(a) * rw * k, py = cy + Math.sin(a) * rh * k;
      if (i) c.lineTo(px, py); else c.moveTo(px, py);
    }
    c.closePath();
    var gr = c.createLinearGradient(cx, cy - rh, cx, cy + rh); gr.addColorStop(0, light); gr.addColorStop(1, dark);
    c.fillStyle = gr; c.fill(); c.strokeStyle = 'rgba(10,12,20,0.55)'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.2)'; c.beginPath(); c.ellipse(cx - rw * 0.3, cy - rh * 0.4, rw * 0.32, rh * 0.18, -0.3, 0, 7); c.fill();
  }

  function drawTree(c, x, y, px, py) {                        // träd ser olika ut i varje värld
    var s = 0.85 + hash(x, y, 90) * 0.3, cx = px + 16 + (hash(x, y, 91) - 0.5) * 4, cy = py + 13, i;
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(cx + 4, py + 28, 13 * s, 5, 0, 0, 7); c.fill();
    if (biome.tree === 'cactus') {
      c.fillStyle = '#3f8f4a';
      rr(c, cx - 4, py + 6, 8, 22, 4); c.fill(); rr(c, cx - 12, py + 11, 5, 10, 2.5); c.fill(); rr(c, cx - 12, py + 18, 10, 4, 2); c.fill();
      rr(c, cx + 7, py + 8, 5, 10, 2.5); c.fill(); rr(c, cx + 2, py + 15, 10, 4, 2); c.fill();
      c.strokeStyle = '#2a6a34'; c.lineWidth = 1;
      for (i = -2; i <= 2; i += 2) { c.beginPath(); c.moveTo(cx + i, py + 8); c.lineTo(cx + i, py + 27); c.stroke(); }
      if (hash(x, y, 92) < 0.3) { c.fillStyle = '#ff7ab0'; c.beginPath(); c.arc(cx, py + 6, 2.5, 0, 7); c.fill(); }
      return;
    }
    if (biome.tree === 'dead') {
      c.strokeStyle = '#1e1513'; c.lineCap = 'round'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(cx, py + 28); c.lineTo(cx, py + 10); c.stroke();
      c.lineWidth = 2; c.beginPath(); c.moveTo(cx, py + 16); c.lineTo(cx - 9, py + 8); c.moveTo(cx, py + 13); c.lineTo(cx + 8, py + 5); c.moveTo(cx - 5, py + 12); c.lineTo(cx - 7, py + 4); c.stroke();
      c.fillStyle = 'rgba(255,120,40,0.7)'; c.beginPath(); c.arc(cx + 8, py + 5, 1.4, 0, 7); c.fill();
      return;
    }
    c.fillStyle = '#5b3a1e'; c.fillRect(cx - 3, py + 15, 6, 13); c.fillStyle = '#43290f'; c.fillRect(cx + 1, py + 15, 2, 13);
    if (biome.tree === 'pine') {
      for (i = 0; i < 3; i++) {
        var w = (13 - i * 3.5) * s, ty = py + 20 - i * 6;
        c.fillStyle = '#1f4f35'; c.beginPath(); c.moveTo(cx - w, ty); c.lineTo(cx, ty - 10 * s); c.lineTo(cx + w, ty); c.closePath(); c.fill();
        c.fillStyle = '#f4f8fc'; c.beginPath(); c.moveTo(cx - w * 0.55, ty - 4 * s); c.lineTo(cx, ty - 10 * s); c.lineTo(cx + w * 0.55, ty - 4 * s); c.closePath(); c.fill();
      }
      return;
    }
    var leaf = biome.tree === 'jungle' ? ['#14401a', '#1f5a22', '#2f7a2a', '#4f9a3c'] : ['#1d4a1b', '#2e6b2a', '#3f8a38', '#5aa64e'];
    c.fillStyle = leaf[0]; c.beginPath(); c.arc(cx + 1, cy + 2, 13.5 * s, 0, 7); c.fill();
    c.fillStyle = leaf[1]; c.beginPath(); c.arc(cx, cy, 12 * s, 0, 7); c.fill();
    c.fillStyle = leaf[2]; c.beginPath(); c.arc(cx - 3 * s, cy - 3 * s, 8 * s, 0, 7); c.fill();
    c.fillStyle = leaf[3]; c.beginPath(); c.arc(cx - 5 * s, cy - 6 * s, 3.5 * s, 0, 7); c.fill();
    if (biome.tree === 'jungle') {                              // lianer
      c.strokeStyle = '#2f6a22'; c.lineWidth = 1.4;
      for (i = 0; i < 2; i++) { var lx = cx - 7 + i * 12; c.beginPath(); c.moveTo(lx, cy + 4); c.quadraticCurveTo(lx + 3, cy + 12, lx, cy + 17); c.stroke(); }
    } else if (hash(x, y, 92) < 0.25) {                         // äpplen
      c.fillStyle = '#e0413a';
      for (i = 0; i < 3; i++) { c.beginPath(); c.arc(cx - 6 + hash(x, y, 93 + i) * 12, cy - 4 + hash(x, y, 96 + i) * 10, 1.8, 0, 7); c.fill(); }
    }
  }

  function drawObject(c, t, x, y) {
    var px = x * TS, py = y * TS, i;
    if (t === STONE) {
      var big = 11 + hash(x, y, 81) * 3;
      boulder(c, px + 16, py + 17, big, big * 0.82, biome.stone[0], biome.stone[1], x * 31 + y);
    } else if (t === TREE) {
      drawTree(c, x, y, px, py);
    } else if (t === ORE) {
      var MM = MET[oreT[x + ',' + y] || 0];
      boulder(c, px + 16, py + 17, 14, 12, '#6b6f7a', '#3a3d47', x * 17 + y * 5);
      for (i = 0; i < 3; i++) {
        var ox = px + 8 + hash(x, y, 100 + i) * 15, oy = py + 9 + hash(x, y, 110 + i) * 13, r = 2.6 + hash(x, y, 120 + i) * 1.8;
        c.fillStyle = MM.c3; c.beginPath(); c.moveTo(ox, oy - r); c.lineTo(ox + r, oy); c.lineTo(ox, oy + r); c.lineTo(ox - r, oy); c.closePath(); c.fill();
        c.fillStyle = MM.c2; c.beginPath(); c.moveTo(ox, oy - r * 0.8); c.lineTo(ox + r * 0.7, oy - 0.2); c.lineTo(ox, oy + r * 0.5); c.lineTo(ox - r * 0.7, oy - 0.2); c.closePath(); c.fill();
        c.fillStyle = MM.c1; c.fillRect(ox - 1, oy - r * 0.6, 1.5, 1.5);
      }
    } else if (t === WATER) {                                    // damm med strandkant och näckrosblad
      var wg = c.createLinearGradient(0, py, 0, py + TS); wg.addColorStop(0, '#3f8fc4'); wg.addColorStop(1, '#2a6a9e');
      c.fillStyle = wg; c.fillRect(px, py, TS, TS);
      c.strokeStyle = 'rgba(255,255,255,0.28)'; c.lineWidth = 1;
      for (i = 0; i < 2; i++) { var wy = py + 9 + i * 12 + hash(x, y, 140 + i) * 4, wx = px + 5 + hash(x, y, 150 + i) * 12; c.beginPath(); c.moveTo(wx, wy); c.quadraticCurveTo(wx + 4, wy - 2, wx + 8, wy); c.stroke(); }
      if (hash(x, y, 160) < 0.35) { var lx2 = px + 8 + hash(x, y, 161) * 16, ly2 = py + 8 + hash(x, y, 162) * 16; c.fillStyle = '#4f9a3a'; c.beginPath(); c.moveTo(lx2, ly2); c.arc(lx2, ly2, 4.5, 0.4, 6.0); c.closePath(); c.fill(); }
      c.strokeStyle = '#d8c690'; c.lineWidth = 3;
      [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(function (dd) {
        var nt = map[y + dd[1]] ? map[y + dd[1]][x + dd[0]] : STONE; if (nt === WATER) return;
        c.beginPath();
        if (dd[1] === -1) { c.moveTo(px, py + 1.5); c.lineTo(px + TS, py + 1.5); } else if (dd[1] === 1) { c.moveTo(px, py + TS - 1.5); c.lineTo(px + TS, py + TS - 1.5); }
        else if (dd[0] === -1) { c.moveTo(px + 1.5, py); c.lineTo(px + 1.5, py + TS); } else { c.moveTo(px + TS - 1.5, py); c.lineTo(px + TS - 1.5, py + TS); }
        c.stroke();
      });
    } else if (t === FLAX) {                                     // lin: tuva med höga stjälkar, stora blå blommor och frökapslar
      c.fillStyle = 'rgba(0,0,0,0.22)'; c.beginPath(); c.ellipse(px + 16, py + 28, 11, 3.5, 0, 0, 7); c.fill();
      c.fillStyle = '#3f7a2c'; c.beginPath(); c.ellipse(px + 16, py + 26, 9, 4, 0, 0, 7); c.fill();
      for (i = 0; i < 5; i++) {
        var bx3 = px + 8 + i * 4, tipx = px + 4 + i * 6 + (hash(x, y, 170 + i) - 0.5) * 3, top = py + 5 + hash(x, y, 180 + i) * 7;
        c.strokeStyle = '#5a9a3a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(bx3, py + 26); c.quadraticCurveTo((bx3 + tipx) / 2, (top + py + 26) / 2 + 2, tipx, top); c.stroke();
        c.strokeStyle = '#6fb04a'; c.lineWidth = 1; c.beginPath(); var my2 = (top + py + 26) / 2; c.moveTo((bx3 + tipx) / 2, my2); c.lineTo((bx3 + tipx) / 2 + (i % 2 ? 3 : -3), my2 - 3); c.stroke();
        if (i === 1 || i === 3) { c.fillStyle = '#c9a86a'; c.beginPath(); c.arc(tipx, top, 1.8, 0, 7); c.fill(); continue; }   /* frökapsel */
        for (var pe = 0; pe < 5; pe++) { var pa = pe * 1.2566 - 1.57; c.fillStyle = pe % 2 ? '#7fa8ff' : '#5b8bff'; c.beginPath(); c.arc(tipx + Math.cos(pa) * 2.6, top + Math.sin(pa) * 2.6, 2.1, 0, 7); c.fill(); }
        c.fillStyle = '#ffe680'; c.beginPath(); c.arc(tipx, top, 1.1, 0, 7); c.fill();
      }
    } else if (t === DOOR) {                                     // skattkammarens dörr med runa
      c.fillStyle = '#5c6069'; c.fillRect(px, py, TS, TS);
      rr(c, px + 4, py + 3, TS - 8, TS - 3, 4); c.fillStyle = '#6b4220'; c.fill(); c.strokeStyle = '#2a1a0c'; c.lineWidth = 1.5; c.stroke();
      c.strokeStyle = '#8a5a2b'; c.lineWidth = 1; for (i = 0; i < 3; i++) { c.beginPath(); c.moveTo(px + 9 + i * 7, py + 5); c.lineTo(px + 9 + i * 7, py + TS - 1); c.stroke(); }
      c.strokeStyle = '#ffe14d'; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(px + 16, py + 9); c.lineTo(px + 12, py + 17); c.lineTo(px + 20, py + 17); c.lineTo(px + 16, py + 25); c.stroke();
    } else if (t === SMELT) {
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(px + 18, py + 29, 15, 4.5, 0, 0, 7); c.fill();
      rr(c, px + 2, py + 3, TS - 4, TS - 5, 5);
      var sg = c.createLinearGradient(0, py, 0, py + TS); sg.addColorStop(0, '#8a766b'); sg.addColorStop(1, '#4e403a');
      c.fillStyle = sg; c.fill(); c.strokeStyle = '#2b211d'; c.lineWidth = 1.5; c.stroke();
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1;          // tegelfogar
      for (i = 0; i < 3; i++) { c.beginPath(); c.moveTo(px + 3, py + 9 + i * 7); c.lineTo(px + TS - 3, py + 9 + i * 7); c.stroke(); }
      c.fillStyle = '#1e1310'; c.beginPath(); c.moveTo(px + 9, py + 27); c.lineTo(px + 9, py + 17); c.arc(px + 16, py + 17, 7, Math.PI, 0); c.lineTo(px + 23, py + 27); c.closePath(); c.fill();
      c.fillStyle = '#5e4c44'; c.fillRect(px + 21, py - 4, 6, 9);   // skorsten
    }
  }

  // smältugnens eld, portalen och glittrande malm ändras varje bildruta
  function drawDynamicTiles() {
    var i;
    oreTiles.forEach(function (o) {
      if (map[o.y][o.x] !== ORE) return;
      var tw = Math.sin(time * 2.3 + hash(o.x, o.y, 99) * 40);
      if (tw > 0.96) {
        var sx = o.x * TS + 8 + hash(o.x, o.y, 100) * 15, sy = o.y * TS + 9 + hash(o.x, o.y, 110) * 13, k = (tw - 0.96) * 25 * 4;
        g.strokeStyle = 'rgba(255,250,210,0.9)'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(sx - k, sy); g.lineTo(sx + k, sy); g.moveTo(sx, sy - k); g.lineTo(sx, sy + k); g.stroke();
      }
    });
    if (smeltPos) {
      var fxp = smeltPos.x, fyp = smeltPos.y + 8;
      if (state === 'play' && canBuyAny()) {                    // ugnen visar ! när du har råd med något
        var ey2 = smeltPos.y - 36 + Math.sin(time * 5) * 3;
        g.save(); g.globalCompositeOperation = 'lighter'; glow(smeltPos.x, ey2, 18, '255,225,77', 0.4); g.restore();
        g.fillStyle = PAL.bolt; g.beginPath(); g.arc(smeltPos.x, ey2, 9, 0, 7); g.fill();
        g.fillStyle = '#1a2a1a'; g.font = 'bold 14px ' + TXT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', smeltPos.x, ey2 + 1); g.textAlign = 'left';
      }
      for (i = 0; i < 4; i++) {
        var fl = Math.sin(time * 13 + i * 2.1) * 1.5, h = 7 + Math.sin(time * 9 + i) * 2;
        g.fillStyle = ['#ff6a1a', '#ff9a2a', '#ffd36a', '#fff3b0'][i];
        g.beginPath(); g.ellipse(fxp + (i - 1.5) * 1.6 + fl * 0.5, fyp - i * 0.8, 6 - i * 1.2, h - i * 1.3, 0, 0, 7); g.fill();
      }
      if (state === 'play' && hitStop <= 0 && Math.random() < 0.3) fx.push({ k: 'p', x: smeltPos.x + 8, y: smeltPos.y - 18, vx: (Math.random() - 0.5) * 10, vy: -30, t: 0.8, life: 0.8, col: 'rgba(120,110,105,0.5)', s: 2.5 + Math.random() * 2 });
    }
    if (backPos) {                                               // portalen tillbaka: liten, turkos, pil bakåt
      var bx = backPos.x, by = backPos.y;
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(bx + 2, by + 12, 10, 3.5, 0, 0, 7); g.fill();
      var bg2 = g.createRadialGradient(bx, by, 2, bx, by, 12); bg2.addColorStop(0, '#e0fbff'); bg2.addColorStop(0.5, '#3fc6d8'); bg2.addColorStop(1, '#14606e');
      g.fillStyle = bg2; g.beginPath(); g.ellipse(bx, by, 10, 12, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(220,250,255,0.8)'; g.lineWidth = 1.4;
      for (i = 0; i < 2; i++) { var b0 = -time * 2.2 + i * 3.14; g.beginPath(); g.ellipse(bx, by, 7 - i * 2, 9 - i * 2.5, 0, b0, b0 + 2.2); g.stroke(); }
      g.strokeStyle = '#0d3b44'; g.lineWidth = 2; g.beginPath(); g.ellipse(bx, by, 10, 12, 0, 0, 7); g.stroke();
      g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(bx + 3, by - 4); g.lineTo(bx - 2, by); g.lineTo(bx + 3, by + 4); g.stroke();
    }
    if (exitPos) {
      var open = exitOpen(), ex = exitPos.x, ey = exitPos.y;
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(ex + 2, ey + 14, 13, 4, 0, 0, 7); g.fill();
      var pg = g.createRadialGradient(ex, ey, 2, ex, ey, 15);
      pg.addColorStop(0, open ? '#e6e0ff' : '#8a8a8a'); pg.addColorStop(0.5, open ? '#7a6bff' : '#555'); pg.addColorStop(1, open ? '#2b1e8a' : '#2a2a2a');
      g.fillStyle = pg; g.beginPath(); g.ellipse(ex, ey, 13, 15, 0, 0, 7); g.fill();
      g.strokeStyle = open ? 'rgba(220,210,255,0.8)' : 'rgba(150,150,150,0.5)'; g.lineWidth = 1.6;
      for (i = 0; i < 3; i++) {                             // virvel
        var a0 = time * (open ? 3 : 0.6) + i * 2.094;
        g.beginPath(); g.ellipse(ex, ey, 9 - i * 2, 11 - i * 2.5, 0, a0, a0 + 2.2); g.stroke();
      }
      g.strokeStyle = '#1b1530'; g.lineWidth = 2; g.beginPath(); g.ellipse(ex, ey, 13, 15, 0, 0, 7); g.stroke();
      if (!open) {                                          // hänglås
        g.fillStyle = '#d9b24a'; rr(g, ex - 5, ey - 1, 10, 8, 2); g.fill();
        g.strokeStyle = '#d9b24a'; g.lineWidth = 2; g.beginPath(); g.arc(ex, ey - 1, 3.5, Math.PI, 0); g.stroke();
      } else if (state === 'play' && hitStop <= 0 && Math.random() < 0.25) {
        fx.push({ k: 'p', x: ex + (Math.random() - 0.5) * 20, y: ey + 10, vx: 0, vy: -60, t: 0.6, life: 0.6, col: '#c9bfff', s: 1.6 });
      }
    }
  }

  // ---------- ljus ----------
  function hole(x, y, r, a) {
    var gr = lg.createRadialGradient(x, y, r * 0.2, x, y, r);
    gr.addColorStop(0, 'rgba(0,0,0,' + a + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    lg.fillStyle = gr; lg.beginPath(); lg.arc(x, y, r, 0, 7); lg.fill();
  }
  function glow(x, y, r, col, a) {
    var gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(' + col + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  function drawLighting() {
    var pw = lightCv.width, ph = lightCv.height, pw_ = Math.min(power(), 12);
    lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, pw, ph);
    lg.drawImage(caveCv, 0, 0);
    lg.setTransform(RSW, 0, 0, RSW, 0, 0); lg.globalCompositeOperation = 'destination-out';
    hole(P.x, P.y, 100 + pw_ * 6 + P.lamp * C.upgrades.lantern.lightPerLevel, 1);   // lyktan ger mer ljus
    if (smeltPos) hole(smeltPos.x, smeltPos.y, 80, 0.9);
    if (exitPos) hole(exitPos.x, exitPos.y, 60, 0.7);
    items.forEach(function (it) { if (it.t !== 'meat') hole(it.x, it.y, 36, 0.7); });
    lg.globalCompositeOperation = 'source-over';
    g.drawImage(lightCv, 0, 0, WW, WH);
    g.save(); g.globalCompositeOperation = 'lighter';
    if (smeltPos) glow(smeltPos.x, smeltPos.y + 6, 60, '255,140,40', 0.22 + Math.sin(time * 11) * 0.04);
    if (exitPos && exitOpen()) glow(exitPos.x, exitPos.y, 46, '140,120,255', 0.3);
    items.forEach(function (it) { if (it.t === 'crystal') glow(it.x, it.y, 26, '110,230,255', 0.3); else if (it.t === 'heart') glow(it.x, it.y, 22, '255,77,106', 0.22); });
    g.restore();
  }
  function drawCaveEyes() {                               // i mörka grottor syns bara ögonen på avstånd
    g.save(); g.globalCompositeOperation = 'lighter';
    mons.forEach(function (m) {
      var cx = clamp(Math.floor(m.x / TS), 0, W - 1), cy = clamp(Math.floor(m.y / TS), 0, H - 1);
      if (!isCave[cy][cx] || dist(m, P) < 120 + P.lamp * C.upgrades.lantern.lightPerLevel) return;
      var blink = Math.sin(time * 1.3 + m.ph * 3) > 0.97 ? 0.2 : 1;
      g.fillStyle = 'rgba(255,60,60,' + 0.95 * blink + ')';
      g.beginPath(); g.ellipse(m.x - 4, m.y - 2, 2.2, 1.6 * blink + 0.2, 0, 0, 7); g.ellipse(m.x + 4, m.y - 2, 2.2, 1.6 * blink + 0.2, 0, 0, 7); g.fill();
      glow(m.x, m.y - 2, 10, '255,40,40', 0.25);
    });
    g.restore();
  }

