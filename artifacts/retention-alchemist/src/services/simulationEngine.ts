export interface SimulationConfig {
  rewardRate: number;
  lootFrequency: number;
  dailyBonus: number;
  energyCost: number;
  shopPrice: number;
  adFrequency: number;
}

export interface DayRetention {
  day: number;
  retained: number;
  pct: number;
}

export interface SimulationResult {
  d1: number;
  d7: number;
  d30: number;
  curve: DayRetention[];
  churned: number[];
}

const PLAYER_COUNT = 1000;
const DOPAMINE_DECAY = 0.08;
const FRUSTRATION_DECAY = 0.05;
const CHURN_THRESHOLD = 1.4;
const TICKS_PER_DAY = 24;

function seededRandom(seed: number): () => number {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

interface PlayerState {
  dopamine: number;
  frustration: number;
  churned: boolean;
  churnDay: number | null;
}

function initPlayer(rng: () => number): PlayerState {
  return {
    dopamine: 0.5 + rng() * 0.3,
    frustration: 0.1 + rng() * 0.2,
    churned: false,
    churnDay: null,
  };
}

function tickPlayer(
  player: PlayerState,
  config: SimulationConfig,
  rng: () => number,
  tick: number,
  day: number
): void {
  if (player.churned) return;

  const rewardChance = config.rewardRate / 100;
  const lootChance = config.lootFrequency / 100;
  const adChance = config.adFrequency / 100;
  const energyDrain = config.energyCost / 100;
  const shopDrain = (config.shopPrice / 100) * 0.03;

  player.dopamine *= 1 - DOPAMINE_DECAY / TICKS_PER_DAY;
  player.frustration *= 1 - FRUSTRATION_DECAY / TICKS_PER_DAY;

  if (rng() < rewardChance / TICKS_PER_DAY) {
    player.dopamine += 0.12 + rng() * 0.08;
  }

  if (rng() < lootChance / TICKS_PER_DAY) {
    player.dopamine += 0.18 + rng() * 0.12;
  }

  if (tick === 0) {
    player.dopamine += (config.dailyBonus / 100) * (0.15 + rng() * 0.1);
  }

  if (rng() < energyDrain / TICKS_PER_DAY) {
    player.frustration += 0.06 + rng() * 0.04;
  }

  if (rng() < adChance / TICKS_PER_DAY) {
    player.frustration += 0.04 + rng() * 0.03;
  }

  player.frustration += shopDrain / TICKS_PER_DAY;

  player.dopamine = Math.max(0, Math.min(3.0, player.dopamine));
  player.frustration = Math.max(0, Math.min(3.0, player.frustration));

  if (player.frustration > player.dopamine * CHURN_THRESHOLD) {
    if (rng() < 0.15) {
      player.churned = true;
      player.churnDay = day;
    }
  }
}

export function runSimulation(config: SimulationConfig): SimulationResult {
  const seed = Math.floor(
    config.rewardRate * 1000 +
      config.lootFrequency * 100 +
      config.dailyBonus * 10 +
      config.energyCost * 7 +
      config.shopPrice * 3 +
      config.adFrequency * 13
  );
  const rng = seededRandom(seed ^ 0xdeadbeef);

  const players: PlayerState[] = Array.from({ length: PLAYER_COUNT }, () =>
    initPlayer(rng)
  );

  const churnedOnDay: number[] = new Array(30).fill(0);

  for (let day = 0; day < 30; day++) {
    for (let tick = 0; tick < TICKS_PER_DAY; tick++) {
      for (const player of players) {
        if (!player.churned) {
          tickPlayer(player, config, rng, tick, day);
        }
      }
    }

    const churnedToday = players.filter(
      (p) => p.churned && p.churnDay === day
    ).length;
    churnedOnDay[day] = churnedToday;
  }

  const curve: DayRetention[] = [];
  let retained = PLAYER_COUNT;

  for (let day = 0; day < 30; day++) {
    retained -= churnedOnDay[day];
    retained = Math.max(0, retained);
    curve.push({
      day: day + 1,
      retained,
      pct: Math.round((retained / PLAYER_COUNT) * 1000) / 10,
    });
  }

  const d1 = curve[0]?.pct ?? 100;
  const d7 = curve[6]?.pct ?? 100;
  const d30 = curve[29]?.pct ?? 100;

  return { d1, d7, d30, curve, churned: churnedOnDay };
}

export function getDefaultConfig(): SimulationConfig {
  return {
    rewardRate: 50,
    lootFrequency: 30,
    dailyBonus: 60,
    energyCost: 40,
    shopPrice: 50,
    adFrequency: 25,
  };
}
