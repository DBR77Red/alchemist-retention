import { useLocation } from "wouter";
import { useChallenge } from "@/context/ChallengeContext";
import { CHALLENGE_SPECS } from "@/data/challengeSpecs";
import type { Grade } from "@/data/challengeSpecs";

const GRADE_COLORS: Record<Grade, string> = {
  S: "#39ff14",
  A: "#39ff14",
  B: "#ffb700",
  C: "#ffb700",
  F: "#ff4d6d",
};

export default function CareerHub() {
  const [, navigate] = useLocation();
  const { isUnlocked, getBestGrade, rank, clearedCount } = useChallenge();

  const rankProgress = Math.min((clearedCount / 6) * 100, 100);

  return (
    <div className="career-hub">
      <header className="dashboard-header">
        <div className="header-inner">
          <div className="header-brand">
            <span className="brand-prefix">{">"}_</span>
            <span className="brand-name">RETENTION ALCHEMIST</span>
            <span className="brand-version">v4.0</span>
          </div>
          <div className="header-meta">CAREER MODE · META-GAME · DESIGN YOUR GAME</div>
        </div>
      </header>

      <main className="hub-body">
        <div className="hub-rank-bar">
          <div className="hub-rank-label">
            <span className="hub-rank-title">{rank.toUpperCase()}</span>
            <span className="hub-rank-progress">{clearedCount} / 6 CHALLENGES CLEARED</span>
          </div>
          <div className="hub-rank-track">
            <div className="hub-rank-fill" style={{ width: `${rankProgress}%` }} />
          </div>
        </div>

        <div className="hub-grid">
          {CHALLENGE_SPECS.map((spec) => {
            const unlocked = isUnlocked(spec.id);
            const bestGrade = getBestGrade(spec.id);
            const cleared = bestGrade !== null;

            return (
              <div
                key={spec.id}
                className={`challenge-card ${cleared ? "challenge-card--complete" : unlocked ? "challenge-card--active" : "challenge-card--locked"}`}
                data-testid={`challenge-card-${spec.id}`}
              >
                <div className="challenge-card-level">
                  LEVEL {spec.level} ·{" "}
                  {cleared ? "COMPLETE" : unlocked ? "ACTIVE ◉" : "LOCKED"}
                </div>
                <div className="challenge-card-name">{spec.label.toUpperCase()}</div>
                <div className="challenge-card-brief">
                  {spec.brief.slice(0, 80)}…
                </div>

                {cleared && bestGrade && (
                  <div className="challenge-card-grade-row">
                    <span className="challenge-card-grade-label">BEST</span>
                    <span
                      className="challenge-card-grade"
                      style={{ color: GRADE_COLORS[bestGrade] }}
                    >
                      {bestGrade}
                    </span>
                  </div>
                )}

                {!unlocked && (
                  <div className="challenge-card-locked-hint">
                    🔒 Clear Level {spec.level - 1} to unlock
                  </div>
                )}

                {unlocked && (
                  <button
                    className="challenge-card-cta"
                    onClick={() => navigate(`/challenge/${spec.id}`)}
                    data-testid={`btn-start-${spec.id}`}
                  >
                    {cleared ? `↺ RETRY FOR ${bestGrade === "S" ? "FUN" : "S"}` : "▶ START CHALLENGE"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="hub-sandbox-row">
          <div className="hub-sandbox-info">
            <div className="hub-sandbox-label">FREE PLAY</div>
            <div className="hub-sandbox-name">SANDBOX MODE</div>
            <div className="hub-sandbox-sub">All 9 sliders. No objectives. Pure experimentation.</div>
          </div>
          <button
            className="hub-sandbox-btn"
            onClick={() => navigate("/sandbox")}
            data-testid="btn-sandbox"
          >
            ENTER SANDBOX →
          </button>
        </div>
      </main>
    </div>
  );
}
