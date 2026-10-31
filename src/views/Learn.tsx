// SenseSpace — Learning Mode
// Interactive explanations of CS/engineering principles with hands-on examples.

import { useMemo, useState } from 'react';
import { GraduationCap, Ruler, Triangle, Waves, Zap, Activity, FlaskConical } from 'lucide-react';
import type { LearningTopic } from '../types';
import { SectionLabel, Slider, Card } from '../components/ui';
import { SimulationArena } from '../components/SimulationArena';
import { createDefaultConfig, ENV_OPEN_LAB } from '../defaults';
import { listSensors } from '../engine/simulation';

const TOPICS: LearningTopic[] = [
  {
    id: 'distance',
    title: 'Distance Calculations',
    category: 'geometry',
    summary: 'How a sensor measures the distance to an obstacle using geometry.',
    explanation:
      'A distance sensor fires a pulse (sound, light) and measures the time until the echo returns. In simulation, we compute the straight-line distance from the sensor origin to the nearest point on the obstacle. The Pythagorean theorem gives us the distance: d = √((x₂−x₁)² + (y₂−y₁)²).',
    interactive: 'distance',
    challengeQuestion: 'If the sensor is at (0,0) and the obstacle is at (3,4), what is the distance?',
    challengeAnswer: '5 cm',
  },
  {
    id: 'detection-angle',
    title: 'Angular Fields of View',
    category: 'geometry',
    summary: 'A sensor only detects obstacles within its detection cone.',
    explanation:
      'The detection angle defines a cone in front of the sensor. An obstacle must be within both the range and the cone to be detected. The cone is defined by a heading and a half-angle. An obstacle at a wider angle than the half-angle is invisible — even if it is close.',
    interactive: 'detection-angle',
    challengeQuestion: 'If the half-angle is 15°, can a sensor detect an obstacle at 20° to the side?',
    challengeAnswer: 'No — 20° is outside the 15° half-angle cone.',
  },
  {
    id: 'thresholds',
    title: 'Threshold-Based Alerts',
    category: 'alerts',
    summary: 'Alerts fire when distance crosses configurable thresholds.',
    explanation:
      'We define zones: caution, warning, and critical. When the measured distance drops below a threshold, the corresponding alert fires. Hysteresis prevents flicker: the alert only clears when the distance rises above the threshold plus a deadband.',
    interactive: 'thresholds',
    challengeQuestion: 'Why does a small hysteresis prevent alert flicker near a threshold?',
    challengeAnswer: 'Because the alert requires the distance to rise beyond the threshold + hysteresis before it clears, preventing rapid on/off cycling.',
  },
  {
    id: 'noise',
    title: 'Measurement Uncertainty',
    category: 'sensors',
    summary: 'Real sensors have noise — measured distance differs from true distance.',
    explanation:
      'We model uncertainty as Gaussian noise added to the true distance. With a seed, the noise is reproducible. A false positive is an alert triggered by noise when no real obstacle warrants it; a false negative is a missed detection because noise masked a real obstacle.',
    interactive: 'noise',
    challengeQuestion: 'If uncertainty is ±5cm and the true distance is 50cm, what measured distances might you see?',
    challengeAnswer: 'Mostly between 45cm and 55cm (1 standard deviation), occasionally further.',
  },
  {
    id: 'energy',
    title: 'Energy-Budget Estimation',
    category: 'energy',
    summary: 'How long will the battery last given the component power draws?',
    explanation:
      'Battery capacity (mAh) × voltage (V) = total energy (mWh). Total power draw (mW) of all components gives the discharge rate. Operating time = energy / power. Reducing sampling frequency or alert intensity extends battery life.',
    interactive: 'energy',
    challengeQuestion: 'If a 2000 mAh / 3.7V battery powers a 100 mW device, how long does it last?',
    challengeAnswer: '2000 × 3.7 / 100 = 74 hours',
  },
  {
    id: 'experiment',
    title: 'Experimental Design',
    category: 'experimentation',
    summary: 'How to design a fair test: one variable, controlled conditions.',
    explanation:
      'Change only one variable (the independent variable) at a time. Keep everything else constant (controlled variables). Measure defined metrics (evaluation metrics). Compare expected vs. observed results. Document limitations and conclusions.',
    interactive: 'experiment',
    challengeQuestion: 'Why should you change only one variable at a time?',
    challengeAnswer: 'So you can attribute any difference in outcome to that single variable.',
  },
];

const CATEGORY_ICON: Record<string, typeof Ruler> = {
  geometry: Ruler,
  sensors: Waves,
  alerts: Activity,
  energy: Zap,
  experimentation: FlaskConical,
};

export function Learn() {
  const [activeId, setActiveId] = useState(TOPICS[0].id);
  const active = TOPICS.find((t) => t.id === activeId)!;

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
      <SectionLabel>Learning Mode</SectionLabel>
      <h1 className="font-display text-3xl text-ink mt-1">How it works</h1>
      <p className="text-sm text-muted mt-1 max-w-2xl mb-6">
        Interactive explanations of the computer science and engineering principles behind SenseSpace. Adjust the controls
        and watch the concepts come alive.
      </p>

      <div className="grid lg:grid-cols-[240px_1fr] gap-4">
        <div className="space-y-1">
          {TOPICS.map((t) => {
            const Icon = CATEGORY_ICON[t.category] ?? GraduationCap;
            return (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  activeId === t.id ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-sand/60'
                }`}
              >
                <Icon size={16} className={activeId === t.id ? 'text-teal-pale' : 'text-blue'} />
                <span className="text-sm">{t.title}</span>
              </button>
            );
          })}
        </div>

        <div>
          <Card className="p-6">
            <h2 className="font-display text-2xl text-ink mb-1">{active.title}</h2>
            <p className="text-sm text-muted mb-4">{active.summary}</p>
            <p className="text-sm text-ink-soft leading-relaxed mb-6">{active.explanation}</p>
            <InteractiveExample topic={active} />
            <div className="mt-6 bg-blue/5 border border-blue/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-deep mb-1">
                <Triangle size={14} /> Challenge question
              </div>
              <p className="text-sm text-ink-soft mb-2">{active.challengeQuestion}</p>
              <details className="text-sm text-teal-deep cursor-pointer">
                <summary className="font-medium">Reveal answer</summary>
                <p className="mt-1">{active.challengeAnswer}</p>
              </details>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InteractiveExample({ topic }: { topic: LearningTopic }) {
  if (topic.interactive === 'distance') return <DistanceExample />;
  if (topic.interactive === 'detection-angle') return <AngleExample />;
  if (topic.interactive === 'thresholds') return <ThresholdExample />;
  if (topic.interactive === 'noise') return <NoiseExample />;
  if (topic.interactive === 'energy') return <EnergyExample />;
  return <ExperimentExample />;
}

function DistanceExample() {
  const [x, setX] = useState(100);
  const [y, setY] = useState(60);
  const d = Math.hypot(x, y);
  return (
    <div>
      <div className="bg-grid-fine rounded-lg p-4 mb-3">
        <svg viewBox="-50 -50 300 200" width="100%" height={150} role="img" aria-label="Distance diagram">
          <line x1="0" y1="0" x2={x} y2={y} stroke="#567A92" strokeWidth="2" strokeDasharray="4 3" />
          <circle cx="0" cy="0" r="6" fill="#252D32" />
          <circle cx={x} cy={y} r="10" fill="#C9C0AE" stroke="#A89E84" />
          <text x={x / 2} y={y / 2 - 8} fontSize="14" fontFamily="monospace" fill="#567A92">{d.toFixed(0)}cm</text>
        </svg>
      </div>
      <Slider value={x} min={20} max={200} ariaLabel="Obstacle X" onChange={setX} format={(v) => `x=${v}`} />
      <div className="h-2" />
      <Slider value={y} min={-100} max={100} ariaLabel="Obstacle Y" onChange={setY} format={(v) => `y=${v}`} />
      <p className="text-sm font-mono text-ink mt-2">Distance = √({x}² + {y}²) = {d.toFixed(1)} cm</p>
    </div>
  );
}

function AngleExample() {
  const [angle, setAngle] = useState(15);
  const [range, setRange] = useState(150);
  const config = useMemo(() => {
    const c = createDefaultConfig();
    const s = c.components[0] as { id: string; rangeCm: number; detectionAngleDeg: number };
    s.rangeCm = range;
    s.detectionAngleDeg = angle;
    return c;
  }, [angle, range]);
  return (
    <div>
      <SimulationArena environment={ENV_OPEN_LAB} config={config} user={ENV_OPEN_LAB.user} height={200} showLabels={false} />
      <Slider value={angle} min={3} max={75} ariaLabel="Half-angle" onChange={setAngle} format={(v) => `${v}°`} />
      <div className="h-2" />
      <Slider value={range} min={50} max={300} ariaLabel="Range" onChange={setRange} format={(v) => `${v}cm`} />
      <p className="text-sm text-muted mt-2">Wider angles cover more area but lose directional precision and may catch walls.</p>
    </div>
  );
}

function ThresholdExample() {
  const [dist, setDist] = useState(100);
  const [hyst, setHyst] = useState(4);
  const caution = 120, warning = 70, critical = 35;
  const level = dist <= critical ? 'critical' : dist <= warning ? 'warning' : dist <= caution ? 'caution' : 'none';
  const colors = { none: '#75A99C', caution: '#567A92', warning: '#D98968', critical: '#D98968' };
  return (
    <div>
      <div className="relative h-24 bg-grid-fine rounded-lg overflow-hidden mb-3">
        <div className="absolute inset-0 flex">
          <div style={{ width: `${(critical / 200) * 100}%` }} className="bg-clay/30" />
          <div style={{ width: `${((warning - critical) / 200) * 100}%` }} className="bg-clay-pale" />
          <div style={{ width: `${((caution - warning) / 200) * 100}%` }} className="bg-blue-pale" />
          <div className="flex-1 bg-teal-pale" />
        </div>
        <div className="absolute top-0 bottom-0 w-1 bg-ink" style={{ left: `${(dist / 200) * 100}%` }} />
        <div className="absolute bottom-1 left-2 text-xs font-mono" style={{ color: colors[level] }}>{level} · {dist}cm</div>
      </div>
      <Slider value={dist} min={10} max={200} ariaLabel="Distance" onChange={setDist} format={(v) => `${v}cm`} />
      <div className="h-2" />
      <Slider value={hyst} min={0} max={20} ariaLabel="Hysteresis" onChange={setHyst} format={(v) => `${v}cm`} />
      <p className="text-sm text-muted mt-2">With hysteresis = {hyst}cm, the alert clears only when distance exceeds the threshold by {hyst}cm.</p>
    </div>
  );
}

function NoiseExample() {
  const [uncertainty, setUncertainty] = useState(3);
  const samples = useMemo(() => {
    const arr: number[] = [];
    let state = 42;
    for (let i = 0; i < 40; i++) {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      const u = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      state = (state + 0x6d2b79f5) | 0;
      let t2 = Math.imul(state ^ (state >>> 15), 1 | state);
      t2 = (t + Math.imul(t2 ^ (t2 >>> 7), 61 | t2)) ^ t2;
      const u2 = ((t2 ^ (t2 >>> 14)) >>> 0) / 4294967296;
      const z = Math.sqrt(-2 * Math.log(u || 0.0001)) * Math.cos(2 * Math.PI * u2);
      arr.push(50 + z * uncertainty);
    }
    return arr;
  }, [uncertainty]);
  return (
    <div>
      <div className="bg-grid-fine rounded-lg p-3 h-32 mb-3">
        <svg viewBox="0 0 400 100" width="100%" height="100%" role="img" aria-label="Noise samples">
          <line x1="0" y1="50" x2="400" y2="50" stroke="#75A99C" strokeWidth="1" strokeDasharray="3 3" />
          {samples.map((v, i) => (
            <circle key={i} cx={(i / samples.length) * 400} cy={100 - (v / 100) * 100} r="2" fill="#567A92" />
          ))}
        </svg>
      </div>
      <Slider value={uncertainty} min={0} max={15} step={0.5} ariaLabel="Uncertainty" onChange={setUncertainty} format={(v) => `±${v}cm`} />
      <p className="text-sm text-muted mt-2">True distance is 50cm. Each dot is a measurement. Higher uncertainty = more scatter. False positives and negatives become more likely.</p>
    </div>
  );
}

function EnergyExample() {
  const [capacity, setCapacity] = useState(2000);
  const [draw, setDraw] = useState(100);
  const hours = (capacity * 3.7) / draw;
  return (
    <div>
      <Slider value={capacity} min={200} max={5000} step={100} ariaLabel="Capacity" onChange={setCapacity} format={(v) => `${v}mAh`} />
      <div className="h-2" />
      <Slider value={draw} min={10} max={500} step={5} ariaLabel="Power draw" onChange={setDraw} format={(v) => `${v}mW`} />
      <p className="text-sm font-mono text-ink mt-2">Operating time = {capacity} × 3.7V ÷ {draw}mW = {hours.toFixed(1)} hours</p>
      <div className="mt-2 h-3 bg-sand rounded-full overflow-hidden">
        <div className="h-full bg-teal transition-all" style={{ width: `${Math.min(100, (hours / 100) * 100)}%` }} />
      </div>
    </div>
  );
}

function ExperimentExample() {
  return (
    <div className="bg-grid-fine rounded-lg p-4">
      <ol className="space-y-2 text-sm text-ink-soft">
        <li><span className="font-mono text-blue-deep">1.</span> Define a research question.</li>
        <li><span className="font-mono text-blue-deep">2.</span> State a hypothesis.</li>
        <li><span className="font-mono text-blue-deep">3.</span> Change only the independent variable.</li>
        <li><span className="font-mono text-blue-deep">4.</span> Keep controlled variables constant.</li>
        <li><span className="font-mono text-blue-deep">5.</span> Measure evaluation metrics.</li>
        <li><span className="font-mono text-blue-deep">6.</span> Compare expected vs. observed.</li>
        <li><span className="font-mono text-blue-deep">7.</span> Document limitations and conclusions.</li>
      </ol>
    </div>
  );
}
