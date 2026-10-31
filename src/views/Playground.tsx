// SenseSpace — Playground: six interactive accessibility challenges

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Battery,
  Compass,
  Eye,
  Footprints,
  Radio,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  Waves,
  Wrench,
  Zap,
} from 'lucide-react';
import { useStore } from '../store';
import type { ChallengeDef, ChallengeResult, DeviceConfig, SimFrame } from '../types';
import {
  createAlertModule,
  createBattery,
  createDefaultConfig,
  createMicrocontroller,
  createUltrasonicSensor,
  ENV_BLINDSPOT,
  ENV_CORRIDOR,
  ENV_MOVING,
  ENV_NOISY,
  ENV_OPEN_LAB,
  ENV_OVERHEAD,
} from '../defaults';
import { runSimulation, type SimOptions } from '../engine/simulation';
import { Badge, Button, Card, Notice, SectionLabel } from '../components/ui';
import { SimulationArena } from '../components/SimulationArena';

function challenge01(): ChallengeDef {
  const config = createDefaultConfig();
  const sensor = config.components[0] as ReturnType<typeof createUltrasonicSensor>;
  sensor.orientationDeg = 0;
  sensor.rangeCm = 150;
  sensor.detectionAngleDeg = 15;
  return {
    id: 'ch01-overhead',
    number: 1,
    title: 'Overhead Hazard',
    difficulty: 'Introductory',
    intro:
      'A low beam hangs across the path. The default sensor points straight ahead and will not detect it. You must reorient the sensor upward and set a range that catches the beam before the person walks into it.',
    objective: 'Detect the overhead beam at least 1 second before the user reaches it.',
    teaches: ['Sensor orientation', 'Detection range', 'Detection angle', 'Response time'],
    environment: ENV_OVERHEAD,
    initialConfig: config,
    successCheck: (frames) => {
      const beamId = 'obs-oh-1';
      let earliestDetectionMs: number | null = null;
      let userReachedMs: number | null = null;
      for (const f of frames) {
        const det = f.readings.find((r) => r.obstacleId === beamId && r.detected);
        if (det && earliestDetectionMs === null) earliestDetectionMs = f.timeMs;
        const beam = frames[0] && ENV_OVERHEAD.obstacles.find((o) => o.id === beamId)!;
        if (f.user.x >= beam.x - 20 && userReachedMs === null) userReachedMs = f.timeMs;
      }
      if (earliestDetectionMs === null || userReachedMs === null) {
        return { passed: false, summary: 'The overhead beam was never detected.', details: ['Reorient the sensor toward the top, and ensure the range covers the beam.'] };
      }
      const margin = userReachedMs - earliestDetectionMs;
      if (margin >= 1000) {
        return { passed: true, summary: `Detected the beam ${(margin / 1000).toFixed(1)}s before arrival.`, details: ['Early detection gives the user time to stop or reroute.'] };
      }
      return { passed: false, summary: `Detected the beam only ${margin}ms before arrival.`, details: ['Aim for at least 1000ms of warning time.'] };
    },
    explanation:
      'Overhead obstacles require an upward-oriented sensor. A forward-facing sensor will never see a beam above the user. Range and angle determine how early the warning fires.',
  };
}

function challenge02(): ChallengeDef {
  const config = createDefaultConfig();
  const sensor = config.components[0] as ReturnType<typeof createUltrasonicSensor>;
  sensor.detectionAngleDeg = 30;
  sensor.rangeCm = 200;
  return {
    id: 'ch02-narrow',
    number: 2,
    title: 'Narrow Passage',
    difficulty: 'Intermediate',
    intro:
      'A narrow corridor has boxes close to the walking path. A wide detection angle picks up the walls and irrelevant objects, flooding the user with alerts. Tune the detection angle and range so you detect the boxes in the path but not the corridor walls.',
    objective: 'Detect at least one path obstacle while generating fewer than 3 wall-triggered alert frames.',
    teaches: ['Sensor positioning', 'Field-of-view trade-offs', 'Detection thresholds', 'Environmental geometry'],
    environment: ENV_CORRIDOR,
    initialConfig: config,
    successCheck: (frames) => {
      const wallIds = new Set(['cor-wall-n', 'cor-wall-s']);
      const pathObsIds = new Set(['obs-cor-1', 'obs-cor-2', 'obs-cor-3']);
      let detectedPath = false;
      let wallAlertFrames = 0;
      for (const f of frames) {
        for (const r of f.readings) {
          if (r.detected && r.alertLevel !== 'none') {
            if (pathObsIds.has(r.obstacleId ?? '')) detectedPath = true;
            if (wallIds.has(r.obstacleId ?? '')) wallAlertFrames++;
          }
        }
      }
      if (detectedPath && wallAlertFrames < 3) {
        return { passed: true, summary: 'Detected a path obstacle with minimal wall alerts.', details: [`Wall alert frames: ${wallAlertFrames}`] };
      }
      return { passed: false, summary: detectedPath ? 'Too many wall alerts — narrow the detection angle.' : 'No path obstacle detected.', details: [`Wall alert frames: ${wallAlertFrames}`, 'Try a narrower detection angle or shorter range.'] };
    },
    explanation:
      'In tight spaces, a narrow field of view avoids detecting walls. Wider angles give coverage but cause false alerts from the environment. This is a core trade-off in sensor design.',
  };
}

function challenge03(): ChallengeDef {
  const config = createDefaultConfig();
  const sensor = config.components[0] as ReturnType<typeof createUltrasonicSensor>;
  sensor.uncertaintyCm = 12;
  sensor.detectionAngleDeg = 20;
  config.alertThresholds = { cautionCm: 100, warningCm: 60, criticalCm: 30, hysteresisCm: 8 };
  return {
    id: 'ch03-noise',
    number: 3,
    title: 'Noisy Measurements',
    difficulty: 'Intermediate',
    intro:
      'The sensor has high measurement uncertainty (±12 cm). Raw readings fluctuate near thresholds, causing alert flicker. Increase the hysteresis to stabilize the alert and confirm you still detect the pillar.',
    objective: 'Detect the pillar while producing fewer than 5 alert-level transitions (flicker).',
    teaches: ['Noise', 'Threshold selection', 'Hysteresis', 'False-positive and false-negative trade-offs'],
    environment: ENV_NOISY,
    initialConfig: config,
    successCheck: (frames) => {
      const pillarId = 'obs-noise-1';
      let detected = false;
      let transitions = 0;
      let prevLevel = 'none';
      for (const f of frames) {
        for (const r of f.readings) {
          if (r.obstacleId === pillarId && r.detected) detected = true;
          if (r.alertLevel !== prevLevel) {
            transitions++;
            prevLevel = r.alertLevel;
          }
        }
      }
      if (detected && transitions < 5) {
        return { passed: true, summary: 'Stable detection under noise.', details: [`Alert transitions: ${transitions}`, 'Hysteresis absorbed the measurement noise.'] };
      }
      return { passed: false, summary: detected ? `Too many flicker transitions (${transitions}).` : 'Pillar not detected.', details: ['Increase hysteresis to prevent rapid alert toggling near a threshold.'] };
    },
    explanation:
      'Hysteresis adds a deadband: an alert must clear by more than the hysteresis amount before it turns off. This prevents flicker when noise pushes readings back and forth across a threshold.',
  };
}

function challenge04(): ChallengeDef {
  const config = createDefaultConfig();
  const sensor = config.components[0] as ReturnType<typeof createUltrasonicSensor>;
  sensor.intervalMs = 300;
  sensor.responseDelayMs = 150;
  return {
    id: 'ch04-moving',
    number: 4,
    title: 'Moving Obstacles',
    difficulty: 'Advanced',
    intro:
      'Obstacles move laterally. With a slow measurement interval and high response delay, the device reacts too late. Reduce the interval and delay so the walker is detected within 200ms of entering the cone.',
    objective: 'Detect the moving walker within 200ms of it entering the detection cone.',
    teaches: ['Measurement intervals', 'Detection delay', 'Movement speed', 'Time available for a response'],
    environment: ENV_MOVING,
    initialConfig: config,
    successCheck: (frames) => {
      const walkerId = 'obs-mov-1';
      // find first frame where the walker is within 200cm of the user and roughly ahead
      let enteredMs: number | null = null;
      let detectedMs: number | null = null;
      for (const f of frames) {
        const u = f.user;
        const obs = ENV_MOVING.obstacles.find((o) => o.id === walkerId)!;
        const t = f.timeMs / 1000;
        const ox = obs.x + (obs.moving?.axis === 'x' ? Math.sin(t * obs.moving.speed + obs.moving.phase) * obs.moving.amplitude : 0);
        const oy = obs.y + (obs.moving?.axis === 'y' ? Math.sin(t * obs.moving.speed + obs.moving.phase) * obs.moving.amplitude : 0);
        const d = Math.hypot(ox - u.x, oy - u.y);
        if (d < 200 && enteredMs === null) enteredMs = f.timeMs;
        const det = f.readings.find((r) => r.obstacleId === walkerId && r.detected);
        if (det && detectedMs === null) detectedMs = f.timeMs;
      }
      if (detectedMs === null) return { passed: false, summary: 'The moving walker was never detected.', details: ['Reduce the measurement interval and response delay.'] };
      const base = enteredMs ?? 0;
      const latency = detectedMs - base;
      if (latency <= 200) {
        return { passed: true, summary: `Walker detected in ${latency}ms.`, details: ['Faster measurements catch moving obstacles sooner.'] };
      }
      return { passed: false, summary: `Walker detected after ${latency}ms — too slow.`, details: ['Reduce interval and response delay for faster reactions.'] };
    },
    explanation:
      'The measurement interval sets how often the sensor samples; the response delay is how long after sampling before the result is available. Together they define the worst-case detection latency.',
  };
}

function challenge05(): ChallengeDef {
  const config = createDefaultConfig();
  const sensor = config.components[0] as ReturnType<typeof createUltrasonicSensor>;
  sensor.orientationDeg = 0;
  sensor.detectionAngleDeg = 12;
  return {
    id: 'ch05-blindspot',
    number: 5,
    title: 'The Blind Spot',
    difficulty: 'Advanced',
    intro:
      'Three obstacles surround the user at different angles. The narrow 12° forward cone leaves large blind spots. Widen the angle or add sensors to cover obstacles B and C without losing obstacle A.',
    objective: 'Detect at least 2 of the 3 obstacles at some point during the test.',
    teaches: ['Coverage analysis', 'Orientation', 'Geometric blind spots', 'Trade-offs between coverage and unwanted detections'],
    environment: ENV_BLINDSPOT,
    initialConfig: config,
    successCheck: (frames) => {
      const ids = ['obs-bs-1', 'obs-bs-2', 'obs-bs-3'];
      const detected = new Set<string>();
      for (const f of frames) {
        for (const r of f.readings) {
          if (r.detected && ids.includes(r.obstacleId ?? '')) detected.add(r.obstacleId!);
        }
      }
      if (detected.size >= 2) {
        return { passed: true, summary: `Detected ${detected.size}/3 obstacles.`, details: ['Widening the angle or adding sensors improves coverage.'] };
      }
      return { passed: false, summary: `Detected only ${detected.size}/3 obstacles.`, details: ['Widen the detection angle, reorient, or add a second sensor.'] };
    },
    explanation:
      'A narrow cone creates blind spots — directions the sensor cannot see. Widening the angle covers more area but reduces directional precision. Adding multiple sensors with different orientations is how real devices solve this.',
  };
}

function challenge06(): ChallengeDef {
  const config = createDefaultConfig();
  const sensor = config.components[0] as ReturnType<typeof createUltrasonicSensor>;
  sensor.intervalMs = 50;
  sensor.rangeCm = 250;
  const alert = config.components.find((c) => c.kind === 'alert') as ReturnType<typeof createAlertModule>;
  alert.intensity = 80;
  alert.repetitionMs = 200;
  const batt = config.components.find((c) => c.kind === 'battery') as ReturnType<typeof createBattery>;
  batt.capacityMah = 500;
  return {
    id: 'ch06-power',
    number: 6,
    title: 'The Power Budget',
    difficulty: 'Advanced',
    intro:
      'Battery capacity is limited to 500 mAh. The default configuration samples very frequently and alerts aggressively. Reduce power consumption — slower intervals, lower intensity, shorter range — while still detecting the cabinet.',
    objective: 'Detect the cabinet AND keep estimated operating time above 2 hours.',
    teaches: ['Measurement frequency', 'Alert duration', 'Component consumption', 'Trade-offs between energy use and responsiveness'],
    environment: ENV_OPEN_LAB,
    initialConfig: config,
    successCheck: (frames, cfg) => {
      const cabinetId = 'obs-lab-1';
      let detected = false;
      for (const f of frames) {
        if (f.readings.some((r) => r.obstacleId === cabinetId && r.detected)) {
          detected = true;
          break;
        }
      }
      const draw = cfg.components.reduce((s, c) => s + c.powerDrawMw, 0);
      const battComp = cfg.components.find((c) => c.kind === 'battery') as ReturnType<typeof createBattery> | undefined;
      if (!battComp) return { passed: false, summary: 'No battery configured.', details: ['Add a battery to estimate operating time.'] };
      const mwh = battComp.capacityMah * battComp.voltageV;
      const hours = draw > 0 ? mwh / draw : Infinity;
      if (detected && hours >= 2) {
        return { passed: true, summary: `Cabinet detected with ${hours.toFixed(1)}h operating time.`, details: ['Balancing sampling rate and alert intensity conserves energy.'] };
      }
      return { passed: false, summary: detected ? `Operating time only ${hours.toFixed(1)}h.` : 'Cabinet not detected.', details: ['Reduce power draw (interval, intensity, range) while keeping detection.'] };
    },
    explanation:
      'Every measurement and every alert costs energy. Sampling less often saves power but risks missing fast obstacles. Alert intensity and repetition affect how long the battery lasts. Engineering is about finding the right balance.',
  };
}

const CHALLENGES: ChallengeDef[] = [challenge01(), challenge02(), challenge03(), challenge04(), challenge05(), challenge06()];

const DIFFICULTY_TONE = {
  Introductory: 'teal',
  Intermediate: 'blue',
  Advanced: 'clay',
} as const;

export function Playground() {
  const { config, setConfig, notify } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const [frames, setFrames] = useState<SimFrame[]>([]);
  const [running, setRunning] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);

  const active = CHALLENGES.find((c) => c.id === activeId) ?? null;

  const runChallenge = useCallback(() => {
    if (!active) return;
    const opts: SimOptions = {
      config,
      environment: active.environment,
      durationMs: 12000,
      stepMs: 50,
      speed: 1,
      seed: 42,
      walkingPath: 'linear',
    };
    const res = runSimulation(opts);
    setFrames(res.frames);
    setCurrentFrame(0);
    setRunning(true);
    const check = active.successCheck(res.frames, config);
    setResult(check);
    if (check.passed) notify('Challenge passed!', 'success');
  }, [active, config, notify]);

  // playback animation
  useEffect(() => {
    if (!running || frames.length === 0) return;
    let raf = 0;
    const step = () => {
      setCurrentFrame((f) => {
        if (f >= frames.length - 1) {
          setRunning(false);
          return f;
        }
        return f + 1;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [running, frames.length]);

  function loadChallenge(ch: ChallengeDef) {
    setActiveId(ch.id);
    setConfig(ch.initialConfig);
    setResult(null);
    setFrames([]);
    setRunning(false);
  }

  function resetChallenge() {
    if (!active) return;
    setConfig(active.initialConfig);
    setResult(null);
    setFrames([]);
    setRunning(false);
  }

  if (active) {
    const frame = frames[currentFrame] ?? null;
    return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        <button onClick={() => setActiveId(null)} className="flex items-center gap-1 text-sm text-muted hover:text-ink mb-4">
          <ArrowLeft size={14} /> All challenges
        </button>
        <div className="grid lg:grid-cols-[1fr_340px] gap-4">
          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge tone={DIFFICULTY_TONE[active.difficulty]}>{active.difficulty}</Badge>
                    <SectionLabel>Challenge {String(active.number).padStart(2, '0')}</SectionLabel>
                  </div>
                  <h2 className="font-display text-2xl text-ink">{active.title}</h2>
                </div>
              </div>
              <p className="text-sm text-ink-soft leading-relaxed">{active.intro}</p>
              <div className="mt-3 bg-blue/5 border border-blue/20 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-deep mb-1">
                  <Target size={14} /> Objective
                </div>
                <p className="text-sm text-ink-soft">{active.objective}</p>
              </div>
            </Card>

            <Card className="p-4">
              <SimulationArena environment={active.environment} config={config} user={frame?.user ?? active.environment.user} readings={frame?.readings ?? []} height={340} showLabels />
            </Card>

            <Card className="p-4">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="teal" onClick={runChallenge}>
                  <Sparkles size={14} /> Run challenge
                </Button>
                <Button size="sm" variant="secondary" onClick={resetChallenge}>
                  <RotateCcw size={14} /> Reset
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfig(active.initialConfig)}>
                  <Wrench size={14} /> Restore initial config
                </Button>
              </div>
              {frames.length > 0 && (
                <div className="mt-3">
                  <input
                    type="range"
                    min={0}
                    max={frames.length - 1}
                    value={currentFrame}
                    onChange={(e) => { setRunning(false); setCurrentFrame(parseInt(e.target.value, 10)); }}
                    aria-label="Challenge timeline"
                    className="w-full"
                  />
                  <p className="text-xs font-mono text-muted mt-1">Frame {currentFrame} / {frames.length - 1} · {(frame?.timeMs ?? 0) / 1000}s</p>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="p-4">
              <SectionLabel className="mb-2 block">What you'll learn</SectionLabel>
              <ul className="space-y-1.5">
                {active.teaches.map((t) => (
                  <li key={t} className="flex items-center gap-2 text-sm text-ink-soft">
                    <span className="w-1 h-1 rounded-full bg-teal" /> {t}
                  </li>
                ))}
              </ul>
            </Card>
            {result && (
              <Card className={`p-4 ${result.passed ? 'border-teal/40' : 'border-clay/40'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {result.passed ? <Trophy size={18} className="text-teal-deep" /> : <Target size={18} className="text-clay-deep" />}
                  <h3 className={`font-display text-lg ${result.passed ? 'text-teal-deep' : 'text-clay-deep'}`}>
                    {result.passed ? 'Passed' : 'Not yet'}
                  </h3>
                </div>
                <p className="text-sm text-ink-soft mb-2">{result.summary}</p>
                <ul className="space-y-1">
                  {result.details.map((d, i) => (
                    <li key={i} className="text-xs text-muted font-mono">· {d}</li>
                  ))}
                </ul>
              </Card>
            )}
            {result?.passed && (
              <Notice tone="success" title="What you learned">
                {active.explanation}
              </Notice>
            )}
            <Card className="p-4">
              <SectionLabel className="mb-2 block">Current config</SectionLabel>
              <ConfigSummary config={config} />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Challenge list
  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6">
      <SectionLabel>Accessibility Playground</SectionLabel>
      <h1 className="font-display text-3xl text-ink mt-1">Engineering challenges</h1>
      <p className="text-sm text-muted mt-1 max-w-2xl mb-6">
        Six short challenges teach sensor-design principles through real simulation. Each is evaluated by your device's
        actual behavior — not by a timer or button click.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        {CHALLENGES.map((ch) => {
          const icons = [Eye, Compass, Waves, Footprints, Radio, Battery];
          const Icon = icons[ch.number - 1] ?? Compass;
          return (
            <Card key={ch.id} className="p-5 hover:border-blue/40 transition-colors cursor-pointer" as="button">
              <div onClick={() => loadChallenge(ch)} className="text-left w-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-ink/5 flex items-center justify-center">
                      <Icon size={18} className="text-blue" />
                    </div>
                    <div>
                      <SectionLabel>Challenge {String(ch.number).padStart(2, '0')}</SectionLabel>
                      <h3 className="font-display text-lg text-ink">{ch.title}</h3>
                    </div>
                  </div>
                  <Badge tone={DIFFICULTY_TONE[ch.difficulty]}>{ch.difficulty}</Badge>
                </div>
                <p className="text-sm text-muted leading-relaxed line-clamp-3">{ch.intro}</p>
                <div className="flex items-center gap-1 text-sm text-blue-deep mt-3">
                  Start <ArrowRight size={14} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <Notice tone="info" >
        These challenges focus on engineering design and sensor limitations. They do not ask you to imitate a disability or treat visual impairment as a game mechanic.
      </Notice>
    </div>
  );
}

function ConfigSummary({ config }: { config: DeviceConfig }) {
  const sensors = config.components.filter((c) => c.kind === 'ultrasonic');
  const alerts = config.components.filter((c) => c.kind === 'alert');
  const t = config.alertThresholds;
  return (
    <dl className="text-xs space-y-1">
      <div className="flex justify-between"><dt className="text-muted">Sensors</dt><dd className="font-mono text-ink">{sensors.length}</dd></div>
      {sensors.map((s) => (
        <div key={s.id} className="pl-2 flex justify-between text-muted">
          <dt>{(s as { name: string }).name}</dt>
          <dd className="font-mono">{(s as { rangeCm: number }).rangeCm}cm / {(s as { detectionAngleDeg: number }).detectionAngleDeg}°</dd>
        </div>
      ))}
      <div className="flex justify-between"><dt className="text-muted">Alert modules</dt><dd className="font-mono text-ink">{alerts.length}</dd></div>
      <div className="flex justify-between"><dt className="text-muted">Thresholds</dt><dd className="font-mono text-ink">{t.criticalCm}/{t.warningCm}/{t.cautionCm}cm</dd></div>
      <div className="flex justify-between"><dt className="text-muted">Hysteresis</dt><dd className="font-mono text-ink">{t.hysteresisCm}cm</dd></div>
    </dl>
  );
}

// ConfigSummary is the last helper in this file.
