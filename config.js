// Balansvärden för Streckgubbe. Justera här, inget annat behöver ändras.
// Alla "per nivå"-värden räknas med nivånummer (1, 2, 3 ...).
const CONFIG = {
  tile: 32,
  cols: 30,
  rows: 18,

  // Effekter (v2). Sänk eller stäng av om något känns obehagligt.
  effects: {
    shake: 1,              // skärmskakning, 0 = av, 1 = full
    hitStop: true,         // kort frysning vid träff
    flash: true,           // vit blinkning på monster vid träff (false = svag färgton)
    damageNumbers: true    // flygande skadetal och plock-texter
  },

  player: {
    speed: 130,            // pixlar/sekund
    startHearts: 3,        // varje hjärta = hpPerHeart hälsa
    hpPerHeart: 10,
    startStrength: 1,
    attackCooldown: 0.35,  // sekunder
    baseReach: 38,         // slagets räckvidd i pixlar
    invulnAfterHit: 0.6,   // sekunder utan skada efter träff
    levelClearHeal: 0.3    // andel av maxhälsa som återställs när nivån klaras
  },

  weapon: {
    stickDamage: 1,        // utan svärd
    swordBaseDamage: 2.5,  // svärd nivå 1 (v3.0: var 3)
    damagePerSwordLevel: 1.0,  // v3.0: var 1.5
    damagePerStrength: 0.4,  // v2.3: var 0.8 (kristaller ger nu blixtkraft)
    maxSwordLevel: 15,    // v2.2: höjt från 10
    craftCost: 4,          // malm för första svärdet
    upgradeCostBase: 3,    // uppgradering = base + step * nuvarande nivå
    upgradeCostStep: 2,
    upgradeCostSquare: 0.3 // v2.3: dyrare för varje nivå (base + step*n + square*n*n)
  },

  mining: {
    hitsPerOre: 3,         // hack per malmblock
    oreYield: 1
  },

  items: {
    meatHeal: 12,          // hälsa per köttklubba
    meatDropChance: 0.15,  // chans att monster tappar kött (v3.4: lägre, mat finns hos djur och i dammar)
    heartMaxHpGain: 1,     // hjärtan som läggs till (1 = ett helt hjärta)
    crystalStrengthGain: 0,    // v3.0: kristaller ger bara blixtkraft (äldre sparningar behåller sin styrka)
    maxMeat: 9,
    maxHearts: 10          // v2.3: tak; fler hjärtan ger full hälsa i stället
  },

  level: {
    baseMonsters: 4,       // v2.2: fler monster (var 3)
    monstersPerLevel: 1.5, // v2.2: var 1.2
    maxMonsters: 30,       // v2.2: var 22
    baseOre: 8,
    orePerLevel: 0.6,      // v2.3: var 1.5
    maxOre: 22,            // v2.3: tak för malm per nivå
    treeDensity: 0.10,
    stoneDensity: 0.05,
    caves: 3,
    crystalsPerLevel: 1,   // kristaller gömda i grottor
    heartEveryNLevels: 5,  // ett hjärta på marken var N:e nivå
    extraMeat: 1           // köttklubbor utlagda per nivå
  },

  // Boss var femte nivå (v2.2). hp/dmg = bas + perNivå * nivå
  boss: { every: 5, hpBase: 30, hpPerLevel: 7, dmgBase: 7, dmgPerLevel: 1.1, speed: 48, chargeSpeed: 270, radius: 22,
          slamRadius: 120, minionsAtHalf: 3, rewardOre: 6 },

  // Spindelns nät (v2.2)
  spider: { shotSpeed: 170, shotCooldown: 2.2, range: 230, slowTime: 1.6, slowFactor: 0.5, shotDamage: 1 },

  // Smedjan (v2.2). Kostnad = costBase + costStep * nuvarande nivå
  upgrades: {
    armor:   { max: 16, reducePerLevel: 0.0375 },   // v3.0: fyra delar x fyra material, totalt 60 % mindre skada
    pickaxe: { max: 3, costBase: 6, costStep: 6 },                         // färre slag per malm, nivå 3 ger dubbel malm
    lantern: { max: 4, oreCost: 4, moonCost: [1, 2, 3], lightPerLevel: 30 }  // v2.3: fås gratis i Djungeln, uppgraderas med månsten
  },

  // Hantverk (v3.0). Malmsort: 0 koppar, 1 järn, 2 guld, 3 stjärnmalm. Hackans nivå n bryter sort 0..n.
  // Recepten anger kostnaden för att NÅ en nivå: trä (wood) och metall (metal = sort, n = antal), eller månsten (moon).
  crafting: {
    treeHits: 3, woodPerTree: 1, stoneHits: 3,   // grå stenar inne på kartan ger sten
    oreMix: [[0.92, 0.08, 0, 0], [0.35, 0.55, 0.10, 0], [0, 0.40, 0.50, 0.10], [0, 0, 0.45, 0.55], [0, 0, 0.30, 0.70]],   // andel per värld
    sword: [null, { wood: 2, stone: 3 }, { wood: 2, stone: 4 },   // stensvärd (nivå 1-2) av trä och sten
      { wood: 2, metal: 0, n: 4 }, { wood: 2, metal: 0, n: 5 }, { wood: 2, metal: 0, n: 6 },
      { wood: 3, metal: 1, n: 4 }, { wood: 3, metal: 1, n: 5 }, { wood: 3, metal: 1, n: 6 },
      { wood: 3, metal: 2, n: 4 }, { wood: 3, metal: 2, n: 5 }, { wood: 4, metal: 2, n: 6 },
      { wood: 4, metal: 3, n: 4 }, { wood: 4, metal: 3, n: 5 }, { wood: 5, metal: 3, n: 6 }, { wood: 5, metal: 3, n: 7 }],
    pick: [null, { wood: 2, metal: 0, n: 4 }, { wood: 3, metal: 1, n: 5 }, { wood: 3, metal: 2, n: 6 }],
    // Rustningen: delarna 0 bröstplåt, 1 hjälm, 2 axelskydd, 3 benskydd byggs/byts en i taget, först koppar, sedan järn, guld, stjärnmalm.
    armor: (function () { var a = [null]; for (var t = 0; t < 4; t++) for (var p = 0; p < 4; p++) a.push({ wood: 1 + (t >= 2 ? 1 : 0), metal: t, n: 2 + t + (p === 0 ? 1 : 0) }); return a; })(),
    stonePick: { wood: 2, stone: 3 },                            // v3.1: stenhacka krävs för koppar
    shield: [null, { wood: 2, metal: 0, n: 4 }, { wood: 2, metal: 1, n: 5 }, { wood: 2, metal: 2, n: 6 }, { wood: 3, metal: 3, n: 7 }],
    bow: [null, { wood: 4, stone: 1 }, { wood: 3, metal: 1, n: 4 }, { wood: 3, metal: 2, n: 5 }],   // träbåge, järnbåge, guldbåge
    arrows: { wood: 1, stone: 1 },                               // v3.3: stenspetsar, ger bow.arrowsPerCraft pilar (ingen metall)
    arrowHead: [null, { wood: 1, metal: 0, n: 4 }, { wood: 1, metal: 1, n: 5 }, { wood: 2, metal: 2, n: 6 }, { wood: 2, metal: 3, n: 7 }],   // pilspetsar: koppar, järn, guld, stjärnmalm
    rod: { wood: 2, flax: 3 },                                   // v3.3: fiskespö
    knife: { wood: 1, stone: 2 },                                // v3.3: jaktkniv av sten
    quiver: [null, { wood: 1, flax: 2 }, { flax: 2, hide: 2 }, { flax: 3, hide: 3 }],   // v3.5: kogret i tre steg (kostnad för att nå steg 1-3)
    lantern0: { metal: 0, n: 4 }
  },

  // Skattkammare (v3.0): en per värld på en slumpad nivå. Kistan ger trä, metall av nästa sort och en månsten.
  treasure: { chestWood: 3, moon: 1 },

  // Sköld och pilbåge (v3.1). block = andel skada som stoppas framifrån per sköldnivå (0-4).
  shield: { block: [0, 0.5, 0.65, 0.8, 0.9], slow: 0.5 },
  bow: { range: [0, 260, 300, 340], dmgMul: [0, 0.7, 0.85, 1.0], speed: 420, cooldown: 0.5, quiverCap: [5, 10, 20, 30], arrowsPerCraft: 5,   /* v3.5: pilar man kan bära per kogersteg (Lätt har egna) */
    headDmg: [3, 5, 8, 11, 15], bowMul: [0, 1.0, 1.15, 1.3], scarceOre: 6 },   // v3.3: pilens skada = spetsen x bågen (minst som förut); scarceOre = malm du får om du saknar

  // Natur (v3.3): lin på marken, en damm var tredje nivå (2, 5, 8 ...), bytesdjur på de andra nivåerna.
  nature: { flaxPerLevel: 4, flaxByPond: 3, pondEvery: 3 },
  fishing: { fishPerPond: 4, waitMin: 1.5, waitMax: 4, biteWindow: 0.9 },
  prey: { perLevel: 3, radius: 7, speed: 105, fear: 100, runTime: 1.6, restTime: 1.1, wander: 22, meat: 1, hideChance: 0.5 },

  // Byte från monster (v3.4), utöver kött: en bit metall, två pilar (om du har båge), spindlar tappar lin (tråd).
  drops: { ore: 0.15, arrows: 0.15, arrowsN: 2, spiderFlax: 0.5 },

  // Svårighetsgrader (v2.3). mHp/mDmg = monster, bHp = bossens hälsa, gap = sekunder mellan bossens anfall,
  // wind = hur länge bossen varnar (1 = som förut), keep = andel malm kvar efter död, minions = hjälpare i bossens andra fas
  difficulty: {
    latt:  { mHp: 0.7, mDmg: 0.6, bHp: 0.7, gap: [2.5, 4.5], wind: 1.3,  keep: 1.0,  minions: 2, regen: 0.25, invMul: 1.6, quiverCap: [10, 15, 25, 40] },   // v3.2: snällare
    //       regen = hjärtan per sekund när inget monster är nära och man inte blivit träffad på 3 s; invMul = längre skydd efter träff
    medel: { mHp: 1.4, mDmg: 1.3, bHp: 2.0, gap: [1.5, 2.5], wind: 0.75, keep: 0.5,  minions: 4 },
    svar:  { mHp: 1.8, mDmg: 1.7, bHp: 3.0, gap: [1.0, 1.8], wind: 0.55, keep: 0.0,  minions: 5 }
  },

  // Blixtkraft (v2.3): varje kristall ger en laddning. Q eller Blixt-knappen slår ned blixtar på alla monster.
  boltPower: { max: 3, damageBase: 10, damagePerLevel: 1.5 },

  // Efter nivå 25 börjar varv 2 (kvällsljus), sedan varv 3+ (natt). Elitmonster har mer hälsa och skada.
  laps: { eliteChancePerLap: 0.25, eliteMax: 0.6, eliteHp: 1.8, eliteDmg: 1.3 },

  monsters: {
    // hp = hpBase + hpPerLevel * nivå ; dmg = dmgBase + dmgPerLevel * nivå
    slime: { from: 1, hpBase: 2,  hpPerLevel: 2.0, dmgBase: 3, dmgPerLevel: 0.9, speed: 38, speedPerLevel: 3,   maxSpeed: 85,  radius: 11, weight: 6, color: '#58c24a' },
    bat:   { from: 3, hpBase: 1,  hpPerLevel: 1.3, dmgBase: 2, dmgPerLevel: 0.8, speed: 70, speedPerLevel: 3.5, maxSpeed: 115, radius: 8,  weight: 3, color: '#8a5fc4' },
    spider: { from: 7, hpBase: 3, hpPerLevel: 1.6, dmgBase: 2, dmgPerLevel: 0.6, speed: 55, speedPerLevel: 2, maxSpeed: 90, radius: 10, weight: 3, color: '#3b3b48' },
    ghost:  { from: 9, hpBase: 2, hpPerLevel: 1.4, dmgBase: 4, dmgPerLevel: 0.9, speed: 34, speedPerLevel: 1.5, maxSpeed: 60, radius: 11, weight: 2, color: '#cfd8ff' },
    brute: { from: 5, hpBase: 6,  hpPerLevel: 3.0, dmgBase: 6, dmgPerLevel: 1.2, speed: 30, speedPerLevel: 2,   maxSpeed: 70,  radius: 15, weight: 2, color: '#c2503f' },
    aggroRange: 200,       // monster ser spelaren inom detta avstånd
    caveAggroRange: 150,
    attackCooldown: 0.9,
    knockback: 90
  }
};
