// Balansvärden för Streckgubbe. Justera här, inget annat behöver ändras.
// Alla "per nivå"-värden räknas med nivånummer (1, 2, 3 ...).
const CONFIG = {
  tile: 32,
  cols: 30,
  rows: 18,

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
    maxSwordLevel: 10,
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
    baseMonsters: 3,
    monstersPerLevel: 1.2,
    maxMonsters: 22,
    baseOre: 8,
    orePerLevel: 1.5,
    treeDensity: 0.10,
    stoneDensity: 0.05,
    caves: 3,
    crystalsPerLevel: 1,   // kristaller gömda i grottor
    heartEveryNLevels: 2,  // ett hjärta på marken var N:e nivå
    extraMeat: 1           // köttklubbor utlagda per nivå
  },

  monsters: {
    // hp = hpBase + hpPerLevel * nivå ; dmg = dmgBase + dmgPerLevel * nivå
    slime: { from: 1, hpBase: 2,  hpPerLevel: 1.4, dmgBase: 3, dmgPerLevel: 0.9, speed: 38, speedPerLevel: 3,   maxSpeed: 85,  radius: 11, weight: 6, color: '#58c24a' },
    bat:   { from: 3, hpBase: 1,  hpPerLevel: 0.9, dmgBase: 2, dmgPerLevel: 0.8, speed: 70, speedPerLevel: 3.5, maxSpeed: 115, radius: 8,  weight: 3, color: '#8a5fc4' },
    brute: { from: 5, hpBase: 6,  hpPerLevel: 2.2, dmgBase: 6, dmgPerLevel: 1.2, speed: 30, speedPerLevel: 2,   maxSpeed: 70,  radius: 15, weight: 2, color: '#c2503f' },
    aggroRange: 200,       // monster ser spelaren inom detta avstånd
    caveAggroRange: 150,
    attackCooldown: 0.9,
    knockback: 90
  }
};
