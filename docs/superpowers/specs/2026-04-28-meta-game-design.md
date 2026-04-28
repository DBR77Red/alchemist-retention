# Retention Alchemist — Meta-Game Design Spec

**Date:** 2026-04-28
**Status:** Approved

---

## Overview

Transform Retention Alchemist from a pure simulation dashboard into a meta-game where the player acts as a game designer being evaluated. The game adds a Career Mode with 6 progressive challenges, a letter-grade system, and a full revenue layer to the Monte Carlo simulation engine. A Sandbox mode preserves the original free-play experience.

---

## 1. Architecture

### Routing

React Router v6 is added with three routes. No backend is required for this phase — all state persists in localStorage. The architecture is designed so that the persistence layer can be swapped for API calls in a future phase without structural changes.

| Route | Component | Purpose |
|---|---|---|
| `/` | `CareerHub.tsx` | Challenge progression board |
| `/challenge/:id` | `ChallengePage.tsx` | Active challenge with brief + grade overlay |
| `/sandbox` | `Dashboard.tsx` (existing) | Free-play simulation, no objectives |

### Context Layer

- **`ChallengeContext`** (new) — wraps the entire app; stores `unlockedChallenges: string[]` and `bestGrades: Record<string, Grade>` in localStorage. Exposes `activeChallengeId`, unlock/grade mutation functions.
- **`SimulationContext`** (extended) — gains three new config fields and five new result fields for revenue. Existing API unchanged.

### New Files

| File | Purpose |
|---|---|
| `src/data/challengeSpecs.ts` | 6 challenge definitions — brief, available sliders, grading thresholds, metric weights |
| `src/services/gradeEngine.ts` | Pure function: `SimulationResult + ChallengeSpec → GradeResult` |
| `src/context/ChallengeContext.tsx` | Unlock state, best grades, localStorage persistence |
| `src/pages/CareerHub.tsx` | 6-card grid, rank bar, sandbox entry |
| `src/pages/ChallengePage.tsx` | Brief header + Dashboard + grade overlay |
| `src/router.tsx` | React Router v6 route definitions |

### Modified Files

| File | Change |
|---|---|
| `src/services/simulationEngine.ts` | Revenue fields on `PlayerState` + `SimulationResult`, 3 new config params |
| `src/context/SimulationContext.tsx` | Expose new result/config fields |
| `src/pages/Dashboard.tsx` | Revenue metrics row, 3 new sliders, locked slider display |
| `src/main.tsx` | Wrap in `RouterProvider` + `ChallengeContext` |

---

## 2. Simulation Engine Extension

### New Config Fields (`SimulationConfig`)

| Field | Range | Default | Description |
|---|---|---|---|
| `ecpm` | 0–20 | 5 | Ad revenue per 1,000 impressions ($) |
| `iapRate` | 0–100 | 20 | Base % probability a player ever converts to payer |
| `avgPurchaseValue` | 1–50 | 5 | Average $ per IAP transaction |

### New Player State Fields (`PlayerState`)

- `spent: number` — cumulative IAP spend for this player
- `hasPurchased: boolean` — whether the player has converted at all

### Revenue Tick Logic

Each tick, for a non-churned player: if `dopamine > 0.7`, the player has an `iapRate`-derived probability (scaled by dopamine) of making a purchase of `avgPurchaseValue`. Ad revenue accrues each day a player stays retained, proportional to `adFrequency × ecpm / 1000`.

### New Result Fields (`SimulationResult`)

| Field | Definition |
|---|---|
| `arpu` | Total revenue ÷ 1,000 players |
| `arppu` | Total revenue ÷ number of paying players |
| `ltv` | Average revenue per player weighted by days retained before churn |
| `iapConvRate` | % of 1,000 players who ever purchased |
| `adRevTotal` | Total ad revenue across all retained player-days |
| `lootSpikeCount` | Total loot spike events recorded across all players (derived from `events` array, type = "loot") |

---

## 3. Challenge Spec System

Each `ChallengeSpec` in `challengeSpecs.ts` defines:

```typescript
interface ChallengeSpec {
  id: string;
  level: number;
  archetype: string;
  label: string;
  brief: string;
  availableSliders: (keyof SimulationConfig)[];
  lockedSliderValues?: Partial<SimulationConfig>; // forced values (e.g. adFrequency=0 for SUB)
  gradingDimensions: GradingDimension[];
  dimensionWeights: Record<string, number>;
}

interface GradingDimension {
  metric: keyof SimulationResult;
  thresholds: { S: number; A: number; B: number; C: number }; // C = pass threshold
}
```

### Grade Calculation (`gradeEngine.ts`)

1. For each `GradingDimension`, compare `result[metric]` against thresholds → letter grade per metric
2. Convert letter grades to numeric (S=5, A=4, B=3, C=2, F=1)
3. Compute weighted average using `dimensionWeights`
4. Convert back to letter grade → overall grade
5. Overall ≥ C → challenge passed → next challenge unlocked

---

## 4. The 6 Challenges

### Slider Progression

| Level | Archetype | Available Sliders (cumulative) | New This Level |
|---|---|---|---|
| 1 | HC | rewardRate, lootFrequency, adFrequency, ecpm | — (starting set) |
| 2 | PZL | + dailyBonus | dailyBonus |
| 3 | IDLE | + energyCost | energyCost |
| 4 | MID | + shopPrice, iapRate | shopPrice, iapRate |
| 5 | GTCH | + avgPurchaseValue | avgPurchaseValue |
| 6 | SUB | all 9 (adFrequency locked to 0) | full control |

Locked sliders are visible in the GOD CONSOLE but greyed out with a lock icon and a hint showing which level unlocks them.

### Challenge Definitions

**Level 1 — Hypercasual (HC)**
Brief: Mass-market casual game. Revenue is purely ad-driven. No one pays — but millions play for 30 seconds. Your job: maximize reach and ad yield without destroying Day 1 retention.
Graded on: D1 Retention (40%), Ad Revenue (40%), ARPU (20%)
Win thresholds (C): D1 ≥ 35%, Ad Revenue ≥ $0.04/user, ARPU ≥ $0.08

**Level 2 — Casual Puzzle (PZL)**
Brief: A match-3 for the masses. Heavy ads, a hint shop for stuck players. High D1 is non-negotiable — your UA budget depends on it. Add just enough IAP to move the needle.
Graded on: D1 Retention (35%), Ad Revenue (30%), IAP Conversion (35%)
Win thresholds (C): D1 ≥ 42%, Ad Revenue ≥ $0.06/user, IAP conv ≥ 1%

**Level 3 — Idle / Incremental (IDLE)**
Brief: An idle RPG where numbers go up forever. Players expect a satisfying daily bonus and zero frustration. Revenue comes from light IAP — players who love the loop will spend eventually. Kill the energy walls.
Graded on: D7 Retention (30%), D30 Retention (30%), LTV (20%), ARPU (20%)
Win thresholds (C): D7 ≥ 14%, D30 ≥ 4%, LTV ≥ $0.50, ARPU ≥ $0.25

**Level 4 — Mid-Core RPG (MID)**
Brief: A guild-based RPG with energy gates and a hero shop. Players expect some friction — that's the genre — but frustration must stay controlled. IAP conversion is the KPI your publisher cares about.
Graded on: D7 Retention (25%), ARPPU (40%), IAP Conversion (35%)
Win thresholds (C): D7 ≥ 18%, ARPPU ≥ $8, IAP conv ≥ 2%

**Level 5 — Gacha (GTCH)**
Brief: A collectible card game where rare pulls drive everything. Your whales carry the revenue — but only if you keep them dopamine-spiked and retained long enough to spend big. The loot cadence is your most important dial.
Graded on: ARPPU (40%), D30 Retention (30%), Loot Events (30%)
Win thresholds (C): ARPPU ≥ $15, D30 ≥ 5%, loot spike events ≥ 8

**Level 6 — Subscription (SUB)**
Brief: A premium idle game with a $4.99/month subscription. Zero ads — ever. Revenue lives or dies on 30-day retention. Players who churn don't renew. adFrequency is locked to zero. This is the hardest challenge.
Graded on: D30 Retention (40%), LTV (40%), ARPPU (20%)
Win thresholds (C): D30 ≥ 12%, LTV ≥ $4, ARPPU ≥ $4.99

---

## 5. Career Hub UI (`/`)

- **Rank bar** at top: Junior Designer (0–2 cleared) → Senior Designer (3–4 cleared) → Game Director (5–6 cleared), progressing with challenges cleared
- **6-card grid**: each card shows level, archetype label, brief teaser, best grade (if cleared), and CTA (Start / Retry / Locked)
- **Card states**: Complete (green border + grade), Active (cyan border + glow), Locked (greyed out, unlock hint)
- **Sandbox entry** at bottom: no objectives, all 9 sliders, free experimentation

---

## 6. Challenge Page UI (`/challenge/:id`)

- **Brief header**: level number, archetype, brief text, win conditions table, unlocked slider count
- **GOD CONSOLE**: same layout as Dashboard, locked sliders greyed with lock icon
- **Results panel**: same simulation output + new revenue metrics row (ARPU, ARPPU, LTV, IAP conv%, Ad Rev)
- **Grade overlay** (after simulation): per-metric grade cards, overall grade, pass/fail status, CTA buttons (Next Challenge / Retry for S / Career Hub)

---

## 7. Future Phase — Hybrid Challenges

After all 6 base challenges are cleared, a 7th "tier" unlocks: Hybrid Briefs that combine two archetypes (e.g., Idle + Gacha, Casual Puzzle + Subscription). All 9 sliders available, graded against blended thresholds from both archetypes. No architecture changes required — hybrid entries are additional `ChallengeSpec` objects with blended `gradingDimensions` and `dimensionWeights`.

---

## 8. Out of Scope (This Phase)

- Backend / API persistence (designed for in future phase via persistence interface abstraction)
- Global leaderboards
- Cross-device sync
- Archetype blend sliders (Option 3)
- Social / sharing features
