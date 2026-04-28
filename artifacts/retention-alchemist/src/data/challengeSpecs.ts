import type { SimulationConfig, SimulationResult } from "@/services/simulationEngine";

export type Grade = "S" | "A" | "B" | "C" | "F";

export interface GradingDimension {
  metric: keyof Pick<
    SimulationResult,
    "d1" | "d7" | "d30" | "arpu" | "arppu" | "ltv" | "iapConvRate" | "adRevTotal"
  >;
  label: string;
  thresholds: { S: number; A: number; B: number; C: number };
}

export interface ChallengeSpec {
  id: string;
  level: number;
  archetype: string;
  label: string;
  brief: string;
  availableSliders: (keyof SimulationConfig)[];
  lockedSliderValues?: Partial<SimulationConfig>;
  gradingDimensions: GradingDimension[];
  dimensionWeights: Partial<Record<GradingDimension["metric"], number>>;
}

// Threshold calibration notes:
// Revenue formula: adRev per fired ad = ecpm * 0.001 dollars
// IAP: conversionDay model → exact iapRate% conversion (dopamine-weighted, actual ~80% of iapRate)
// All $ values are per-player (ARPU, LTV) or per-paying-player (ARPPU)
// adRevTotal is total $ across all 1000 players

export const CHALLENGE_SPECS: ChallengeSpec[] = [
  {
    id: "hc",
    level: 1,
    archetype: "HYPERCASUAL",
    label: "Hypercasual",
    brief:
      "Mass-market casual game. Revenue is purely ad-driven — no one pays, but millions play for 30 seconds. Maximise ad yield without destroying Day 1 retention. Crank the ads too high and players rage-quit. Too low and the publisher walks.",
    availableSliders: ["rewardRate", "lootFrequency", "adFrequency", "ecpm"],
    gradingDimensions: [
      {
        metric: "d1",
        label: "D1 Retention",
        thresholds: { S: 54, A: 48, B: 42, C: 35 },
      },
      {
        metric: "adRevTotal",
        label: "Ad Revenue ($)",
        thresholds: { S: 16, A: 9, B: 4, C: 1.0 },
      },
      {
        metric: "arpu",
        label: "ARPU ($)",
        thresholds: { S: 0.035, A: 0.020, B: 0.010, C: 0.003 },
      },
    ],
    dimensionWeights: { d1: 0.4, adRevTotal: 0.4, arpu: 0.2 },
  },
  {
    id: "pzl",
    level: 2,
    archetype: "CASUAL PUZZLE",
    label: "Casual Puzzle",
    brief:
      "A match-3 for the masses. Heavy ads, a hint shop for stuck players. High D1 is non-negotiable — your UA budget depends on it. Add just enough IAP to keep the publisher happy without scaring off casual players.",
    availableSliders: ["rewardRate", "lootFrequency", "adFrequency", "ecpm", "dailyBonus"],
    gradingDimensions: [
      {
        metric: "d1",
        label: "D1 Retention",
        thresholds: { S: 58, A: 53, B: 48, C: 42 },
      },
      {
        metric: "iapConvRate",
        label: "IAP Conv %",
        thresholds: { S: 5.0, A: 3.0, B: 1.5, C: 0.5 },
      },
      {
        metric: "adRevTotal",
        label: "Ad Revenue ($)",
        thresholds: { S: 20, A: 11, B: 5, C: 1.5 },
      },
    ],
    dimensionWeights: { d1: 0.35, iapConvRate: 0.35, adRevTotal: 0.3 },
  },
  {
    id: "idle",
    level: 3,
    archetype: "IDLE / INCREMENTAL",
    label: "Idle / Incremental",
    brief:
      "An idle RPG where numbers go up forever. Players expect a satisfying daily bonus and near-zero frustration. Revenue comes from light IAP — players who love the loop will spend eventually. Kill the energy walls or they leave silently.",
    availableSliders: [
      "rewardRate",
      "lootFrequency",
      "adFrequency",
      "ecpm",
      "dailyBonus",
      "energyCost",
    ],
    gradingDimensions: [
      {
        metric: "d7",
        label: "D7 Retention",
        thresholds: { S: 27, A: 22, B: 18, C: 14 },
      },
      {
        metric: "d30",
        label: "D30 Retention",
        thresholds: { S: 11, A: 8, B: 6, C: 4 },
      },
      {
        metric: "iapConvRate",
        label: "IAP Conv %",
        thresholds: { S: 10, A: 6, B: 3, C: 1 },
      },
      {
        metric: "arpu",
        label: "ARPU ($)",
        thresholds: { S: 0.50, A: 0.30, B: 0.15, C: 0.05 },
      },
    ],
    dimensionWeights: { d7: 0.3, d30: 0.3, iapConvRate: 0.2, arpu: 0.2 },
  },
  {
    id: "mid",
    level: 4,
    archetype: "MID-CORE RPG",
    label: "Mid-Core RPG",
    brief:
      "A guild-based RPG with energy gates and a hero shop. Players expect some friction — that's the genre — but frustration must stay controlled. IAP conversion is the KPI your publisher cares about. Tune the energy cost carefully.",
    availableSliders: [
      "rewardRate",
      "lootFrequency",
      "adFrequency",
      "ecpm",
      "dailyBonus",
      "energyCost",
      "shopPrice",
      "iapRate",
    ],
    gradingDimensions: [
      {
        metric: "d7",
        label: "D7 Retention",
        thresholds: { S: 31, A: 26, B: 22, C: 18 },
      },
      {
        metric: "arppu",
        label: "ARPPU ($)",
        thresholds: { S: 16, A: 10, B: 6, C: 3 },
      },
      {
        metric: "iapConvRate",
        label: "IAP Conv %",
        thresholds: { S: 11, A: 7, B: 4, C: 2 },
      },
    ],
    dimensionWeights: { d7: 0.25, arppu: 0.4, iapConvRate: 0.35 },
  },
  {
    id: "gtch",
    level: 5,
    archetype: "GACHA",
    label: "Gacha",
    brief:
      "A collectible card game where rare pulls drive everything. Your whales carry the revenue — but only if you keep them dopamine-spiked and retained long enough to spend big. The loot cadence and purchase value are your most important dials.",
    availableSliders: [
      "rewardRate",
      "lootFrequency",
      "adFrequency",
      "ecpm",
      "dailyBonus",
      "energyCost",
      "shopPrice",
      "iapRate",
      "avgPurchaseValue",
    ],
    gradingDimensions: [
      {
        metric: "arppu",
        label: "ARPPU ($)",
        thresholds: { S: 40, A: 25, B: 15, C: 8 },
      },
      {
        metric: "d30",
        label: "D30 Retention",
        thresholds: { S: 14, A: 10, B: 7, C: 5 },
      },
      {
        metric: "arpu",
        label: "ARPU ($)",
        thresholds: { S: 1.0, A: 0.6, B: 0.35, C: 0.15 },
      },
    ],
    dimensionWeights: { arppu: 0.4, d30: 0.3, arpu: 0.3 },
  },
  {
    id: "sub",
    level: 6,
    archetype: "SUBSCRIPTION",
    label: "Subscription",
    brief:
      "A premium idle game with a $4.99/month subscription. Zero ads — ever. Revenue lives or dies on 30-day retention. Players who churn don't renew. Ad frequency is locked to zero. This is the hardest challenge: no ad crutch, no cheap tricks.",
    availableSliders: [
      "rewardRate",
      "lootFrequency",
      "dailyBonus",
      "energyCost",
      "shopPrice",
      "iapRate",
      "avgPurchaseValue",
    ],
    lockedSliderValues: { adFrequency: 0 },
    gradingDimensions: [
      {
        metric: "d30",
        label: "D30 Retention",
        thresholds: { S: 25, A: 20, B: 16, C: 12 },
      },
      {
        metric: "ltv",
        label: "LTV ($)",
        thresholds: { S: 1.5, A: 0.9, B: 0.5, C: 0.2 },
      },
      {
        metric: "arppu",
        label: "ARPPU ($)",
        thresholds: { S: 18, A: 12, B: 8, C: 4.99 },
      },
    ],
    dimensionWeights: { d30: 0.4, ltv: 0.4, arppu: 0.2 },
  },
];

export function getSpecById(id: string): ChallengeSpec | undefined {
  return CHALLENGE_SPECS.find((s) => s.id === id);
}

export function getNextSpec(id: string): ChallengeSpec | undefined {
  const current = CHALLENGE_SPECS.find((s) => s.id === id);
  if (!current) return undefined;
  return CHALLENGE_SPECS.find((s) => s.level === current.level + 1);
}

export const CAREER_RANKS = [
  { label: "Junior Designer", minCleared: 0 },
  { label: "Senior Designer", minCleared: 3 },
  { label: "Game Director", minCleared: 5 },
];

export function getRank(clearedCount: number): string {
  const rank = [...CAREER_RANKS].reverse().find((r) => clearedCount >= r.minCleared);
  return rank?.label ?? "Junior Designer";
}
