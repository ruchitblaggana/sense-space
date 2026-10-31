// SenseSpace — Live Simulation
// Interactive environment: move the person, add/move obstacles, run/pause/step/reset, inspect readings.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ChevronRight,
  Clock,
  MapPin,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Square,
  StepForward,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useStore } from '../store';
import type { AlertLevel, Obstacle, SimEvent, SimFrame, SensorReading, SimulationResult } from '../types';
import { ALL_ENVIRONMENTS, getEnvironment, uid } from '../defaults';
import { listSensors, runSimulation, type SimOptions } from '../engine/simulation';
import { validateConfig } from '../engine/validation';
import { Badge, Button, Card, Notice, SectionLabel, Select, Slider } from '../components/ui';
import { alertColor, ArenaLegend, SimulationArena } from '../components/SimulationArena';

export function LiveSimulation() {
  const { config, setView, setLastResult, notify } = useStore();
  const [envId, setEnvId] = useState(ALL_ENVIRONMENTS[0].id);
  const [durationMs, setDurationMs] = useState(10000);
  const [speed, setSpeed] = useState(1);
  const [seed, setSeed] = useState(42);
  const [path, setPath] = useState<SimOptions['walkingPath']>('linear');
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [walkSpeed, setWalkSpeed] = useState(80);
  const [extraObstacles, setExtraObstacles] = useState<Obstacle[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  const environment = useMemo(() => {
    const base = getEnvironment(envId);
    return { ...base, obstacles: [...base.obstacles, ...extraObstacles], user: { ...base.user, speedCmS: walkSpeed } };
  }, [envId, extraObstacles, walkSpeed]);

  const validation = useMemo(() => validateConfig(config), [config]);

  const runSim = useCallback(() => {
    const opts: SimOptions = {
      config,
      environment,
      durationMs,
      stepMs: 50,
      speed,
      seed,
      walkingPath: path,
    };
    const res = runSimulation(opts);
    setResult(res);
    setCurrentFrame(0);
    setRunning(true);
    setPaused(false);
    setLastResult(res);
  }, [config, environment, durationMs, speed, seed, path, setLastResult]);

  // Playback loop
  useEffect(() => {
    if (!running || paused || !result) return;
    const step = (ts: number) => {
      if (!lastTickRef.current) lastTickRef.current = ts;
      const elapsed = ts - lastTickRef.current;
      const framesPerMs = speed / (result.durationMs / result.totalFrames);
      const advance = Math.max(1, Math.round(elapsed * framesPerMs));
      lastTickRef.current = ts;
      setCurrentFrame((f) => {
        const next = f + advance;
        if (next >= result.totalFrames - 1) {
          setRunning(false);
          return result.totalFrames - 1;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTickRef.current = 0;
    };
  }, [running, paused, result, speed]);

  function handlePause() {
    setPaused((p) => !p);
  }

  function handleStep() {
    if (!result) return;
    setCurrentFrame((f) => Math.min(f + 1, result.totalFrames - 1));
  }

  function handleReset() {
    setRunning(false);
    setPaused(false);
    setCurrentFrame(0);
    lastTickRef.current = 0;
  }

  function addObstacle() {
    const obs: Obstacle = {
      id: uid('obs'),
      kind: 'box',
      x: Math.random() * 200 - 100,
      y: Math.random() * 100 - 50,
      w: 30,
      h: 30,
      label: `Obstacle ${extraObstacles.length + 1}`,
    };
    setExtraObstacles((o) => [...o, obs]);
    notify('Obstacle added.', 'success');
  }

  function removeLastObstacle() {
    setExtraObstacles((o) => o.slice(0, -1));
  }

  const frame: SimFrame | null = result?.frames[currentFrame] ?? null;
  const sensors = listSensors(config);
  const recentEvents = useMemo(() => {
    if (!result) return [];
    return result.events.slice(-40).reverse();
  }, [result]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
      <div className="mb-5 flex items-start justify-between flex-wrap gap-3">
        <div>
          <SectionLabel>Live Simulation</SectionLabel>
          <h1 className="font-display text-3xl text-ink mt-1">Test your device</h1>
          <p className="text-sm text-muted mt-1">Detection is computed from actual geometry — not random numbers.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setView('bench')}>
            <ChevronRight size={14} className="rotate-180" /> Edit device
          </Button>
          <Button size="sm" variant="teal" onClick={runSim}>
            <Play size={14} /> Run test
          </Button>
        </div>
      </div>

      {!validation.valid && (
        <Notice tone="warning" title="Configuration has issues">
          The simulation will still run, but detection may not work as expected.{' '}
          <button onClick={() => setView('bench')} className="underline">Open the Design Bench to fix.</button>
        </Notice>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Arena + controls */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <SectionLabel>Environment</SectionLabel>
              <div className="flex items-center gap-2">
                <Select
                  value={envId}
                  ariaLabel="Environment"
                  options={ALL_ENVIRONMENTS.map((e) => ({ value: e.id, label: e.name }))}
                  onChange={setEnvId}
                />
              </div>
            </div>
            <SimulationArena
              environment={environment}
              config={config}
              user={frame?.user ?? environment.user}
              readings={frame?.readings ?? []}
              showGrid
              showLabels
              height={380}
            />
            <div className="mt-3">
              <ArenaLegend />
            </div>
          </Card>

          {/* Playback controls */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant={running && !paused ? 'secondary' : 'teal'} onClick={() => (result ? handlePause() : runSim())} aria-label={running && !paused ? 'Pause' : 'Play'}>
                  {running && !paused ? <Pause size={14} /> : <Play size={14} />}
                  {running && !paused ? 'Pause' : result ? 'Resume' : 'Run'}
                </Button>
                <Button size="sm" variant="secondary" onClick={handleStep} disabled={!result} aria-label="Step forward">
                  <StepForward size={14} /> Step
                </Button>
                <Button size="sm" variant="secondary" onClick={handleReset} aria-label="Reset">
                  <RotateCcw size={14} /> Reset
                </Button>
                <Button size="sm" variant="ghost" onClick={runSim} aria-label="Replay scenario">
                  <Square size={14} /> Replay
                </Button>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Clock size={14} className="text-muted" />
                <span className="font-mono text-sm text-ink tabular-nums">
                  {frame ? `${(frame.timeMs / 1000).toFixed(2)}s` : '0.00s'} / {(durationMs / 1000).toFixed(1)}s
                </span>
                <Badge tone="muted">frame {currentFrame}</Badge>
              </div>
            </div>
            {result && (
              <div className="mt-3">
                <input
                  type="range"
                  min={0}
                  max={result.totalFrames - 1}
                  value={currentFrame}
                  onChange={(e) => setCurrentFrame(parseInt(e.target.value, 10))}
                  aria-label="Timeline scrubber"
                  className="w-full"
                />
              </div>
            )}
          </Card>

          {/* Environment controls */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="p-4">
              <SectionLabel className="mb-3 block">Obstacles</SectionLabel>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={addObstacle}>
                  <Plus size={14} /> Add obstacle
                </Button>
                <Button size="sm" variant="ghost" onClick={removeLastObstacle} disabled={extraObstacles.length === 0}>
                  <Trash2 size={14} /> Remove last
                </Button>
              </div>
              <p className="text-xs text-muted mt-2">{environment.obstacles.length} obstacles · {environment.walls.length} walls</p>
            </Card>
            <Card className="p-4">
              <SectionLabel className="mb-3 block">Test parameters</SectionLabel>
              <div className="space-y-3">
                <Field2 label="Walking speed">
                  <Slider value={walkSpeed} min={20} max={200} step={5} ariaLabel="Walking speed" onChange={setWalkSpeed} format={(v) => `${v}cm/s`} />
                </Field2>
                <Field2 label="Duration">
                  <Slider value={durationMs} min={2000} max={30000} step={1000} ariaLabel="Duration" onChange={setDurationMs} format={(v) => `${(v / 1000).toFixed(0)}s`} />
                </Field2>
                <Field2 label="Playback speed">
                  <Slider value={speed} min={0.25} max={4} step={0.25} ariaLabel="Playback speed" onChange={setSpeed} format={(v) => `${v}×`} />
                </Field2>
              </div>
            </Card>
          </div>

          <Card className="p-4">
            <SectionLabel className="mb-3 block">Path & seed</SectionLabel>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field2 label="Walking path">
                <Select
                  value={path ?? 'linear'}
                  ariaLabel="Walking path"
                  options={[
                    { value: 'linear', label: 'Linear (back & forth)' },
                    { value: 'circular', label: 'Circular' },
                    { value: 'stationary', label: 'Stationary' },
                  ]}
                  onChange={(v) => setPath(v as SimOptions['walkingPath'])}
                />
              </Field2>
              <Field2 label="Random seed (for noise)">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm font-mono"
                  />
                  <Button size="sm" variant="ghost" onClick={() => setSeed(Math.floor(Math.random() * 10000))}>Randomize</Button>
                </div>
              </Field2>
            </div>
          </Card>
        </div>

        {/* Right panel: readings + timeline */}
        <div className="space-y-4">
          <Card className="p-4">
            <SectionLabel className="mb-3 block">Sensor readings</SectionLabel>
            {sensors.length === 0 && <p className="text-sm text-muted">No sensors configured.</p>}
            <div className="space-y-3">
              {sensors.map((s) => {
                const reading = frame?.readings.find((r) => r.sensorId === s.id);
                return <ReadingCard key={s.id} sensor={s} reading={reading} />;
              })}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Event timeline</SectionLabel>
              <Badge tone="muted">{result?.events.length ?? 0}</Badge>
            </div>
            {!result && <p className="text-sm text-muted">Run a test to see events.</p>}
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {recentEvents.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field2({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-medium text-ink mb-1">{label}</div>
      {children}
    </div>
  );
}

function ReadingCard({ sensor, reading }: { sensor: import('../types').UltrasonicSensor; reading?: SensorReading }) {
  const level: AlertLevel = reading?.alertLevel ?? 'none';
  const ringColor = alertColor(level);
  return (
    <div className="border border-line rounded-lg p-3 bg-paper">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-blue" />
          <span className="text-sm font-medium text-ink">{sensor.name}</span>
        </div>
        <AlertBadge level={level} />
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <div className="flex justify-between"><dt className="text-muted">Actual</dt><dd className="font-mono text-ink">{reading?.actualDistanceCm !== null && reading?.actualDistanceCm !== undefined ? `${reading.actualDistanceCm.toFixed(1)} cm` : '—'}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Measured</dt><dd className="font-mono text-ink">{reading?.measuredDistanceCm !== null && reading?.measuredDistanceCm !== undefined ? `${reading.measuredDistanceCm.toFixed(1)} cm` : '—'}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Heading</dt><dd className="font-mono text-ink">{reading ? `${reading.orientationDeg.toFixed(0)}°` : `${sensor.orientationDeg}°`}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Uncertainty</dt><dd className="font-mono text-ink">±{sensor.uncertaintyCm}cm</dd></div>
      </dl>
      <div className="mt-2 h-1 rounded-full bg-sand overflow-hidden">
        <div className="h-full transition-all" style={{ width: `${level === 'none' ? 100 : Math.max(5, 100 - (reading?.measuredDistanceCm ?? 0) / 3)}%`, background: ringColor }} />
      </div>
      <div className="mt-1 text-[10px] font-mono text-muted">
        {reading?.detected ? `Detecting: ${reading.obstacleId ?? 'obstacle'}` : 'No obstacle in range'}
      </div>
    </div>
  );
}

function AlertBadge({ level }: { level: AlertLevel }) {
  const tones = {
    none: 'muted',
    caution: 'blue',
    warning: 'clay',
    critical: 'clay',
  } as const;
  return <Badge tone={tones[level]}>{level}</Badge>;
}

function EventRow({ event }: { event: SimEvent }) {
  const icons: Record<string, typeof Activity> = {
    'obstacle-entered': MapPin,
    'obstacle-left': MapPin,
    'new-measurement': Activity,
    'caution-crossed': Activity,
    'warning-activated': Activity,
    'critical-activated': Activity,
    'test-completed': Activity,
  };
  const Icon = icons[event.type] ?? Activity;
  return (
    <div className="flex items-start gap-2 text-xs py-1 border-b border-lineSoft last:border-0">
      <Icon size={12} className="text-muted mt-0.5 shrink-0" />
      <span className="font-mono text-muted tabular-nums">{(event.timeMs / 1000).toFixed(2)}s</span>
      <span className="text-ink-soft flex-1">{event.message}</span>
    </div>
  );
}
