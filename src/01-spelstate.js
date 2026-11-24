  // ---------- spelstate ----------
  var P, level, map, isCave, oreHp, mons, items, state, msg = '', msgT = 0, fx = [], kills, quota, time = 0;
  var oreT = {}, treeHp = {}, stoneHp = {}, puzzle = null, pushT = 0;      // v3.0: malmsort per ruta, trädens hälsa, skattkammarens pussel
  var keys = {}, mouse = { x: 0, y: 0, down: false, has: false };
  var trauma = 0, shakeT = 0, hitStop = 0, fade = 0, texts = [];
  // pekskärm: joystick under vänster tumme, knappar för höger tumme
  var touchMode = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches), lastTouch = -9999, deadAt = 0;
  var touch = { joyId: null, jx0: 0, jy0: 0, jx: 0, jy: 0, atkId: null, eId: null, shieldId: null, bowId: null };
  var JOY_R = 56, BTN_ATK = { x: LW - 96, y: LH - 96, r: 56 }, BTN_E = { x: LW - 214, y: LH - 66, r: 42 }, BTN_PAUSE = { x: LW - 30, y: 23, r: 17 }, BTN_DIFF = { x: LW / 2 - 200, y: LH - 44, w: 200, h: 40 }, BTN_BOLT = { x: LW - 96, y: LH - 202, r: 38 }, BTN_SHIELD = { x: LW - 214, y: LH - 168, r: 36 }, BTN_BOW = { x: LW - 214, y: LH - 262, r: 34 }, BTN_NEW = { x: LW / 2, y: LH - 44, w: 170, h: 40 };

  // inställningar som spelaren ändrar i pausmenyn (sparas per enhet)
  var SET_KEY = 'mm-installningar';
  var settings = { music: 0.5, sfx: 0.8, shake: FXC.shake == null ? 1 : FXC.shake, flash: FXC.flash !== false, numbers: FXC.damageNumbers !== false, guide: true, diff: 'latt', slot: 1, keys: null, keysV: 0 };   // v3.7.1: keys = egna tangenter
  try { var ss = JSON.parse(localStorage.getItem(SET_KEY)); if (ss) Object.keys(settings).forEach(function (k) { if (ss[k] !== undefined) settings[k] = ss[k]; }); } catch (e) {}
  function applySettings() {
    FXC.shake = settings.shake; FXC.flash = settings.flash; FXC.damageNumbers = settings.numbers;
    if (window.LJUD) LJUD.setVolumes(settings.music, settings.sfx);
    try { localStorage.setItem(SET_KEY, JSON.stringify(settings)); } catch (e) {}
  }
  // v3.7.1: egen styrning på datorn. Två tangenter per handling, sparas i inställningarna.
  var KEY_ACTS = [['up', 'Gå upp'], ['down', 'Gå ner'], ['left', 'Gå vänster'], ['right', 'Gå höger'], ['attack', 'Slå'], ['shield', 'Sköld'], ['bow', 'Skjut'], ['run', 'Spring'], ['bolt', 'Blixt'], ['use', 'Smid, ät och fiska']];
  // tre platser per handling: tangent, tangent eller mus, handkontroll (v3.7.4)
  var KEY_DEF = { up: ['w', 'ArrowUp', 'Pad12'], down: ['s', 'ArrowDown', 'Pad13'], left: ['a', 'ArrowLeft', 'Pad14'], right: ['d', 'ArrowRight', 'Pad15'], attack: [' ', 'Mouse0', 'Pad0'], shield: ['Shift', 'Mouse2', 'Pad1'], bow: ['f', '', 'Pad2'], run: ['c', '', 'Pad4'], bolt: ['q', '', 'Pad3'], use: ['e', '', 'Pad5'] };
  var lastInput = 'kb';                                            // kb, pad eller touch: styr vilka knappnamn texterna visar
  function keyBinds() {
    var kb = settings.keys; if (!kb || typeof kb !== 'object') kb = settings.keys = {};
    KEY_ACTS.forEach(function (a) {
      var b = kb[a[0]];
      if (!Array.isArray(b) || b.length < 2) kb[a[0]] = KEY_DEF[a[0]].slice();
      else if (b.length === 2) { var pd = KEY_DEF[a[0]][2]; b.push(KEY_ACTS.some(function (o) { return kb[o[0]] && kb[o[0]].indexOf(pd) >= 0; }) ? '' : pd); }   // v3.7.4: äldre sparade får handkontrollen
    });
    if (settings.keysV !== 2) {                                   // v3.7.2: äldre egna tangenter får musknapparna som förut
      settings.keysV = 2;
      var used = function (k) { return KEY_ACTS.some(function (a) { return kb[a[0]].indexOf(k) >= 0; }); };
      if (!used('Mouse0') && !kb.attack[1]) kb.attack[1] = 'Mouse0';
      if (!used('Mouse2') && !kb.shield[1]) kb.shield[1] = 'Mouse2';
    }
    return kb;
  }
  function held(act) { var b = keyBinds()[act]; return !!((b[0] && keys[b[0]]) || (b[1] && keys[b[1]]) || (b[2] && keys[b[2]])); }
  function isKey(act, k) { var b = keyBinds()[act]; return !!k && (b[0] === k || b[1] === k || b[2] === k); }
  var MOUSE_NAME = { Mouse0: 'vänster musknapp', Mouse1: 'mittenknappen', Mouse2: 'höger musknapp', Mouse3: 'musknapp 4', Mouse4: 'musknapp 5' };
  var PAD_NAME = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start', 'L3', 'R3', '↑', '↓', '←', '→', 'Hem'];
  function padName(k) { return k && k.indexOf('Pad') === 0 ? PAD_NAME[+k.slice(3)] || k : null; }
  function keyName(k) { return !k ? '' : padName(k) ? padName(k) : MOUSE_NAME[k] ? MOUSE_NAME[k] : k === ' ' ? 'mellanslag' : k === 'ArrowUp' ? 'pil upp' : k === 'ArrowDown' ? 'pil ner' : k === 'ArrowLeft' ? 'pil vänster' : k === 'ArrowRight' ? 'pil höger' : k === 'Control' ? 'Ctrl' : k.length === 1 ? k.toUpperCase() : k; }
  function KN(act) { var b = keyBinds()[act]; if (lastInput === 'pad' && b[2]) return 'knappen ' + keyName(b[2]); return keyName(b[0] || b[1]) || 'ingen tangent'; }
  function KN2(act) { var b = keyBinds()[act]; if (lastInput === 'pad' && b[2]) return 'knappen ' + keyName(b[2]); return [b[0], b[1]].filter(function (k) { return !!k; }).map(keyName).join(' eller ') || 'ingen tangent'; }   // båda valen
  function KS(act) { var b = keyBinds()[act], k = lastInput === 'pad' && b[2] ? b[2] : b[0] || b[1]; return !k ? '' : padName(k) ? padName(k) : k.indexOf('Mouse') === 0 ? 'M' + (+k.charAt(5) + 1) : k === ' ' ? 'Spc' : k.indexOf('Arrow') === 0 ? { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' }[k] : k.length === 1 ? k.toUpperCase() : k.slice(0, 3); }
  function sfx(n) { if (window.LJUD) LJUD.play(n); }
  var guideMoved = 0, eatHintT = 0;                      // eatHintT: sekunder till nästa ät-tips
  var shots = [], arrows = [], ambientT = 0, forgeSel = 0;              // v2.2: nätskott, luftpartiklar, val i smedjan

  // v2.2: fem världar, var femte nivå. Bara utseende, musik och boss skiljer; monstren blir svårare med nivån.
  var BIOMES = [
    { name: 'Ängen', boss: 'Grottkungen', bossColor: '#8a6a4a', ground: ['#3d8c38', '#40913a', '#3a8735', '#43933c'], blade: ['#2f7a2c', '#62b255'],
      flowers: ['#ffffff', '#ffe14d', '#ff9ec7', '#b9a6ff'], tree: 'leaf', stone: ['#a4a8b2', '#5c6069'], rim: '#5d6170', cave: ['#232536', '#262839'], air: null },
    { name: 'Djungeln', boss: 'Djungeljätten', bossColor: '#4f7a2a', ground: ['#2c6b2a', '#2f722c', '#296526', '#33782f'], blade: ['#1d5220', '#4f9a3c'],
      flowers: ['#ff5a3c', '#ffb02e', '#ff7ad1'], tree: 'jungle', stone: ['#7f9a78', '#3e5a3c'], rim: '#4a5e46', cave: ['#1d2a22', '#202e25'], air: 'fireflies' },
    { name: 'Öknen', boss: 'Sandkungen', bossColor: '#c08a3a', ground: ['#e2c07a', '#e6c582', '#dcb872', '#e9ca8a'], blade: ['#c9a25c', '#f2d99c'],
      flowers: null, tree: 'cactus', stone: ['#e0b27a', '#9a6b3a'], rim: '#a07a4a', cave: ['#2e2418', '#33281b'], air: 'sand' },
    { name: 'Snölandet', boss: 'Isjätten', bossColor: '#7fb0e0', ground: ['#e8eef5', '#eef3f8', '#e2e9f1', '#f2f6fa'], blade: ['#c5d3e3', '#ffffff'],
      flowers: null, tree: 'pine', stone: ['#d4e0ee', '#7d8ea6'], rim: '#8a9bb2', cave: ['#1f2a3d', '#223047'], air: 'snow' },
    { name: 'Lavalandet', boss: 'Lavaherren', bossColor: '#d0402a', ground: ['#3b2f2c', '#41332f', '#372b28', '#45362f'], blade: ['#2a1f1c', '#5a4038'],
      flowers: null, tree: 'dead', stone: ['#6d5650', '#2b201d'], rim: '#4a3a36', cave: ['#1d1416', '#21171a'], air: 'embers', cracks: true }
  ];
  BIOMES.forEach(function (b, i) { b.i = i; });
  function lapOf(n) { return Math.floor((n - 1) / 25); }        // varv: 0 = första, 1 = kväll, 2+ = natt
  function biomeOf(n) { return BIOMES[Math.floor((n - 1) / 5) % BIOMES.length]; }
  var biome = BIOMES[0];
  var AIR_RATE = { snow: 0.05, sand: 0.09, embers: 0.12, fireflies: 0.45 };
  BIOMES[1].treeMul = 1.9; BIOMES[1].canopy = true;           // djungeln: tät skog och lövtak
  var CAVE_DARK = [0.62, 0.8, 0.9, 0.95, 0.97];                // grottorna blir mörkare för varje värld (v3.6: mörkare, lyktan behövs)
  var BOSS_KIND = ['golem', 'ape', 'scorpion', 'yeti', 'demon'];
  var MET = [                                                  // v3.0: malmsorter
    { name: 'koppar', c1: '#ffc49a', c2: '#e0763a', c3: '#7a3414' },
    { name: 'järn', c1: '#f4f7fb', c2: '#aeb6c2', c3: '#545c6a' },
    { name: 'guld', c1: '#fff1a8', c2: '#f0c94a', c3: '#a8781f' },
    { name: 'stjärnmalm', c1: '#e6f5ff', c2: '#6ab8ff', c3: '#2a5aa0' }
  ];
  var PICK_NAME = ['stenhacka', 'kopparhacka', 'järnhacka', 'guldhacka'];
  var DIFF_ORDER = ['latt', 'medel', 'svar'], DIFF_NAME = { latt: 'Lätt', medel: 'Medel', svar: 'Svår' };
  function DF() { return C.difficulty[settings.diff] || C.difficulty.latt; }
  function cycleDiff(dir) {
    var i = DIFF_ORDER.indexOf(settings.diff); if (i < 0) i = 0;
    settings.diff = DIFF_ORDER[(i + (dir || 1) + 3) % 3]; applySettings(); sfx('click');
  }
  var bossIntro = 0, stormT = 0;

  function newPlayer() {
    return {
      x: 2.5 * TS, y: 2.5 * TS, r: 10, hearts: C.player.startHearts,
      hp: C.player.startHearts * C.player.hpPerHeart,
      str: C.player.startStrength, ore: 0, meat: 1, sword: 0,
      fx: 1, fy: 0, cd: 0, inv: 0, swing: 0, walk: 0, moving: false, pu: 0, spk: 0, armor: 0, pick: 0, lamp: 0, slow: 0, moon: 0, moonEver: false, vx: 0, vy: 0, icy: 0, bolts: 0, wood: 0, stone: 0, iron: 0, gold: 0, star: 0, treasureSeen: false, bossDone: 0, chests: [], minedMap: {}, maxLevel: 1, flax: 0, hide: 0, rod: 0, knife: 0, quiver: 0, arrowHead: 0, spin: 0, bash: 0, parrow: 0, endure: 0, bashT: 0, spinA0: 0, atkBuf: 0, stamina: null, tired: false, restT: 0, running: false, runSeen: false, spinCd: 0, bashCd: 0, pwrCd: 0, atkHold: 0, spinCharge: 0, bowHold: 0, spinT: 0, backSeen: false, flaxSeen: false, fish: null, portalLock: false, hasPick: false, shield: 0, bow: 0, arrows: 0, blocking: false, shootCd: 0, shotT: 0, blockFlash: 0, calmT: 0
    };
  }
  function maxHp() { return P.hearts * C.player.hpPerHeart; }
  function arrowDamage() { return Math.max(C.bow.headDmg[P.arrowHead || 0] * C.bow.bowMul[P.bow], damage() * C.bow.dmgMul[P.bow]); }
  function maxArrows(q) { var cap = DF().quiverCap || C.bow.quiverCap; return cap[Math.min(q == null ? P.quiver : q, cap.length - 1)]; }   // v3.5: kogret har steg 0-3
  function exitOpen() { return kills >= quota || level < (P.maxLevel || 1); }   // tillbaka på en klarad nivå är portalen öppen
  function treasureLevel(tw) { return tw * 5 + 1 + ((Math.imul(tw + 1, 2654435761) >>> 0) % 4); }
  function oldChests(cd) { var l = []; for (var tw = 0; treasureLevel(tw) <= cd; tw++) l.push(treasureLevel(tw)); return l; }   /* äldre sparningar: kistor till och med den senaste räknas som tagna */
  function metalAmt(t) { return [P.ore, P.iron, P.gold, P.star][t] || 0; }   // P.ore = koppar (gamla malmen)
  function addMetal(t, n) { if (t === 0) P.ore += n; else if (t === 1) P.iron += n; else if (t === 2) P.gold += n; else P.star += n; }
  function damage() {
    var base = P.sword > 0 ? C.weapon.swordBaseDamage + C.weapon.damagePerSwordLevel * (P.sword - 1) : C.weapon.stickDamage;
    return base + C.weapon.damagePerStrength * (P.str - 1);
  }
  function power() { return P.sword + P.str - 1; }          // styr blixtarnas storlek
  function reach() { return C.player.baseReach + Math.min(power(), 12) * 2; }
  function upgradeCost() {
    return P.sword === 0 ? C.weapon.craftCost : Math.round(C.weapon.upgradeCostBase + C.weapon.upgradeCostStep * P.sword + (C.weapon.upgradeCostSquare || 0) * P.sword * P.sword);
  }
  function say(t) { msg = t; msgT = 3; }

  // träffkänsla (se .claude/skills/game-feel): trauma ger skak, hit-stop fryser spelet kort
  function addTrauma(a) { trauma = Math.min(1, trauma + a); }
  function freeze(s) { if (FXC.hitStop !== false) hitStop = Math.max(hitStop, s); }
  function floatText(x, y, txt, col) {
    if (FXC.damageNumbers === false) return;
    texts.push({ x: x, y: y, txt: txt, col: col, t: 0, life: 0.9, vx: (Math.random() - 0.5) * 30 });
  }
  // Power-up: blixtarna används bara här, som en kort smäll när gubben blir starkare.
  function powerUp() {
    P.pu = 0.6; addTrauma(0.25); sfx('powerup');
    for (var i = 0; i < 6; i++) {
      var a = i / 6 * 6.283 + Math.random() * 0.4;
      bolt(P.x + Math.cos(a) * 8, P.y - 3 + Math.sin(a) * 8, P.x + Math.cos(a) * 52, P.y - 3 + Math.sin(a) * 52, 2);
    }
    fx.push({ k: 'r', x: P.x, y: P.y - 3, t: 0.45, life: 0.45 });
    sparks(P.x, P.y, PAL.bolt, 16);
  }

  function save() {
    try {
      localStorage.setItem(slotKey(slot), JSON.stringify({ diff: settings.diff, savedAt: Date.now(),
        level: level, hearts: P.hearts, str: P.str, ore: P.ore, meat: P.meat, sword: P.sword, armor: P.armor, pick: P.pick, lamp: P.lamp, moon: P.moon, moonEver: P.moonEver, bolts: P.bolts, armorV: 2, bossDone: P.bossDone, chests: P.chests, minedMap: P.minedMap, maxLevel: P.maxLevel, flax: P.flax, hide: P.hide, rod: P.rod, knife: P.knife, quiver: P.quiver, quiverV: 3, spin: P.spin, bash: P.bash, parrow: P.parrow, endure: P.endure, runSeen: P.runSeen, arrowHead: P.arrowHead, backSeen: P.backSeen, flaxSeen: P.flaxSeen, hasPick: P.hasPick, shield: P.shield, bow: P.bow, arrows: P.arrows, wood: P.wood, stone: P.stone, iron: P.iron, gold: P.gold, star: P.star, treasureSeen: P.treasureSeen
      }));
    } catch (e) {}
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && s.level >= 1) return s;
    } catch (e) {}
    return null;
  }

