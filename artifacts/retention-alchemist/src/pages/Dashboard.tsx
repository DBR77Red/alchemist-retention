import { useState, useRef, useEffect, useCallback } from "react";
import { useSimulation } from "@/context/SimulationContext";
import type { Preset } from "@/context/SimulationContext";
import type { AgentEvent } from "@/services/simulationEngine";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Loader2 } from "lucide-react";

const FAUCET_COLOR = "#39ff14";
const SINK_COLOR = "#ffb700";

const PRESET_COLORS = [
  "#39ff14",
  "#ffb700",
  "#00d4ff",
  "#ff4d6d",
  "#b4ff6e",
  "#ff9f00",
  "#7c85ff",
  "#ff6ec4",
];

const EVENT_COLORS: Record<AgentEvent["type"], string> = {
  churn: "#ff4d6d",
  loot: "#39ff14",
  spike: "#ffb700",
  engaged: "#00d4ff",
};

function SliderRow({
  label,
  tooltip,
  value,
  min,
  max,
  step,
  onChange,
  accent,
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
  testId: string;
}) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="slider-row" data-testid={testId}>
      <div className="slider-header">
        <span
          className="slider-label-wrap"
          onMouseEnter={() => setTooltipOpen(true)}
          onMouseLeave={() => setTooltipOpen(false)}
          onTouchStart={(e) => {
            e.preventDefault();
            setTooltipOpen((v) => !v);
          }}
        >
          <span className="slider-label">{label}</span>
          <span className="slider-tooltip-icon" aria-label="Parameter info">
            ?
          </span>
          {tooltipOpen && (
            <span className="slider-tooltip-box" role="tooltip">
              {tooltip}
              <span className="slider-tooltip-caret" />
            </span>
          )}
        </span>
        <span className="slider-value" style={{ color: accent }}>
          {value}%
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onTouchStart={() => setIsDragging(true)}
        onTouchEnd={() => setIsDragging(false)}
        className={`terminal-slider${isDragging ? " is-dragging" : ""}`}
        style={
          {
            "--thumb-color": accent,
          } as React.CSSProperties
        }
        data-testid={`${testId}-input`}
      />
      <div className="slider-track-labels">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
  benchmark,
  testId,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  benchmark?: string;
  testId: string;
}) {
  const numVal = typeof value === "number" ? value : null;
  const benchmarkNum = benchmark ? parseFloat(benchmark) : null;
  const isGood =
    numVal !== null && benchmarkNum !== null && numVal >= benchmarkNum;

  return (
    <div className="metric-card" data-testid={testId}>
      <div className="metric-label">{label}</div>
      <div
        className={`metric-value${numVal !== null ? (isGood ? " metric-good" : " metric-warn") : ""}`}
        data-testid={`${testId}-value`}
      >
        {value}
        {typeof value === "number" ? "%" : ""}
      </div>
      {subtitle && <div className="metric-subtitle">{subtitle}</div>}
      {benchmark && numVal !== null && (
        <div className={`metric-benchmark ${isGood ? "bench-good" : "bench-low"}`}>
          {isGood ? "▲" : "▼"} target {benchmark}%
        </div>
      )}
    </div>
  );
}

function RetentionTooltip({
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
        <div className="chart-tooltip-value">
          {payload[0].value.toFixed(1)}% RETAINED
        </div>
      </div>
    );
  }
  return null;
}

function LiveAgentFeed({ events }: { events: AgentEvent[] | undefined }) {
  const feedRef = useRef<HTMLDivElement>(null);
  const safeEvents = events ?? [];
  const reversed = [...safeEvents].reverse().slice(0, 40);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [events]);

  if (safeEvents.length === 0) return null;

  return (
    <div className="agent-feed" data-testid="agent-feed">
      <div className="agent-feed-header">
        <span className="agent-feed-icon">◉</span>
        <span className="agent-feed-title">LIVE AGENT FEED</span>
        <span className="agent-feed-count">{safeEvents.length} EVENTS</span>
      </div>
      <div className="agent-feed-log" ref={feedRef}>
        {reversed.map((ev, i) => (
          <div
            key={i}
            className={`feed-entry feed-${ev.type}`}
            data-testid={`feed-entry-${i}`}
          >
            <span className="feed-day">[D{ev.day.toString().padStart(2, "0")}]</span>
            <span
              className="feed-agent"
              style={{ color: EVENT_COLORS[ev.type] }}
            >
              Agent #{String(ev.agentId).padStart(4, "0")}
            </span>
            <span className="feed-msg">{ev.message}</span>
            <span className="feed-cursor" />
          </div>
        ))}
      </div>
    </div>
  );
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
        <div className="preset-save-hint">Run a simulation first.</div>
      )}
      {result && configDirty && (
        <div className="preset-save-hint">Re-run simulation first.</div>
      )}
    </div>
  );
}

function PresetNameEditor({ id, name }: { id: string; name: string }) {
  const { renamePreset } = useSimulation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) renamePreset(id, trimmed);
    else setDraft(name);
    setEditing(false);
  }, [draft, id, name, renamePreset]);

  const cancel = useCallback(() => {
    setDraft(name);
    setEditing(false);
  }, [name]);

  if (editing) {
    return (
      <div className="preset-name-editor">
        <input
          ref={inputRef}
          className="preset-rename-input"
          value={draft}
          maxLength={40}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          onBlur={commit}
          data-testid={`preset-rename-input-${id}`}
        />
        <button
          className="preset-rename-confirm-btn"
          onMouseDown={(e) => {
            e.preventDefault();
            commit();
          }}
          title="Confirm rename"
          data-testid={`button-rename-confirm-${id}`}
        >
          ✓
        </button>
      </div>
    );
  }

  return (
    <span
      className="preset-name preset-name-editable"
      title="Click to rename"
      onClick={() => {
        setDraft(name);
        setEditing(true);
      }}
      data-testid={`preset-name-${id}`}
    >
      {name}
      <span className="preset-edit-icon" aria-hidden="true">
        ✎
      </span>
    </span>
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
          <div
            className="preset-row"
            key={preset.id}
            data-testid={`preset-row-${preset.id}`}
          >
            <div className="preset-row-top">
              <PresetNameEditor id={preset.id} name={preset.name} />
              <div className="preset-actions">
                <button
                  className="preset-load-btn"
                  onClick={() => loadPreset(preset.id)}
                  data-testid={`button-load-preset-${preset.id}`}
                  title="Load this preset"
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

function CompareTooltip({
  active,
  payload,
  label,
  presets,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; fill: string }[];
  label?: string;
  presets: Preset[];
}) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-day">{label} RETENTION</div>
      {payload.map((entry) => {
        const preset = presets.find((p) => p.id === entry.dataKey);
        return (
          <div
            key={entry.dataKey}
            className="compare-tooltip-row"
            style={{ color: entry.fill }}
          >
            <span className="compare-tooltip-name">
              {preset?.name ?? entry.dataKey}
            </span>
            <span className="compare-tooltip-value">
              {entry.value?.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PresetsCompareChart() {
  const { presets } = useSimulation();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  if (presets.length < 2) return null;

  const chartData = [
    {
      metric: "D1",
      ...Object.fromEntries(
        presets.map((p) => [p.id, hidden.has(p.id) ? undefined : p.d1])
      ),
    },
    {
      metric: "D7",
      ...Object.fromEntries(
        presets.map((p) => [p.id, hidden.has(p.id) ? undefined : p.d7])
      ),
    },
    {
      metric: "D30",
      ...Object.fromEntries(
        presets.map((p) => [p.id, hidden.has(p.id) ? undefined : p.d30])
      ),
    },
  ];

  function togglePreset(id: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="compare-chart-panel" data-testid="compare-chart-panel">
      <div className="compare-chart-header">
        <span className="compare-chart-icon">◈</span>
        <span className="compare-chart-title">COMPARE PRESETS</span>
        <span className="compare-chart-sub">D1 · D7 · D30</span>
      </div>
      <div className="compare-toggles" data-testid="compare-toggles">
        {presets.map((preset, i) => {
          const color = PRESET_COLORS[i % PRESET_COLORS.length];
          const isHidden = hidden.has(preset.id);
          return (
            <button
              key={preset.id}
              className={`compare-toggle-btn${isHidden ? " compare-toggle-btn--hidden" : ""}`}
              style={{ "--accent": color } as React.CSSProperties}
              onClick={() => togglePreset(preset.id)}
              data-testid={`toggle-compare-${preset.id}`}
            >
              <span
                className="compare-toggle-swatch"
                style={{
                  background: isHidden ? "transparent" : color,
                  borderColor: color,
                }}
              />
              <span className="compare-toggle-label">{preset.name}</span>
            </button>
          );
        })}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
          barCategoryGap="28%"
          barGap={3}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#2a2a3a"
            horizontal
            vertical={false}
          />
          <XAxis
            dataKey="metric"
            tick={{ fill: "#666", fontSize: 10, fontFamily: "monospace" }}
            axisLine={{ stroke: "#2a2a3a" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "#555", fontSize: 10, fontFamily: "monospace" }}
            axisLine={{ stroke: "#2a2a3a" }}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            content={<CompareTooltip presets={presets} />}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          {presets.map((preset, i) => {
            if (hidden.has(preset.id)) return null;
            const color = PRESET_COLORS[i % PRESET_COLORS.length];
            return (
              <Bar
                key={preset.id}
                dataKey={preset.id}
                name={preset.name}
                fill={color}
                radius={[0, 0, 0, 0]}
                maxBarSize={32}
              />
            );
          })}
        </BarChart>
      </ResponsiveContainer>
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
            <span className="brand-prefix">{">"}_</span>
            <span className="brand-name">RETENTION ALCHEMIST</span>
            <span className="brand-version">v3.0</span>
          </div>
          <div className="header-meta">
            MONTE CARLO ENGINE · 1,000 AGENTS · 30-DAY CYCLE · LOG/EXP MODEL
          </div>
        </div>
      </header>

      <main className="dashboard-body">
        <aside className="controls-panel">
          <div className="panel-title-bar god-console-bar">
            <span className="panel-title-bracket">[</span>
            <span className="panel-title-text">GOD CONSOLE</span>
            <span className="panel-title-bracket">]</span>
          </div>

          <section className="control-section" data-testid="faucets-section">
            <div className="section-header faucet-header">
              <span className="section-icon">⬆</span>
              <span className="section-title">FAUCETS</span>
              <span className="section-sub">dopamine inputs</span>
            </div>

            <SliderRow
              label="REWARD RATE"
              tooltip="Per-tick chance of a standard reward. Logarithmic boost — diminishing returns as dopamine rises. Sustains baseline engagement."
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
              tooltip="Random loot drop probability per tick. Delivers a larger dopamine surge than standard rewards. Creates excitement loops."
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
              tooltip="Dopamine boost at each day's start. Models login rewards that incentivize daily return visits."
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
              <span className="section-sub">frustration inputs</span>
            </div>

            <SliderRow
              label="ENERGY COST"
              tooltip="Chance per tick that an energy gate triggers frustration. Frustration scales exponentially — higher existing frustration amplifies each hit."
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
              tooltip="Continuous frustration drain from purchase burden. Compounds with exponential scaling. Slow but relentless churn pressure."
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
              tooltip="Per-tick probability of an ad interruption. Exponentially amplified by existing frustration — frequent ads cascade into rapid churn."
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
                SIMULATING…
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
          <div className="panel-title-bar pulse-bar">
            <span className="panel-title-bracket">[</span>
            <span className="panel-title-text">PULSE</span>
            <span className="panel-title-bracket">]</span>
            <span className="pulse-dot" />
          </div>

          <div className="metrics-row">
            <MetricCard
              label="D1 RETENTION"
              value={result ? result.d1 : "—"}
              subtitle="day 1"
              benchmark="40"
              testId="metric-d1"
            />
            <MetricCard
              label="D7 RETENTION"
              value={result ? result.d7 : "—"}
              subtitle="day 7"
              benchmark="15"
              testId="metric-d7"
            />
            <MetricCard
              label="D30 RETENTION"
              value={result ? result.d30 : "—"}
              subtitle="day 30"
              benchmark="4"
              testId="metric-d30"
            />
          </div>

          <div className="chart-panel" data-testid="chart-retention">
            <div className="chart-header">
              <span className="chart-title">30-DAY RETENTION CURVE</span>
              {result && (
                <span className="chart-subtitle">
                  1,000 agents ·{" "}
                  {result.churned.reduce((a, b) => a + b, 0)} churned
                </span>
              )}
            </div>

            {result ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart
                  data={result.curve}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="retentionGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#39ff14"
                        stopOpacity={0.22}
                      />
                      <stop
                        offset="95%"
                        stopColor="#39ff14"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="2 4"
                    stroke="#252535"
                    horizontal
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "#444", fontSize: 10, fontFamily: "monospace" }}
                    axisLine={{ stroke: "#2a2a3a" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "#444", fontSize: 10, fontFamily: "monospace" }}
                    axisLine={{ stroke: "#2a2a3a" }}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip content={<RetentionTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="pct"
                    stroke="#39ff14"
                    strokeWidth={1.5}
                    fill="url(#retentionGrad)"
                    dot={false}
                    activeDot={{ r: 3, fill: "#39ff14", stroke: "#161620" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">
                <div className="chart-empty-icon">◎</div>
                <div className="chart-empty-text">
                  Configure the GOD CONSOLE and run simulation
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

          {result && (result.events?.length ?? 0) > 0 && (
            <LiveAgentFeed events={result.events} />
          )}

          <PresetsPanel />
          <PresetsCompareChart />
        </section>
      </main>

      <footer className="dashboard-footer">
        <span>LOG-DECAY DOPAMINE · EXP-SCALE FRUSTRATION · RESILIENCE DISTRIBUTION</span>
        <span>1,000 AGENTS · 24 TICKS/DAY · SEEDED RNG</span>
      </footer>
    </div>
  );
}
