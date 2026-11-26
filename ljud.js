// Ljud och musik för Malm & Monster. Det mesta skapas med Web Audio direkt i webbläsaren. Från v3.8 finns några
// ljudfiler i ljud/ (Pixabay, fri licens); saknas en fil eller är den inte laddad spelas det skapade ljudet i stället.
// Bakgrundsmusiken kan vara en fil (Ny, Spelmusik) eller den skapade (Klassisk), valet ligger i pausmenyn.
// Webbläsare tillåter ljud först efter ett tryck eller en tangent, därför startar LJUD.init() vid första indata.
var LJUD = (function () {
  'use strict';
  var ac = null, sfxBus, musicBus, musicFilter, noiseBuf, timer = null, synthBus;
  // v3.8: musik från fil. a/b = slingans start och slut i sekunder (b = hela takter, efter b klingar bara sista tonen ut), gain = volym
  var SONGS = { ny: { url: 'ljud/musik.mp3', a: 0.02, b: 29.18, gain: 1.4 }, spel: { url: 'ljud/spelmusik.mp3', a: 0.025, b: 27.505, gain: 4.2 } };
  var songBufs = {}, songKind = 'klassisk', songSrc = null, songGain = null, songLoading = {};
  var vol = { music: 0.5, sfx: 0.8 }, cave = false, ducked = false, last = {}, trans = 0;
  // v3.8: ljudfiler. start = sekunder att hoppa över (tystnad i början), dur = längd, gain = volym (utjämnad)
  var FILES = { traff: { url: 'ljud/traff.mp3', start: 0.07, dur: 0.35, gain: 0.6 }, plock: { url: 'ljud/plock.mp3', start: 0.045, dur: 0.6, gain: 0.55 },
                kraft: { url: 'ljud/kraft.mp3', start: 0.045, dur: 1.1, gain: 0.35 }, laddning: { url: 'ljud/laddning.mp3', start: 0.02, dur: 5, gain: 0.25 },
                kista: { url: 'ljud/kista.mp3', start: 0.125, dur: 1.2, gain: 1.2 }, boss: { url: 'ljud/boss.mp3', start: 0.05, dur: 1.9, gain: 0.3 },
                ata: { url: 'ljud/ata.mp3', start: 0.105, dur: 1.45, gain: 0.55 },
                uppladdning: { url: 'ljud/uppladdning.mp3', start: 0.3, dur: 2.3, gain: 1.2 } }, bufs = {};   // stigande ton medan snurren/kraftpilen laddas

  function init() {
    if (ac) { if (ac.state === 'suspended' && !document.hidden) ac.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    var comp = ac.createDynamicsCompressor();             // håller ihop många ljud samtidigt
    comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = vol.sfx; sfxBus.connect(comp);
    musicFilter = ac.createBiquadFilter(); musicFilter.type = 'lowpass'; musicFilter.frequency.value = 3200;
    musicBus = ac.createGain(); musicBus.gain.value = musicGain(); musicFilter.connect(musicBus); musicBus.connect(comp);
    synthBus = ac.createGain(); synthBus.gain.value = 1; synthBus.connect(musicFilter);   // den skapade musiken, tonas bort när en låt spelar
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    loadFiles(); if (songKind !== 'klassisk') loadSong(songKind);
    makeMelody();
    nextT = ac.currentTime + 0.15;
    timer = setInterval(schedule, 90);
  }
  function musicGain() { return vol.music * (ducked ? 0.25 : 1) * 0.55; }

  // ---------- byggstenar ----------
  function env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function tone(type, f0, f1, dur, peak, t, dest, a) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, a || 0.005, peak, dur);
    o.connect(g); g.connect(dest || sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, peak, t, ftype, f0, f1, q, dest) {
    var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = ftype || 'bandpass'; f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    f.Q.value = q || 1; env(g, t, 0.004, peak, dur);
    s.connect(f); f.connect(g); g.connect(dest || sfxBus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  // ---------- ljudeffekter ----------
  var SFX = {
    swing: function (t) { noise(0.12, 0.22, t, 'bandpass', 700, 2600, 0.8); },
    hit: function (t) { tone('sine', 190, 60, 0.13, 0.55, t); noise(0.05, 0.3, t, 'highpass', 2200, null, 0.7); },
    mine: function (t) { tone('square', 1250 + Math.random() * 250, 900, 0.07, 0.1, t); tone('triangle', 2600, 2200, 0.09, 0.08, t); noise(0.04, 0.18, t, 'highpass', 3000); },
    ore: function (t) { tone('triangle', 880, 0, 0.09, 0.25, t); tone('triangle', 1320, 0, 0.18, 0.22, t + 0.07); },
    kill: function (t) { noise(0.2, 0.3, t, 'lowpass', 1800, 300); },   // v3.8: bara puffen, inget pip
    hurt: function (t) { tone('sawtooth', 170, 90, 0.2, 0.2, t); noise(0.1, 0.2, t, 'lowpass', 900); },
    powerup: function (t) {
      [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone('triangle', f, 0, 0.2, 0.2, t + i * 0.06); tone('sine', f * 2, 0, 0.12, 0.05, t + i * 0.06); });
      noise(0.5, 0.07, t + 0.1, 'highpass', 5000, 9000);
    },
    heart: function (t) { tone('sine', 660, 0, 0.16, 0.3, t); tone('sine', 990, 0, 0.32, 0.28, t + 0.12); },
    meat: function (t) { tone('triangle', 400, 620, 0.08, 0.2, t); },
    eat: function (t) { [0, 0.11, 0.22].forEach(function (d) { noise(0.06, 0.3, t + d, 'bandpass', 600, 300, 2); }); tone('sine', 500, 820, 0.2, 0.12, t + 0.32); },
    craft: function (t) { tone('square', 220, 200, 0.05, 0.18, t); [1, 2.76, 5.4].forEach(function (k) { tone('sine', 520 * k, 0, 0.6, 0.12 / k, t); }); noise(0.08, 0.3, t, 'highpass', 3000); },
    deny: function (t) { tone('square', 200, 0, 0.08, 0.1, t); tone('square', 150, 0, 0.12, 0.1, t + 0.1); },
    level: function (t) { noise(0.5, 0.14, t, 'bandpass', 300, 3000, 1.5); [392, 523, 659, 784].forEach(function (f, i) { tone('triangle', f, 0, 0.22, 0.18, t + 0.15 + i * 0.09); }); },
    death: function (t) { [392, 330, 262, 196].forEach(function (f, i) { tone('triangle', f, f * 0.97, 0.3, 0.22, t + i * 0.18); }); },
    click: function (t) { tone('triangle', 900, 1200, 0.04, 0.15, t); },
    chop: function (t) { noise(0.08, 0.35, t, 'bandpass', 900, 500, 2); tone('square', 180, 120, 0.06, 0.1, t); },
    push: function (t) { noise(0.25, 0.3, t, 'lowpass', 600, 200); tone('sine', 90, 70, 0.2, 0.15, t); },
    bow: function (t) { noise(0.12, 0.25, t, 'bandpass', 1800, 600, 2); tone('triangle', 520, 260, 0.1, 0.1, t); },
    block: function (t) { tone('square', 700, 500, 0.06, 0.15, t); noise(0.08, 0.25, t, 'highpass', 2500); },
    bite: function (t) { tone('sine', 880, 440, 0.12, 0.25, t); noise(0.08, 0.2, t, 'bandpass', 1200, 400, 2); },
    splash: function (t) { noise(0.35, 0.35, t, 'bandpass', 1500, 300, 1); tone('sine', 300, 600, 0.15, 0.15, t + 0.05); },
    storm: function (t) { noise(0.08, 0.55, t, 'highpass', 4000); noise(1.3, 0.5, t + 0.02, 'lowpass', 2500, 110); tone('sawtooth', 95, 38, 0.9, 0.28, t); },
    charge: function (t) { tone('sawtooth', 70, 160, 0.6, 0.22, t); noise(0.6, 0.15, t, 'lowpass', 300, 1200); },
    slam: function (t) { tone('sine', 120, 35, 0.5, 0.7, t); noise(0.4, 0.4, t, 'lowpass', 900, 150); },
    summon: function (t) { [0, 0.12, 0.24].forEach(function (d, i) { tone('triangle', 330 - i * 40, 220 - i * 30, 0.3, 0.15, t + d); }); },
    web: function (t) { noise(0.12, 0.2, t, 'bandpass', 2500, 900, 3); },
    webhit: function (t) { noise(0.2, 0.25, t, 'lowpass', 1500, 400); tone('sine', 300, 180, 0.2, 0.12, t); },
    bossdown: function (t) { [523, 659, 784, 1047, 784, 1047, 1319].forEach(function (f, i) { tone('triangle', f, 0, 0.25, 0.2, t + i * 0.1); }); noise(0.8, 0.08, t + 0.3, 'highpass', 5000, 9000); }
  };
  function play(name) {
    if (!ac || vol.sfx <= 0 || !SFX[name] || ac.state !== 'running') return;
    var now = ac.currentTime;
    if (last[name] && now - last[name] < 0.03) return;    // samma ljud tätt efter varandra smälter ihop
    last[name] = now;
    SFX[name](now + 0.005);
  }

  // ---------- bakgrundsmusik ----------
  // 96 bpm i C-dur, ackorden C, Am, F, G. Melodin skapas en gång med fast frö, så den är samma varje gång och går att känna igen.
  var STEP = 60 / 96 / 2, CH = [[48, 52, 55, 60], [45, 48, 52, 57], [41, 45, 48, 53], [43, 47, 50, 55]];
  var mel = [], nextT = 0, stepN = 0;
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function makeMelody() {
    var seed = 11, scale = [60, 62, 64, 67, 69, 72, 74, 76];
    function r() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function phrase() {
      var p = [];
      for (var bar = 0; bar < 4; bar++) for (var s = 0; s < 8; s++) {
        if (!(s === 0 || r() < (s % 2 ? 0.3 : 0.6))) { p.push(null); continue; }
        p.push(s % 4 === 0 ? CH[bar][1 + Math.floor(r() * 3)] + 12 : scale[Math.floor(r() * scale.length)]);
      }
      return p;
    }
    var A = phrase(), B = phrase();
    mel = A.concat(A, B, A);                                // form AABA, 16 takter
  }
  function schedule() {
    if (!ac || ac.state !== 'running') return;
    while (nextT < ac.currentTime + 0.25) {
      if (vol.music > 0 && !songSrc) {
        var s = stepN % mel.length, inBar = s % 8, ch = CH[Math.floor(s / 8) % 4];
        if (inBar === 0 || inBar === 4) tone('triangle', mtof(ch[0] - 12 + trans), 0, STEP * 3.5, 0.32, nextT, synthBus, 0.01);   // bas
        if (inBar === 0) tone('sine', 110, 45, 0.12, 0.28, nextT, synthBus);                                              // mjuk trumma
        if (inBar % 2 === 1) noise(0.04, 0.045, nextT, 'highpass', 7000, null, 0.7, synthBus);                            // hi-hat
        tone('sine', mtof(ch[1 + (inBar % 3)] + trans), 0, STEP * 0.9, 0.06, nextT, synthBus, 0.01);                              // arpeggio
        if (mel[s]) tone('triangle', mtof(mel[s] + trans), 0, STEP * 1.6, cave ? 0.07 : 0.12, nextT, synthBus, 0.01);             // melodi
      }
      nextT += STEP; stepN++;
    }
  }

  // ---------- ljudfiler (v3.8) ----------
  function loadFiles() {
    Object.keys(FILES).forEach(function (k) {
      try {
        fetch(FILES[k].url).then(function (r) { if (!r.ok) throw new Error(); return r.arrayBuffer(); })
          .then(function (b) { return new Promise(function (ok, no) { ac.decodeAudioData(b, ok, no); }); })
          .then(function (buf) { bufs[k] = buf; }).catch(function () {});
      } catch (e) {}
    });
  }
  function playFile(k, rate, secs) {                        // spelar en ljudfil; null om den inte är laddad (spelet tar då det skapade ljudet). secs = exakt längd i sekunder, tonas ut på slutet
    var f = FILES[k], b = bufs[k];
    if (!ac || !f || !b || vol.sfx <= 0 || ac.state !== 'running') return null;
    var now = ac.currentTime; if (last['f' + k] && now - last['f' + k] < 0.03) return { src: null };   // samma ljud tätt: smälter ihop
    last['f' + k] = now;
    var s = ac.createBufferSource(), g = ac.createGain(); s.buffer = b; s.playbackRate.value = rate || 1; g.gain.value = f.gain;
    var r = rate || 1, len = secs ? Math.min(f.dur, secs * r) : f.dur;   // längd i filens sekunder
    if (secs) { var end = now + 0.005 + len / r; g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(f.gain, now + 0.04); g.gain.setValueAtTime(f.gain, Math.max(now + 0.05, end - 0.05)); g.gain.exponentialRampToValueAtTime(0.0001, end); }
    s.connect(g); g.connect(sfxBus); s.start(now + 0.005, f.start, len);
    return { src: s, g: g };
  }
  function stopFile(h, fade) {
    if (!h || !h.src || !ac) return;
    try { var t = ac.currentTime; h.g.gain.setTargetAtTime(0.0001, t, (fade || 0.2) / 3); h.src.stop(t + (fade || 0.2) + 0.05); } catch (e) {}
  }

  // ---------- musik från fil (v3.8) ----------
  function loadSong(k) {
    if (!ac || !SONGS[k] || songBufs[k] || songLoading[k]) { if (songBufs[k] && k === songKind) startSong(); return; }
    songLoading[k] = true;
    try {
      fetch(SONGS[k].url).then(function (r) { if (!r.ok) throw new Error(); return r.arrayBuffer(); })
        .then(function (b) { return new Promise(function (ok, no) { ac.decodeAudioData(b, ok, no); }); })
        .then(function (buf) { songBufs[k] = buf; songLoading[k] = false; if (k === songKind) startSong(); })
        .catch(function () { songLoading[k] = false; });            // går det inte: den skapade musiken spelar vidare
    } catch (e) { songLoading[k] = false; }
  }
  function startSong() {                                    // tona över från den skapade musiken till låten
    var S = SONGS[songKind], b = songBufs[songKind];
    if (!ac || songSrc || !S || !b) return;
    var t = ac.currentTime; songSrc = ac.createBufferSource(); songSrc.buffer = b; songSrc.loop = true; songSrc.loopStart = S.a; songSrc.loopEnd = S.b;
    songGain = ac.createGain(); songGain.gain.setValueAtTime(0.0001, t); songGain.gain.exponentialRampToValueAtTime(S.gain, t + 1.5);
    songSrc.connect(songGain); songGain.connect(musicFilter); songSrc.start(t, S.a);
    synthBus.gain.setTargetAtTime(0.0001, t, 0.4);
  }
  function stopSong() {
    if (!songSrc) return;
    var t = ac.currentTime, s0 = songSrc; try { songGain.gain.setTargetAtTime(0.0001, t, 0.25); s0.stop(t + 1); } catch (e) {}
    songSrc = null; songGain = null; nextT = Math.max(nextT, t + 0.1); synthBus.gain.setTargetAtTime(1, t, 0.3);
  }
  function preload(k) { if (ac && SONGS[k]) loadSong(k); }   // laddar utan att spela (spelas bara om k är vald)
  function setSong(k) {                                    // 'ny', 'spel' eller 'klassisk' (den skapade)
    if (k === songKind) return; songKind = k;
    if (!ac) return;
    stopSong(); if (k !== 'klassisk') loadSong(k);
  }

  // ---------- styrning från spelet ----------
  function setVolumes(m, s) {
    vol.music = m; vol.sfx = s;
    if (!ac) return;
    musicBus.gain.setTargetAtTime(musicGain(), ac.currentTime, 0.1);
    sfxBus.gain.setTargetAtTime(s, ac.currentTime, 0.05);
  }
  function setCave(b) {                                     // i grottan blir musiken dovare
    if (!ac || b === cave) return;
    cave = b; musicFilter.frequency.setTargetAtTime(b ? 850 : 3200, ac.currentTime, 0.4);
  }
  function note(i) {                                        // runstenarnas toner
    if (!ac || vol.sfx <= 0 || ac.state !== 'running') return;
    var sc = [0, 2, 4, 7, 9, 12, 14], f = mtof(72 + sc[i % 7]), t = ac.currentTime + 0.005;
    tone('triangle', f, 0, 0.5, 0.28, t); tone('sine', f * 2, 0, 0.3, 0.06, t);
  }
  function setBiome(i) { trans = [0, -2, 3, 2, -3][i] || 0; }      // ny tonart i varje miljö
  function duck(on) { ducked = on; if (ac) musicBus.gain.setTargetAtTime(musicGain(), ac.currentTime, 0.15); }
  function suspend() { if (ac && ac.state === 'running') ac.suspend(); }
  function resume() { if (ac && ac.state === 'suspended') ac.resume().then(function () { nextT = Math.max(nextT, ac.currentTime + 0.1); }); }

  return { init: init, play: play, playFile: playFile, stopFile: stopFile, setSong: setSong, preload: preload, get song() { return songSrc ? songKind : 'klassisk'; }, note: note, setVolumes: setVolumes, setCave: setCave, setBiome: setBiome, duck: duck, suspend: suspend, resume: resume,
    get state() { return ac ? ac.state : 'ingen'; } };
})();
