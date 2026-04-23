# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Retention Alchemist (`artifacts/retention-alchemist`)
- **Type**: react-vite (React + Vite web app)
- **Preview path**: `/`
- **Description**: Monte Carlo simulation dashboard for game designers to model monetization vs. retention
- **Key files**:
  - `src/services/simulationEngine.ts` — Pure TS Monte Carlo engine (1,000 agents, 30-day, tick-based Dopamine/Frustration)
  - `src/context/SimulationContext.tsx` — React context with localStorage persistence
  - `src/pages/Dashboard.tsx` — Bauhaus terminal dashboard with sliders, D1/D7/D30 metrics, Recharts retention curve
  - `src/index.css` — Terminal aesthetic (JetBrains Mono, phosphor green/red, zero border-radius)
- **Features**: Faucet/Sink sliders, D1/D7/D30 retention metrics, 30-day area chart, daily churn bar chart, localStorage state persistence, mobile-responsive

### API Server (`artifacts/api-server`)
- **Type**: Express 5 API
- **Preview path**: `/api`

### Canvas / Mockup Sandbox (`artifacts/mockup-sandbox`)
- **Type**: Component preview server
- **Preview path**: `/__mockup`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
