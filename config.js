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
    swordBaseDamage: 3,    // svärd nivå 1
    damagePerSwordLevel: 1.5,
    damagePerStrength: 0.8,
    maxSwordLevel: 15,    // v2.2: höjt från 10
    craftCost: 4,          // malm för första svärdet
    upgradeCostBase: 3,    // uppgradering = base + step * nuvarande nivå
    upgradeCostStep: 2
  },

  mining: {
    hitsPerOre: 3,         // hack per malmblock
    oreYield: 1
  },

  items: {
    meatHeal: 12,          // hälsa per köttklubba
    meatDropChance: 0.35,  // chans att monster tappar kött
    heartMaxHpGain: 1,     // hjärtan som läggs till (1 = ett helt hjärta)
    crystalStrengthGain: 1,
    maxMeat: 9
  },

  level: {
    baseMonsters: 4,       // v2.2: fler monster (var 3)
    monstersPerLevel: 1.5, // v2.2: var 1.2
    maxMonsters: 30,       // v2.2: var 22
    baseOre: 8,
    orePerLevel: 1.5,
    treeDensity: 0.10,
    stoneDensity: 0.05,
    caves: 3,
    crystalsPerLevel: 1,   // kristaller gömda i grottor
    heartEveryNLevels: 2,  // ett hjärta på marken var N:e nivå
    extraMeat: 1           // köttklubbor utlagda per nivå
  },

  // Boss var femte nivå (v2.2). hp/dmg = bas + perNivå * nivå
  boss: { every: 5, hpBase: 30, hpPerLevel: 7, dmgBase: 7, dmgPerLevel: 1.1, speed: 48, chargeSpeed: 270, radius: 22,
          slamRadius: 120, minionsAtHalf: 3, rewardOre: 6 },

  // Spindelns nät (v2.2)
  spider: { shotSpeed: 170, shotCooldown: 2.2, range: 230, slowTime: 1.6, slowFactor: 0.5, shotDamage: 1 },

  // Smedjan (v2.2). Kostnad = costBase + costStep * nuvarande nivå
  upgrades: {
    armor:   { max: 5, costBase: 6, costStep: 4, reducePerLevel: 0.12 },   // mindre skada per nivå
    pickaxe: { max: 3, costBase: 5, costStep: 5 },                         // färre slag per malm, nivå 3 ger dubbel malm
    lantern: { max: 3, costBase: 4, costStep: 4, lightPerLevel: 30 }       // större ljus i grottor (pixlar)
  },

  monsters: {
    // hp = hpBase + hpPerLevel * nivå ; dmg = dmgBase + dmgPerLevel * nivå
    slime: { from: 1, hpBase: 2,  hpPerLevel: 1.4, dmgBase: 3, dmgPerLevel: 0.9, speed: 38, speedPerLevel: 3,   maxSpeed: 85,  radius: 11, weight: 6, color: '#58c24a' },
    bat:   { from: 3, hpBase: 1,  hpPerLevel: 0.9, dmgBase: 2, dmgPerLevel: 0.8, speed: 70, speedPerLevel: 3.5, maxSpeed: 115, radius: 8,  weight: 3, color: '#8a5fc4' },
    spider: { from: 7, hpBase: 3, hpPerLevel: 1.1, dmgBase: 2, dmgPerLevel: 0.6, speed: 55, speedPerLevel: 2, maxSpeed: 90, radius: 10, weight: 3, color: '#3b3b48' },
    ghost:  { from: 9, hpBase: 2, hpPerLevel: 1.0, dmgBase: 4, dmgPerLevel: 0.9, speed: 34, speedPerLevel: 1.5, maxSpeed: 60, radius: 11, weight: 2, color: '#cfd8ff' },
    brute: { from: 5, hpBase: 6,  hpPerLevel: 2.2, dmgBase: 6, dmgPerLevel: 1.2, speed: 30, speedPerLevel: 2,   maxSpeed: 70,  radius: 15, weight: 2, color: '#c2503f' },
    aggroRange: 200,       // monster ser spelaren inom detta avstånd
    caveAggroRange: 150,
    attackCooldown: 0.9,
    knockback: 90
  }
};
