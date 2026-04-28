import type { SimulationResult } from "@/services/simulationEngine";
import type { ChallengeSpec, Grade, GradingDimension } from "@/data/challengeSpecs";

export interface DimensionGradeResult {
  metric: string;
  label: string;
  value: number;
  grade: Grade;
  thresholds: { S: number; A: number; B: number; C: number };
}

export interface GradeResult {
  dimensions: DimensionGradeResult[];
  overall: Grade;
  passed: boolean;
}

const GRADE_NUMERIC: Record<Grade, number> = { S: 5, A: 4, B: 3, C: 2, F: 1 };
const NUMERIC_GRADE: [number, Grade][] = [
  [4.5, "S"],
  [3.5, "A"],
  [2.5, "B"],
  [1.5, "C"],
  [0, "F"],
];

function gradeMetric(value: number, dim: GradingDimension): Grade {
  const { S, A, B, C } = dim.thresholds;
  if (value >= S) return "S";
  if (value >= A) return "A";
  if (value >= B) return "B";
  if (value >= C) return "C";
  return "F";
}

function numericToGrade(n: number): Grade {
  return NUMERIC_GRADE.find(([threshold]) => n >= threshold)?.[1] ?? "F";
}

export function gradeSimulation(result: SimulationResult, spec: ChallengeSpec): GradeResult {
  const dimensions: DimensionGradeResult[] = spec.gradingDimensions.map((dim) => {
    const value = result[dim.metric] as number;
    const grade = gradeMetric(value, dim);
    return { metric: dim.metric, label: dim.label, value, grade, thresholds: dim.thresholds };
  });

  const totalWeight = Object.values(spec.dimensionWeights).reduce((s, w) => s + w, 0);
  const weightedSum = dimensions.reduce((s, d) => {
    const w = spec.dimensionWeights[d.metric as keyof typeof spec.dimensionWeights] ?? 0;
    return s + (GRADE_NUMERIC[d.grade] * w) / totalWeight;
  }, 0);

  const overall = numericToGrade(weightedSum);
  const passed = overall !== "F" && GRADE_NUMERIC[overall] >= GRADE_NUMERIC["C"];

  return { dimensions, overall, passed };
}
