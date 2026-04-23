import { useState, useRef, useEffect } from "react";
import { useSimulation } from "@/context/SimulationContext";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Loader2 } from "lucide-react";

const FAUCET_COLOR = "#00ff9f";
const SINK_COLOR = "#ff4d6d";

function SliderRow({
  label,
  tooltip,
  value,
  min,
  max,
  step,
  onChange,
  accent,
  unit,
  testId,
}: {
  label: string;
  tooltip: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  accent: string;
  unit?: string;
  testId: string;
}) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!tooltipOpen) return;
    function handleOutside(e: MouseEvent) {
      if (labelRef.current && !labelRef.current.contains(e.target as Node)) {
        setTooltipOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [tooltipOpen]);

  return (
    <div className="slider-row" data-testid={testId}>
      <div className="slider-header">
        <span
          className="slider-label-wrap"
          ref={labelRef}
          onMouseEnter={() => setTooltipOpen(true)}
          onMouseLeave={() => setTooltipOpen(false)}
          onTouchStart={(e) => { e.preventDefault(); setTooltipOpen((v) => !v); }}
        >
          <span className="slider-label">{label}</span>
          <span className="slider-tooltip-icon" aria-label="Parameter info">?</span>
          {tooltipOpen && (
            <span className="slider-tooltip-box" role="tooltip">
              {tooltip}
            </span>
          )}
        </span>
        <span className="slider-value" style={{ color: accent }}>
          {value}
          {unit ?? "%"}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="terminal-slider"
        style={
          {
            "--thumb-color": accent,
            "--track-fill": accent,
          } as React.CSSProperties
        }
        data-testid={`${testId}-input`}
      />
      <div className="slider-track-labels">
        <span>{min}%</span>
        <span>{max}%</span>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
  testId,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  testId: string;
}) {
  return (
    <div className="metric-card" data-testid={testId}>
      <div className="metric-label">{label}</div>
      <div className="metric-value" data-testid={`${testId}-value`}>
        {value}
        {typeof value === "number" ? "%" : ""}
      </div>
      {subtitle && <div className="metric-subtitle">{subtitle}</div>}
    </div>
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <div className="chart-tooltip-day">DAY {label}</div>
        <div className="chart-tooltip-value">{payload[0].value.toFixed(1)}% RETAINED</div>
      </div>
    );
  }
  return null;
}

function SavePresetPanel() {
  const { result, configDirty, savePreset } = useSimulation();
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  const canSave = !!result && !configDirty;

  function handleSave() {
    if (!canSave) return;
    savePreset(name);
    setName("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="preset-save-panel" data-testid="preset-save-panel">
      <div className="preset-save-header">
        <span className="preset-save-icon">◈</span>
        <span className="preset-save-title">SAVE PRESET</span>
      </div>
      <div className="preset-save-row">
        <input
          type="text"
          className="preset-name-input"
          placeholder="preset name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          maxLength={40}
          disabled={!canSave}
          data-testid="preset-name-input"
        />
        <button
          className="preset-save-btn"
          onClick={handleSave}
          disabled={!canSave}
          data-testid="button-save-preset"
        >
          {saved ? "SAVED" : "SAVE"}
        </button>
      </div>
      {!result && (
        <div className="preset-save-hint">Run a simulation first to save a preset.</div>
      )}
      {result && configDirty && (
        <div className="preset-save-hint">Re-run simulation to save current settings.</div>
      )}
    </div>
  );
}

function PresetsPanel() {
  const { presets, loadPreset, deletePreset } = useSimulation();

  if (presets.length === 0) return null;

  return (
    <div className="presets-panel" data-testid="presets-panel">
      <div className="presets-panel-header">
        <span className="presets-panel-title">SAVED PRESETS</span>
        <span className="presets-panel-count">{presets.length} saved</span>
      </div>
      <div className="presets-list">
        {presets.map((preset) => (
          <div className="preset-row" key={preset.id} data-testid={`preset-row-${preset.id}`}>
            <div className="preset-row-top">
              <span className="preset-name" title={preset.name}>
                {preset.name}
              </span>
              <div className="preset-actions">
                <button
                  className="preset-load-btn"
                  onClick={() => loadPreset(preset.id)}
                  data-testid={`button-load-preset-${preset.id}`}
                  title="Load this preset into sliders"
                >
                  LOAD
                </button>
                <button
                  className="preset-delete-btn"
                  onClick={() => deletePreset(preset.id)}
                  data-testid={`button-delete-preset-${preset.id}`}
                  title="Delete preset"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="preset-metrics">
              <div className="preset-metric">
                <span className="preset-metric-label">D1</span>
                <span className="preset-metric-value">{preset.d1}%</span>
              </div>
              <div className="preset-metric">
                <span className="preset-metric-label">D7</span>
                <span className="preset-metric-value">{preset.d7}%</span>
              </div>
              <div className="preset-metric">
                <span className="preset-metric-label">D30</span>
                <span className="preset-metric-value">{preset.d30}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { config, result, isRunning, updateConfig, runSim } = useSimulation();

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-inner">
          <div className="header-brand">
            <span className="brand-prefix">{">"}</span>
            <span className="brand-name">RETENTION ALCHEMIST</span>
            <span className="brand-version">v2.0</span>
          </div>
          <div className="header-meta">MONTE CARLO ENGINE · 1000 AGENTS · 30-DAY CYCLE</div>
        </div>
      </header>

      <main className="dashboard-body">
        <aside className="controls-panel">
          <section className="control-section" data-testid="faucets-section">
            <div className="section-header faucet-header">
              <span className="section-icon">⬆</span>
              <span className="section-title">FAUCETS</span>
              <span className="section-sub">reward inputs</span>
            </div>

            <SliderRow
              label="REWARD RATE"
              tooltip="Chance per tick that a player earns a standard reward, raising their dopamine level. Higher values sustain engagement and slow natural dopamine decay."
              value={config.rewardRate}
              min={0}
              max={100}
              step={1}
              onChange={(v) => updateConfig({ rewardRate: v })}
              accent={FAUCET_COLOR}
              testId="slider-reward-rate"
            />
            <SliderRow
              label="LOOT FREQUENCY"
              tooltip="Probability per tick of a random loot drop, which delivers a larger dopamine spike than a standard reward. Loot creates excitement loops that keep players coming back."
              value={config.lootFrequency}
              min={0}
              max={100}
              step={1}
              onChange={(v) => updateConfig({ lootFrequency: v })}
              accent={FAUCET_COLOR}
              testId="slider-loot-frequency"
            />
            <SliderRow
              label="DAILY BONUS"
              tooltip="A dopamine boost granted at the start of each simulated day. Models login rewards that incentivize daily return visits from players."
              value={config.dailyBonus}
              min={0}
              max={100}
              step={1}
              onChange={(v) => updateConfig({ dailyBonus: v })}
              accent={FAUCET_COLOR}
              testId="slider-daily-bonus"
            />
          </section>

          <div className="section-divider" />

          <section className="control-section" data-testid="sinks-section">
            <div className="section-header sink-header">
              <span className="section-icon">⬇</span>
              <span className="section-title">SINKS</span>
              <span className="section-sub">friction inputs</span>
            </div>

            <SliderRow
              label="ENERGY COST"
              tooltip="Chance per tick that an energy gate triggers a frustration increase. High energy costs make players feel blocked, accelerating churn when frustration exceeds dopamine."
              value={config.energyCost}
              min={0}
              max={100}
              step={1}
              onChange={(v) => updateConfig({ energyCost: v })}
              accent={SINK_COLOR}
              testId="slider-energy-cost"
            />
            <SliderRow
              label="SHOP PRICE"
              tooltip="A continuous frustration drain modeling the burden of in-game purchase prices. Higher values steadily erode player satisfaction over the 30-day cycle."
              value={config.shopPrice}
              min={0}
              max={100}
              step={1}
              onChange={(v) => updateConfig({ shopPrice: v })}
              accent={SINK_COLOR}
              testId="slider-shop-price"
            />
            <SliderRow
              label="AD FREQUENCY"
              tooltip="Probability per tick that a player sees an ad, raising their frustration level. Too many ads push frustration past the churn threshold and drive players to quit."
              value={config.adFrequency}
              min={0}
              max={100}
              step={1}
              onChange={(v) => updateConfig({ adFrequency: v })}
              accent={SINK_COLOR}
              testId="slider-ad-frequency"
            />
          </section>

          <button
            className="run-button"
            onClick={runSim}
            disabled={isRunning}
            data-testid="button-run-simulation"
          >
            {isRunning ? (
              <>
                <Loader2 className="spin-icon" size={16} />
                SIMULATING...
              </>
            ) : (
              <>
                <span className="run-arrow">▶</span>
                RUN SIMULATION
              </>
            )}
          </button>

          <div className="section-divider" />

          <SavePresetPanel />
        </aside>

        <section className="results-panel">
          <div className="metrics-row">
            <MetricCard
              label="D1 RETENTION"
              value={result ? result.d1 : "—"}
              subtitle="day 1"
              testId="metric-d1"
            />
            <MetricCard
              label="D7 RETENTION"
              value={result ? result.d7 : "—"}
              subtitle="day 7"
              testId="metric-d7"
            />
            <MetricCard
              label="D30 RETENTION"
              value={result ? result.d30 : "—"}
              subtitle="day 30"
              testId="metric-d30"
            />
          </div>

          <div className="chart-panel" data-testid="chart-retention">
            <div className="chart-header">
              <span className="chart-title">30-DAY RETENTION CURVE</span>
              {result && (
                <span className="chart-subtitle">
                  {PLAYER_COUNT_LABEL} agents simulated · {result.churned.reduce((a, b) => a + b, 0)} churned
                </span>
              )}
            </div>

            {result ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart
                  data={result.curve}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="retentionGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ff9f" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#00ff9f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1a1a1a"
                    horizontal
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "#4a4a4a", fontSize: 10, fontFamily: "monospace" }}
                    axisLine={{ stroke: "#222" }}
                    tickLine={false}
                    label={{
                      value: "DAY",
                      position: "insideBottom",
                      offset: -2,
                      fill: "#333",
                      fontSize: 9,
                      fontFamily: "monospace",
                    }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "#4a4a4a", fontSize: 10, fontFamily: "monospace" }}
                    axisLine={{ stroke: "#222" }}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="pct"
                    stroke="#00ff9f"
                    strokeWidth={2}
                    fill="url(#retentionGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#00ff9f", stroke: "#000" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">
                <div className="chart-empty-icon">⬡</div>
                <div className="chart-empty-text">
                  Configure parameters and run simulation to see results
                </div>
              </div>
            )}
          </div>

          {result && (
            <div className="churn-band" data-testid="churn-band">
              <div className="churn-band-label">DAILY CHURN DISTRIBUTION</div>
              <div className="churn-bars">
                {result.churned.map((count, i) => {
                  const maxChurn = Math.max(...result.churned, 1);
                  const pct = (count / maxChurn) * 100;
                  return (
                    <div
                      key={i}
                      className="churn-bar-wrap"
                      title={`Day ${i + 1}: ${count} churned`}
                      data-testid={`churn-bar-day-${i + 1}`}
                    >
                      <div
                        className="churn-bar"
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="churn-axis">
                <span>DAY 1</span>
                <span>DAY 15</span>
                <span>DAY 30</span>
              </div>
            </div>
          )}

          <PresetsPanel />
        </section>
      </main>

      <footer className="dashboard-footer">
        <span>DOPAMINE ↑ FRUSTRATION ↑ CHURN THRESHOLD: 1.4×</span>
        <span>1000 AGENTS · TICK RESOLUTION: 24/DAY</span>
      </footer>
    </div>
  );
}

const PLAYER_COUNT_LABEL = "1,000";
