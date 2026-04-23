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

export interface AgentEvent {
  agentId: number;
  day: number;
  type: "churn" | "loot" | "spike" | "engaged";
  message: string;
}

export interface SimulationResult {
  d1: number;
  d7: number;
  d30: number;
  curve: DayRetention[];
  churned: number[];
  events: AgentEvent[];
}

const PLAYER_COUNT = 1000;
const TICKS_PER_DAY = 24;
const DAYS = 30;
const MAX_EVENTS = 60;

// Churn model calibration — nonlinear in resilience:
// churnP = clamp(0.01, 0.98, BASE - SCALE * r^0.4 + frustPressure - dopaBonus)
// Distribution r = 1 - U^0.3 (mean ≈ 0.23, heavy casual-skewed)
// Players with r ≥ 0.5 hit the churnP floor (≈ 0.01) → hardcore core survives
// Target defaults: D1 ≈ 42%, D7 ≈ 15%, D30 ≈ 4%
const CHURN_BASE = 1.80;
const RESILIENCE_SCALE = 2.20;
const RESILIENCE_POWER = 0.4;
const FRUST_PRESSURE_SCALE = 1.8;
const DOPAMINE_BONUS_SCALE = 0.91;
const DOPAMINE_BONUS_THRESHOLD = 0.6;

function seededRandom(seed: number): () => number {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return function () {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s ^= s >>> 16;
    return (s >>> 0) / 0xffffffff;
  };
}

function computeSeed(config: SimulationConfig): number {
  return Math.abs(
    Math.floor(
      config.rewardRate * 999983 +
        config.lootFrequency * 49979 +
        config.dailyBonus * 15013 +
        config.energyCost * 7027 +
        config.shopPrice * 4051 +
        config.adFrequency * 2111
    )
  );
}

interface PlayerState {
  id: number;
  dopamine: number;
  frustration: number;
  resilience: number;
  churned: boolean;
  churnDay: number | null;
}

function initPlayer(rng: () => number, index: number): PlayerState {
  // Resilience: 1-U^0.3 → PDF = (10/3)(1-r)^(7/3), casual-skewed (mean ≈ 0.23)
  const resilience = 1 - Math.pow(rng(), 0.3);
  return {
    id: index,
    dopamine: 0.45 + rng() * 0.75,
    frustration: rng() * 0.35,
    resilience,
    churned: false,
    churnDay: null,
  };
}

function tickPlayer(
  player: PlayerState,
  config: SimulationConfig,
  rng: () => number,
  tick: number,
  events: AgentEvent[],
  day: number
): void {
  if (player.churned) return;

  // Dopamine: logarithmic decay (diminishing returns on recovery when already high)
  player.dopamine *= 1 - 0.2 / TICKS_PER_DAY;

  // Frustration: strong decay (15%/day) to prevent long-term compounding
  player.frustration *= 1 - 0.15 / TICKS_PER_DAY;

  // Daily login bonus (once per day, first tick)
  if (tick === 0) {
    player.dopamine += (config.dailyBonus / 100) * 0.22;
  }

  // Standard reward (logarithmic boost — diminishing returns)
  if (rng() < (config.rewardRate / 100) / TICKS_PER_DAY) {
    const boost = Math.log(1 + player.dopamine * 0.5 + 0.5) * 0.1;
    player.dopamine += boost;
  }

  // Loot drop (bigger spike)
  if (rng() < (config.lootFrequency / 100) / TICKS_PER_DAY) {
    const boost = Math.log(1.8) * 0.2;
    player.dopamine += boost;
    if (events.length < MAX_EVENTS && rng() < 0.22) {
      events.push({
        agentId: player.id,
        day: day + 1,
        type: "loot",
        message: `Loot drop! Dopamine spiked to ${Math.min(player.dopamine, 2.0).toFixed(2)}`,
      });
    }
  }

  // Energy cost — EXPONENTIAL frustration scaling: bad games punish harder as frustration grows
  if (rng() < (config.energyCost / 100) / TICKS_PER_DAY) {
    player.frustration += 0.020 * Math.pow(1 + player.frustration, 1.2);
    if (events.length < MAX_EVENTS && player.frustration > 0.5 && rng() < 0.10) {
      events.push({
        agentId: player.id,
        day: day + 1,
        type: "spike",
        message: `Energy wall hit. Frustration: ${Math.min(player.frustration, 2.0).toFixed(2)}`,
      });
    }
  }

  // Ad interruption — EXPONENTIAL scaling (ads compound irritation)
  if (rng() < (config.adFrequency / 100) / TICKS_PER_DAY) {
    player.frustration += 0.012 * Math.pow(1 + player.frustration, 1.1);
  }

  // Shop price — continuous linear drain (constant transaction friction)
  player.frustration += (config.shopPrice / 100) * 0.0008;

  player.dopamine = Math.max(0, Math.min(2.0, player.dopamine));
  player.frustration = Math.max(0, Math.min(2.0, player.frustration));
}

const CHURN_REASONS: Record<string, string[]> = {
  frustrated: [
    "Frustration critical. Uninstalling.",
    "This game is too punishing. Done.",
    "Ad overload. Leaving.",
    "Energy system hostile. Quitting.",
    "Friction too high. Goodbye.",
  ],
  bored: [
    "Lost interest. Novelty gone.",
    "Nothing engaging left. Idle.",
    "Dopamine depleted. Moving on.",
    "Engagement faded. Exiting.",
    "Loop got stale. Uninstalled.",
  ],
  casual: [
    "Never really committed. Bye.",
    "Just passing through.",
    "Tried it once. Not for me.",
    "Low attachment. Uninstalled.",
    "Opened it twice. Done.",
  ],
};

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function runSimulation(config: SimulationConfig): SimulationResult {
  const seed = computeSeed(config);
  const rng = seededRandom(seed);

  const players: PlayerState[] = Array.from({ length: PLAYER_COUNT }, (_, i) =>
    initPlayer(rng, i)
  );

  const churnedOnDay: number[] = new Array(DAYS).fill(0);
  const events: AgentEvent[] = [];

  for (let day = 0; day < DAYS; day++) {
    // Run intra-day ticks for game state + event generation
    for (let tick = 0; tick < TICKS_PER_DAY; tick++) {
      for (const player of players) {
        tickPlayer(player, config, rng, tick, events, day);
      }
    }

    // Daily churn check — nonlinear resilience formula
    for (const player of players) {
      if (player.churned) continue;

      // Frustration pressure: quadratic (exponential growth in ticks creates elevated floor)
      const frustPressure =
        Math.pow(Math.max(0, player.frustration), 2) * FRUST_PRESSURE_SCALE;

      // Dopamine bonus: reward for high engagement
      const dopamineBonus =
        (player.dopamine - DOPAMINE_BONUS_THRESHOLD) * DOPAMINE_BONUS_SCALE;

      // Churn probability: concave in resilience — casual players churn far more than average
      const churnP = Math.max(
        0.01,
        Math.min(
          0.98,
          CHURN_BASE -
            RESILIENCE_SCALE * Math.pow(player.resilience, RESILIENCE_POWER) +
            frustPressure -
            dopamineBonus
        )
      );

      if (rng() < churnP) {
        player.churned = true;
        player.churnDay = day;
        churnedOnDay[day]++;

        if (events.length < MAX_EVENTS) {
          const isFrustrated = player.frustration > player.dopamine * 1.1;
          const isBored = player.dopamine < 0.4;
          const category = isFrustrated
            ? "frustrated"
            : isBored
              ? "bored"
              : "casual";
          events.push({
            agentId: player.id,
            day: day + 1,
            type: "churn",
            message: pick(CHURN_REASONS[category], rng),
          });
        }
      } else if (
        events.length < MAX_EVENTS &&
        player.dopamine > 1.1 &&
        rng() < 0.006
      ) {
        events.push({
          agentId: player.id,
          day: day + 1,
          type: "engaged",
          message: `High engagement sustained. Dopamine: ${player.dopamine.toFixed(2)}`,
        });
      }
    }
  }

  const curve: DayRetention[] = [];
  let retained = PLAYER_COUNT;

  for (let day = 0; day < DAYS; day++) {
    retained = Math.max(0, retained - churnedOnDay[day]);
    curve.push({
      day: day + 1,
      retained,
      pct: Math.round((retained / PLAYER_COUNT) * 1000) / 10,
    });
  }

  const d1 = curve[0]?.pct ?? 100;
  const d7 = curve[6]?.pct ?? 100;
  const d30 = curve[29]?.pct ?? 100;

  return { d1, d7, d30, curve, churned: churnedOnDay, events };
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
