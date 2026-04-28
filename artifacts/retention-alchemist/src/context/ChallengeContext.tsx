import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Grade } from "@/data/challengeSpecs";
import { getRank, CHALLENGE_SPECS } from "@/data/challengeSpecs";

const UNLOCKED_KEY = "ra_unlocked_challenges";
const GRADES_KEY = "ra_best_grades";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return fallback;
}

function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

interface ChallengeContextValue {
  unlockedIds: string[];
  bestGrades: Record<string, Grade>;
  isUnlocked: (id: string) => boolean;
  getBestGrade: (id: string) => Grade | null;
  recordGrade: (id: string, grade: Grade, passed: boolean) => void;
  rank: string;
  clearedCount: number;
}

const ChallengeContext = createContext<ChallengeContextValue | null>(null);

const GRADE_NUMERIC: Record<Grade, number> = { S: 5, A: 4, B: 3, C: 2, F: 1 };

export function ChallengeProvider({ children }: { children: ReactNode }) {
  // Level 1 (hc) is always unlocked
  const [unlockedIds, setUnlockedIds] = useState<string[]>(() =>
    load(UNLOCKED_KEY, ["hc"])
  );
  const [bestGrades, setBestGrades] = useState<Record<string, Grade>>(() =>
    load(GRADES_KEY, {})
  );

  const isUnlocked = useCallback(
    (id: string) => unlockedIds.includes(id),
    [unlockedIds]
  );

  const getBestGrade = useCallback(
    (id: string): Grade | null => bestGrades[id] ?? null,
    [bestGrades]
  );

  const recordGrade = useCallback(
    (id: string, grade: Grade, passed: boolean) => {
      setBestGrades((prev) => {
        const existing = prev[id];
        const isBetter =
          !existing || GRADE_NUMERIC[grade] > GRADE_NUMERIC[existing];
        const next = isBetter ? { ...prev, [id]: grade } : prev;
        save(GRADES_KEY, next);
        return next;
      });

      if (passed) {
        const current = CHALLENGE_SPECS.find((s) => s.id === id);
        const next = CHALLENGE_SPECS.find((s) => s.level === (current?.level ?? 0) + 1);
        if (next) {
          setUnlockedIds((prev) => {
            if (prev.includes(next.id)) return prev;
            const updated = [...prev, next.id];
            save(UNLOCKED_KEY, updated);
            return updated;
          });
        }
      }
    },
    []
  );

  const clearedCount = Object.values(bestGrades).filter(
    (g) => GRADE_NUMERIC[g] >= GRADE_NUMERIC["C"]
  ).length;

  const rank = getRank(clearedCount);

  return (
    <ChallengeContext.Provider
      value={{ unlockedIds, bestGrades, isUnlocked, getBestGrade, recordGrade, rank, clearedCount }}
    >
      {children}
    </ChallengeContext.Provider>
  );
}

export function useChallenge(): ChallengeContextValue {
  const ctx = useContext(ChallengeContext);
  if (!ctx) throw new Error("useChallenge must be used within ChallengeProvider");
  return ctx;
}
