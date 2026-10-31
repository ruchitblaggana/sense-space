// SenseSpace — Prototype Comparison Lab
// Run two configurations under identical conditions and compare detection metrics.

import { useMemo, useState } from 'react';
import { GitCompareArrows, Play, RotateCcw } from 'lucide-react';
import { useStore } from '../store';
import type { ComparisonMetrics, DeviceConfig, SimFrame, SimulationResult } from '../types';
import { ALL_ENVIRONMENTS, createDefaultConfig, getEnvironment } from '../defaults';
import { runSimulation, type SimOptions } from '../engine/simulation';
import { Badge, Button, Card, Notice, SectionLabel, Select } from '../components/ui';
import { SimulationArena } from '../components/SimulationArena';

export function ComparisonLab() {
  const { config, savedDesigns } = useStore();
  const [envId, setEnvId] = useState(ALL_ENVIRONMENTS[0].id);
  const [configAId, setConfigAId] = useState(config.id);
  const [configBId, setConfigBId] = useState(savedDesigns[0]?.config.id ?? config.id);
  const [resultA, setResultA] = useState<SimulationResult | null>(null);
  const [resultB, setResultB] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);

  const environment = useMemo(() => getEnvironment(envId), [envId]);

  const configs = useMemo(() => {
    const list: { id: string; name: string }[] = [
      { id: config.id, name: `${config.name} (current)` },
      ...savedDesigns.map((d) => ({ id: d.config.id, name: d.config.name })),
    ];
    return list;
  }, [config, savedDesigns]);

  function getConfig(id: string): DeviceConfig {
    if (id === config.id) return config;
    const d = savedDesigns.find((x) => x.config.id === id);
    return d?.config ?? config;
  }

  function computeMetrics(frames: SimFrame[], cfg: DeviceConfig): ComparisonMetrics {
    const eligibleObs = new Set(environment.obstacles.map((o) => o.id));
    let tp = 0, fp = 0, fn = 0, tn = 0;
    let alertCount = 0;
    let firstDetectionMs: number | null = null;
    let firstEligibleMs: number | null = null;

    for (const f of frames) {
      const detectedObs = new Set<string>();
      for (const r of f.readings) {
        if (r.detected && r.obstacleId) detectedObs.add(r.obstacleId);
        if (r.alertLevel !== 'none') alertCount++;
      }
      for (const obsId of eligibleObs) {
        if (detectedObs.has(obsId)) {
          tp++;
          if (firstDetectionMs === null) firstDetectionMs = f.timeMs;
          if (firstEligibleMs === null) firstEligibleMs = f.timeMs;
        } else {
          fn++;
          if (firstEligibleMs === null) firstEligibleMs = f.timeMs;
        }
      }
      // false positive: an alert with no eligible obstacle detected this frame
      const hasAlert = f.readings.some((r) => r.alertLevel !== 'none');
      const detectedEligible = [...detectedObs].some((id) => eligibleObs.has(id));
      if (hasAlert && !detectedEligible) fp++;
      if (!hasAlert) tn++;
    }

    const detectionRate = tp + fn > 0 ? tp / (tp + fn) : null;
    const fpr = fp + tn > 0 ? fp / (fp + tn) : null;
    const fnr = tp + fn > 0 ? fn / (tp + fn) : null;
    const delay = firstDetectionMs !== null && firstEligibleMs !== null ? firstDetectionMs - firstEligibleMs : null;

    // energy
    const draw = cfg.components.reduce((s, c) => s + c.powerDrawMw, 0);
    const batt = cfg.components.find((c) => c.kind === 'battery') as { capacityMah: number; voltageV: number } | undefined;
    const energy = batt ? (draw * (frames.length * 50 / 1000 / 3600)) / batt.voltageV : null;

    // coverage
    let covered = 0, total = 0;
    const sensors = cfg.components.filter((c) => c.kind === 'ultrasonic');
    if (sensors.length > 0) {
      const res = 25;
      for (let i = 0; i <= environment.widthCm / res; i++) {
        for (let j = 0; j <= environment.heightCm / res; j++) {
          const x = -environment.widthCm / 2 + i * res;
          const y = -environment.heightCm / 2 + j * res;
          let relevant = false;
          for (const obs of environment.obstacles) {
            const nx = Math.max(obs.x, Math.min(x, obs.x + obs.w));
            const ny = Math.max(obs.y, Math.min(y, obs.y + obs.h));
            if (Math.hypot(x - nx, y - ny) < 30) { relevant = true; break; }
          }
          if (!relevant) continue;
          total++;
          for (const s of sensors) {
            const range = (s as { rangeCm: number }).rangeCm;
            const angle = (s as { detectionAngleDeg: number }).detectionAngleDeg;
            const d = Math.hypot(x - environment.user.x, y - environment.user.y);
            if (d > range) continue;
            const a = (Math.atan2(y - environment.user.y, x - environment.user.x) * 180) / Math.PI;
            const diff = ((a - environment.user.facingDeg + 540) % 360) - 180;
            if (Math.abs(diff) <= angle) { covered++; break; }
          }
        }
      }
    }
    const coverage = total > 0 ? (covered / total) * 100 : null;

    return {
      truePositives: tp,
      falsePositives: fp,
      falseNegatives: fn,
      trueNegatives: tn,
      detectionRate,
      falsePositiveRate: fpr,
      falseNegativeRate: fnr,
      detectionDelayMs: delay,
      alertCount,
      energyConsumedMah: energy,
      coveragePercent: coverage,
    };
  }

  function runComparison() {
    setRunning(true);
    const cfgA = getConfig(configAId);
    const cfgB = getConfig(configBId);
    const opts: Omit<SimOptions, 'config'> = {
      environment,
      durationMs: 12000,
      stepMs: 50,
      speed: 1,
      seed: 42,
      walkingPath: 'linear',
    };
    const resA = runSimulation({ ...opts, config: cfgA });
    const resB = runSimulation({ ...opts, config: cfgB });
    resA.metrics = computeMetrics(resA.frames, cfgA);
    resB.metrics = computeMetrics(resB.frames, cfgB);
    setResultA(resA);
    setResultB(resB);
    setRunning(false);
  }

  const cfgA = getConfig(configAId);
  const cfgB = getConfig(configBId);
  const frameA = resultA?.frames[resultA.totalFrames - 1] ?? null;

  return (
    <div className="max-w-[1300px] mx-auto px-4 sm:px-6 py-6">
      <SectionLabel>Prototype Comparison Lab</SectionLabel>
      <h1 className="font-display text-3xl text-ink mt-1">Compare two designs</h1>
      <p className="text-sm text-muted mt-1 max-w-2xl mb-6">
        Run the same environment and seed for two configurations. Metrics are computed from real detection behavior.
      </p>

      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        <Card className="p-4">
          <SectionLabel className="mb-2 block">Environment</SectionLabel>
          <Select value={envId} ariaLabel="Environment" options={ALL_ENVIRONMENTS.map((e) => ({ value: e.id, label: e.name }))} onChange={setEnvId} />
        </Card>
        <Card className="p-4">
          <SectionLabel className="mb-2 block">Prototype A</SectionLabel>
          <Select value={configAId} ariaLabel="Prototype A" options={configs.map((c) => ({ value: c.id, label: c.name }))} onChange={setConfigAId} />
          <p className="text-xs text-muted mt-2 truncate">{cfgA.name}</p>
        </Card>
        <Card className="p-4">
          <SectionLabel className="mb-2 block">Prototype B</SectionLabel>
          <Select value={configBId} ariaLabel="Prototype B" options={configs.map((c) => ({ value: c.id, label: c.name }))} onChange={setConfigBId} />
          <p className="text-xs text-muted mt-2 truncate">{cfgB.name}</p>
        </Card>
      </div>

      <div className="flex gap-2 mb-4">
        <Button variant="teal" onClick={runComparison} disabled={running}>
          <Play size={16} /> Run comparison
        </Button>
        <Button variant="ghost" onClick={() => { setResultA(null); setResultB(null); }}>
          <RotateCcw size={16} /> Clear
        </Button>
      </div>

      {frameA && (
        <Card className="p-4 mb-4">
          <SimulationArena environment={environment} config={cfgA} user={frameA.user} readings={frameA.readings} height={280} showLabels />
        </Card>
      )}

      {resultA?.metrics && resultB?.metrics && (
        <MetricsTable a={resultA.metrics} b={resultB.metrics} nameA={cfgA.name} nameB={cfgB.name} />
      )}

      <Notice tone="info">
        A true positive is an eligible obstacle correctly detected. A false positive is an alert without a qualifying obstacle.
        A false negative is an eligible obstacle the device fails to detect. When the denominator is zero, the rate is shown as unavailable.
      </Notice>
    </div>
  );
}

function MetricsTable({ a, b, nameA, nameB }: { a: ComparisonMetrics; b: ComparisonMetrics; nameA: string; nameB: string }) {
  const rows: { label: string; a: string; b: string; better: 'higher' | 'lower' | null; aWins: boolean }[] = [
    { label: 'Detection rate', a: fmtRate(a.detectionRate), b: fmtRate(b.detectionRate), better: 'higher', aWins: (a.detectionRate ?? 0) > (b.detectionRate ?? 0) },
    { label: 'False-positive rate', a: fmtRate(a.falsePositiveRate), b: fmtRate(b.falsePositiveRate), better: 'lower', aWins: (a.falsePositiveRate ?? 1) < (b.falsePositiveRate ?? 1) },
    { label: 'False-negative rate', a: fmtRate(a.falseNegativeRate), b: fmtRate(b.falseNegativeRate), better: 'lower', aWins: (a.falseNegativeRate ?? 1) < (b.falseNegativeRate ?? 1) },
    { label: 'Detection delay', a: a.detectionDelayMs !== null ? `${a.detectionDelayMs}ms` : '—', b: b.detectionDelayMs !== null ? `${b.detectionDelayMs}ms` : '—', better: 'lower', aWins: (a.detectionDelayMs ?? Infinity) < (b.detectionDelayMs ?? Infinity) },
    { label: 'Alert count', a: String(a.alertCount), b: String(b.alertCount), better: 'lower', aWins: a.alertCount < b.alertCount },
    { label: 'Energy (mAh)', a: a.energyConsumedMah !== null ? a.energyConsumedMah.toFixed(2) : '—', b: b.energyConsumedMah !== null ? b.energyConsumedMah.toFixed(2) : '—', better: 'lower', aWins: (a.energyConsumedMah ?? Infinity) < (b.energyConsumedMah ?? Infinity) },
    { label: 'Coverage', a: a.coveragePercent !== null ? `${a.coveragePercent.toFixed(0)}%` : '—', b: b.coveragePercent !== null ? `${b.coveragePercent.toFixed(0)}%` : '—', better: 'higher', aWins: (a.coveragePercent ?? 0) > (b.coveragePercent ?? 0) },
    { label: 'True positives', a: String(a.truePositives), b: String(b.truePositives), better: 'higher', aWins: a.truePositives > b.truePositives },
    { label: 'False negatives', a: String(a.falseNegatives), b: String(b.falseNegatives), better: 'lower', aWins: a.falseNegatives < b.falseNegatives },
  ];
  return (
    <Card className="p-0 overflow-hidden mb-4">
      <table className="w-full text-sm">
        <thead className="bg-sand/40 border-b border-line">
          <tr>
            <th className="text-left font-mono text-xs uppercase text-muted px-4 py-2.5">Metric</th>
            <th className="text-left font-medium text-ink px-4 py-2.5">A: {nameA}</th>
            <th className="text-left font-medium text-ink px-4 py-2.5">B: {nameB}</th>
            <th className="text-left font-mono text-xs uppercase text-muted px-4 py-2.5">Edge</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-lineSoft last:border-0">
              <td className="px-4 py-2.5 text-ink-soft">{r.label}</td>
              <td className={`px-4 py-2.5 font-mono tabular-nums ${r.aWins && r.better ? 'text-teal-deep font-medium' : 'text-ink'}`}>{r.a}</td>
              <td className={`px-4 py-2.5 font-mono tabular-nums ${!r.aWins && r.better ? 'text-teal-deep font-medium' : 'text-ink'}`}>{r.b}</td>
              <td className="px-4 py-2.5">
                {r.better && <Badge tone={r.aWins ? 'teal' : 'blue'}>{r.aWins ? 'A' : 'B'}</Badge>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-3 bg-sand/20">
        <p className="text-xs text-muted">
          A configuration with better coverage may generate more unwanted alerts or consume more power. No single metric
          determines a superior design — consider them together for your use case.
        </p>
      </div>
    </Card>
  );
}

function fmtRate(r: number | null): string {
  if (r === null) return '—';
  return `${(r * 100).toFixed(1)}%`;
}
