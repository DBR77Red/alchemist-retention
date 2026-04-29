import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useChallenge } from "@/context/ChallengeContext";
import { useSimulation } from "@/context/SimulationContext";
import { getSpecById, getNextSpec } from "@/data/challengeSpecs";
import { gradeSimulation } from "@/services/gradeEngine";
import type { GradeResult } from "@/services/gradeEngine";
import type { Grade } from "@/data/challengeSpecs";
import Dashboard from "@/pages/Dashboard";

const GRADE_COLORS: Record<Grade, string> = {
  S: "#39ff14",
  A: "#39ff14",
  B: "#ffb700",
  C: "#ffb700",
  F: "#ff4d6d",
};

export default function ChallengePage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { isUnlocked, recordGrade } = useChallenge();
  const { result, configDirty } = useSimulation();
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const [gradedResultId, setGradedResultId] = useState<string | null>(null);

  const spec = getSpecById(id ?? "");
  const nextSpec = spec ? getNextSpec(spec.id) : undefined;

  // Redirect to hub if spec not found or not unlocked
  useEffect(() => {
    if (!spec || !isUnlocked(spec.id)) {
      navigate("/");
    }
  }, [spec, isUnlocked, navigate]);

  // Auto-grade when a fresh simulation result arrives
  useEffect(() => {
    if (!result || !spec || configDirty) return;
    const resultId = `${result.d1}-${result.d7}-${result.d30}-${result.arpu}`;
    if (resultId === gradedResultId) return;
    const gr = gradeSimulation(result, spec);
    setGradeResult(gr);
    setGradedResultId(resultId);
    recordGrade(spec.id, gr.overall, gr.passed);
  }, [result, spec, configDirty, gradedResultId, recordGrade]);

  if (!spec) return null;

  return (
    <div className="challenge-page">
      {/* Brief header */}
      <div className="challenge-brief-header">
        <div className="challenge-brief-inner">
          <div className="challenge-brief-meta">
            <span className="challenge-brief-level">LEVEL {spec.level}</span>
            <span className="challenge-brief-arch">{spec.archetype}</span>
            <span className="challenge-brief-sliders">
              {spec.availableSliders.length} / 9 SLIDERS
            </span>
          </div>
          <div className="challenge-brief-text">{spec.brief}</div>
          <div className="challenge-brief-targets">
            {spec.gradingDimensions.map((dim) => (
              <div key={dim.metric} className="challenge-brief-target">
                <span className="challenge-brief-target-label">{dim.label}</span>
                <span className="challenge-brief-target-thresholds">
                  S≥{dim.thresholds.S} · A≥{dim.thresholds.A} · B≥{dim.thresholds.B} · C≥{dim.thresholds.C}
                </span>
              </div>
            ))}
          </div>
        </div>
        <button
          className="challenge-brief-back"
          onClick={() => navigate("/")}
          data-testid="btn-back-to-hub"
        >
          ← CAREER HUB
        </button>
      </div>

      {/* Existing Dashboard with challenge spec injected */}
      <Dashboard challengeSpec={spec} />

      {/* Grade overlay */}
      {gradeResult && result && !configDirty && (
        <div className="grade-overlay" data-testid="grade-overlay">
          <div className="grade-overlay-panel">
            <div className="grade-overlay-title">SIMULATION GRADED</div>

            <div className="grade-dimensions">
              {gradeResult.dimensions.map((d) => (
                <div key={d.metric} className="grade-dimension-card">
                  <div className="grade-dimension-label">{d.label}</div>
                  <div
                    className="grade-dimension-grade"
                    style={{ color: GRADE_COLORS[d.grade] }}
                  >
                    {d.grade}
                  </div>
                  <div className="grade-dimension-value">
                    {typeof d.value === "number" && d.value < 1
                      ? `$${d.value.toFixed(3)}`
                      : d.value >= 1 && d.value < 100
                      ? `${d.value.toFixed(1)}`
                      : `${d.value.toFixed(1)}%`}
                  </div>
                </div>
              ))}
            </div>

            <div className="grade-overall-row">
              <div>
                <div className="grade-overall-label">OVERALL GRADE</div>
                <div
                  className="grade-overall-value"
                  style={{ color: GRADE_COLORS[gradeResult.overall] }}
                >
                  {gradeResult.overall}
                </div>
                <div
                  className={`grade-overall-status ${gradeResult.passed ? "grade-pass" : "grade-fail"}`}
                >
                  {gradeResult.passed
                    ? nextSpec
                      ? `✓ PASSED — LEVEL ${nextSpec.level} UNLOCKED`
                      : "✓ PASSED — ALL CHALLENGES CLEARED"
                    : "✗ FAILED — GRADE C REQUIRED TO ADVANCE"}
                </div>
              </div>
              <div className="grade-cta-group">
                {gradeResult.passed && nextSpec && (
                  <button
                    className="grade-cta grade-cta--primary"
                    onClick={() => {
                      setGradeResult(null);
                      navigate(`/challenge/${nextSpec.id}`);
                    }}
                    data-testid="btn-next-challenge"
                  >
                    ▶ NEXT CHALLENGE
                  </button>
                )}
                <button
                  className="grade-cta grade-cta--secondary"
                  onClick={() => setGradeResult(null)}
                  data-testid="btn-retry"
                >
                  ↺ RETRY
                </button>
                <button
                  className="grade-cta grade-cta--tertiary"
                  onClick={() => navigate("/")}
                  data-testid="btn-hub"
                >
                  ⌂ CAREER HUB
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
