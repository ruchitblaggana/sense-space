// SenseSpace — Design Bench
// Assemble a virtual assistive device: component library, visual preview, contextual inspector.

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Battery as BatteryIcon,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Copy,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Volume2,
  Vibrate,
  Radio,
  Wrench,
} from 'lucide-react';
import { useStore } from '../store';
import type { AlertModule, DeviceComponent, Microcontroller, SensorPosition, UltrasonicSensor } from '../types';
import { DEFAULT_THRESHOLDS } from '../types';
import {
  createAlertModule,
  createBattery,
  createDefaultConfig,
  createMicrocontroller,
  createUltrasonicSensor,
  uid,
} from '../defaults';
import { DEFAULT_SENSOR_ID } from '../defaults';
import { DEFAULT_PLACEMENT, listSensors, listAlertModules, listControllers, listBatteries, estimatePowerDraw, getBatteryCapacity, getBatteryVoltage, estimateOperatingHours } from '../engine/simulation';
import { validateConfig } from '../engine/validation';
import { Badge, Button, Card, Field, Notice, SectionLabel, Select, Slider } from '../components/ui';
import { DevicePreview } from '../components/SimulationArena';

const POSITIONS: SensorPosition[] = ['front', 'front-left', 'front-right', 'top', 'left', 'right'];

export function DesignBench() {
  const { config, setConfig, updateConfig, saveCurrentDesign, notify, setView } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sensors = listSensors(config);
  const alerts = listAlertModules(config);
  const mcus = listControllers(config);
  const batts = listBatteries(config);

  const validation = useMemo(() => validateConfig(config), [config]);
  const selected = config.components.find((c) => c.id === selectedId) ?? null;

  const power = estimatePowerDraw(config);
  const capacity = getBatteryCapacity(config);
  const voltage = getBatteryVoltage(config);
  const hours = estimateOperatingHours(config);

  function addComponent(kind: DeviceComponent['kind']) {
    let comp: DeviceComponent;
    if (kind === 'ultrasonic') {
      comp = createUltrasonicSensor({ name: `Sensor ${sensors.length + 1}`, position: 'front' });
      updateConfig({
        components: [...config.components, comp],
        sensorPositions: { ...config.sensorPositions, [comp.id]: { ...DEFAULT_PLACEMENT.front, angleDeg: 0 } },
      });
      setSelectedId(comp.id);
    } else if (kind === 'alert') {
      comp = createAlertModule({ name: `Alert ${alerts.length + 1}` });
      updateConfig({ components: [...config.components, comp] });
      setSelectedId(comp.id);
    } else if (kind === 'mcu') {
      comp = createMicrocontroller({ name: `Controller ${mcus.length + 1}` });
      updateConfig({ components: [...config.components, comp] });
      setSelectedId(comp.id);
    } else {
      comp = createBattery({ name: `Battery ${batts.length + 1}` });
      updateConfig({ components: [...config.components, comp] });
      setSelectedId(comp.id);
    }
  }

  function removeComponent(id: string) {
    updateConfig({
      components: config.components.filter((c) => c.id !== id),
      sensorPositions: Object.fromEntries(Object.entries(config.sensorPositions).filter(([k]) => k !== id)),
    });
    if (selectedId === id) setSelectedId(null);
  }

  function updateComponent(id: string, patch: Record<string, unknown>) {
    updateConfig({
      components: config.components.map((c) => (c.id === id ? ({ ...c, ...patch } as DeviceComponent) : c)),
    });
  }

  function duplicateComponent(id: string) {
    const c = config.components.find((x) => x.id === id);
    if (!c) return;
    const copy = { ...c, id: uid(c.kind), name: `${c.name} (copy)` } as DeviceComponent;
    const newPositions = c.kind === 'ultrasonic' ? { ...config.sensorPositions, [copy.id]: { ...DEFAULT_PLACEMENT[(c as UltrasonicSensor).position], angleDeg: 0 } } : config.sensorPositions;
    updateConfig({ components: [...config.components, copy], sensorPositions: newPositions });
    setSelectedId(copy.id);
  }

  function resetConfig() {
    setConfig(createDefaultConfig());
    setSelectedId(null);
    notify('Configuration reset to the default prototype.', 'info');
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <SectionLabel>Design Bench</SectionLabel>
        <h1 className="font-display text-3xl text-ink mt-1">Assemble your device</h1>
        <p className="text-sm text-muted mt-1 max-w-2xl">
          Select components, position sensors, tune detection ranges, and configure alerts. This is an interactive
          prototyping bench — not a validated assistive product.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_320px] gap-4">
        {/* Component library */}
        <div className="space-y-4">
          <Card className="p-4">
            <SectionLabel className="mb-3 block">Add component</SectionLabel>
            <div className="space-y-2">
              <AddButton icon={Radio} label="Ultrasonic Sensor" onClick={() => addComponent('ultrasonic')} />
              <AddButton icon={Vibrate} label="Alert Module" onClick={() => addComponent('alert')} />
              <AddButton icon={Cpu} label="Microcontroller" onClick={() => addComponent('mcu')} />
              <AddButton icon={BatteryIcon} label="Battery" onClick={() => addComponent('battery')} />
            </div>
          </Card>

          <Card className="p-4">
            <SectionLabel className="mb-3 block">Installed</SectionLabel>
            <div className="space-y-1.5">
              {config.components.length === 0 && <p className="text-xs text-muted">No components yet.</p>}
              {config.components.map((c) => (
                <ComponentRow
                  key={c.id}
                  comp={c}
                  selected={selectedId === c.id}
                  onSelect={() => setSelectedId(c.id)}
                  onRemove={() => removeComponent(c.id)}
                  onDuplicate={() => duplicateComponent(c.id)}
                />
              ))}
            </div>
          </Card>
        </div>

        {/* Work surface */}
        <div className="space-y-4">
          <Card className="p-5 bg-grid-fine">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-display text-lg text-ink">{config.name}</h2>
                <p className="text-xs text-muted mt-0.5">{config.components.length} components · {sensors.length} sensor(s)</p>
              </div>
              <Badge tone={validation.valid ? 'teal' : 'clay'}>{validation.valid ? 'Valid' : 'Issues found'}</Badge>
            </div>
            <div className="flex flex-col items-center py-2">
              <DevicePreview config={config} size={300} />
              <p className="text-xs text-muted font-mono mt-2">Top-down device view · sensor positions shown in device frame</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              <Button size="sm" variant="teal" onClick={() => saveCurrentDesign()}>
                <Save size={14} /> Save
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setView('simulation')}>
                <ChevronRight size={14} /> Test in simulation
              </Button>
              <Button size="sm" variant="ghost" onClick={resetConfig}>
                <RotateCcw size={14} /> Reset
              </Button>
            </div>
          </Card>

          {/* Validation + battery summary */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="p-4">
              <SectionLabel className="mb-2 block">Design validation</SectionLabel>
              {validation.issues.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-teal-deep">
                  <CheckCircle2 size={16} /> No issues detected.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {validation.issues.map((iss, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      {iss.level === 'error' ? (
                        <AlertTriangle size={14} className="text-clay-deep mt-0.5 shrink-0" />
                      ) : (
                        <AlertTriangle size={14} className="text-blue-deep mt-0.5 shrink-0" />
                      )}
                      <span className={iss.level === 'error' ? 'text-clay-deep' : 'text-blue-deep'}>{iss.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card className="p-4">
              <SectionLabel className="mb-2 block">Power budget</SectionLabel>
              <dl className="text-sm space-y-1">
                <div className="flex justify-between"><dt className="text-muted">Total draw</dt><dd className="font-mono text-ink">{power.toFixed(0)} mW</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Battery</dt><dd className="font-mono text-ink">{batts.length > 0 ? `${capacity} mAh / ${voltage} V` : '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Est. operating time</dt><dd className="font-mono text-ink">{hours !== null ? `${hours.toFixed(1)} h` : '—'}</dd></div>
              </dl>
              <p className="text-[11px] text-muted mt-2 leading-snug">Educational estimates only. Power figures are configurable simulated values, not measured hardware performance.</p>
            </Card>
          </div>

          <Notice tone="warning">
            This is a virtual prototype. SenseSpace does not connect to physical hardware and the configuration is not a validated assistive device.
          </Notice>
        </div>

        {/* Inspector */}
        <div>
          <Card className="p-4 sticky top-20">
            <SectionLabel className="mb-3 block">Inspector</SectionLabel>
            {!selected && <p className="text-sm text-muted">Select a component to edit its properties.</p>}
            {selected && (
              <ComponentInspector
                comp={selected}
                config={config}
                onChange={(patch) => updateComponent(selected.id, patch)}
                onPositionChange={(x, y) =>
                  updateConfig({
                    sensorPositions: {
                      ...config.sensorPositions,
                      [selected.id]: { x, y, angleDeg: (selected as UltrasonicSensor).orientationDeg ?? 0 },
                    },
                  })
                }
              />
            )}
          </Card>

          <Card className="p-4 mt-4">
            <SectionLabel className="mb-3 block">Alert thresholds</SectionLabel>
            <ThresholdEditor
              thresholds={config.alertThresholds}
              onChange={(t) => updateConfig({ alertThresholds: t })}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

function AddButton({ icon: Icon, label, onClick }: { icon: typeof Radio; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-paper text-sm text-ink hover:bg-sand transition-colors"
    >
      <Icon size={16} className="text-blue" />
      <span className="flex-1 text-left">{label}</span>
      <Plus size={14} className="text-muted" />
    </button>
  );
}

function ComponentRow({
  comp,
  selected,
  onSelect,
  onRemove,
  onDuplicate,
}: {
  comp: DeviceComponent;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const icons: Record<string, typeof Radio> = {
    ultrasonic: Radio,
    alert: Vibrate,
    mcu: Cpu,
    battery: BatteryIcon,
  };
  const Icon = icons[comp.kind];
  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${selected ? 'bg-blue/10 border border-blue/30' : 'hover:bg-sand/60 border border-transparent'}`}>
      <button onClick={onSelect} className="flex items-center gap-2 flex-1 min-w-0 text-left">
        <Icon size={14} className="text-blue shrink-0" />
        <span className="text-sm text-ink truncate">{comp.name}</span>
      </button>
      <button onClick={onDuplicate} aria-label={`Duplicate ${comp.name}`} className="text-muted hover:text-ink p-0.5">
        <Copy size={12} />
      </button>
      <button onClick={onRemove} aria-label={`Remove ${comp.name}`} className="text-muted hover:text-clay-deep p-0.5">
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function ComponentInspector({
  comp,
  config,
  onChange,
  onPositionChange,
}: {
  comp: DeviceComponent;
  config: import('../types').DeviceConfig;
  onChange: (patch: Record<string, unknown>) => void;
  onPositionChange?: (x: number, y: number) => void;
}) {
  if (comp.kind === 'ultrasonic') return <SensorInspector sensor={comp} config={config} onChange={onChange} onPositionChange={onPositionChange} />;
  if (comp.kind === 'alert') return <AlertInspector alert={comp} onChange={onChange} />;
  if (comp.kind === 'mcu') return <McuInspector mcu={comp} onChange={onChange} />;
  return <BatteryInspector batt={comp} onChange={onChange} />;
}

function SensorInspector({
  sensor,
  config,
  onChange,
  onPositionChange,
}: {
  sensor: UltrasonicSensor;
  config: import('../types').DeviceConfig;
  onChange: (patch: Record<string, unknown>) => void;
  onPositionChange?: (x: number, y: number) => void;
}) {
  const placement = config.sensorPositions[sensor.id] ?? DEFAULT_PLACEMENT[sensor.position];
  return (
    <div className="space-y-4">
      <div>
        <Field label="Name">
          <input
            type="text"
            value={sensor.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm"
          />
        </Field>
      </div>
      <Field label="Position on device">
        <Select
          value={sensor.position}
          ariaLabel="Sensor position"
          options={POSITIONS.map((p) => ({ value: p, label: p }))}
          onChange={(v) => {
            onChange({ position: v });
            const defaults = DEFAULT_PLACEMENT[v];
            onPositionChange?.(defaults.x, defaults.y);
          }}
        />
      </Field>
      <Field label="Orientation" hint="degrees from forward">
        <Slider value={sensor.orientationDeg} min={-180} max={180} step={5} ariaLabel="Sensor orientation" onChange={(v) => onChange({ orientationDeg: v })} format={(v) => `${v}°`} />
      </Field>
      <Field label="Detection range" hint="cm">
        <Slider value={sensor.rangeCm} min={20} max={500} step={10} ariaLabel="Detection range" onChange={(v) => onChange({ rangeCm: v })} format={(v) => `${v}cm`} />
      </Field>
      <Field label="Detection half-angle" hint="degrees">
        <Slider value={sensor.detectionAngleDeg} min={3} max={90} step={1} ariaLabel="Detection angle" onChange={(v) => onChange({ detectionAngleDeg: v })} format={(v) => `${v}°`} />
      </Field>
      <Field label="Measurement interval" hint="ms">
        <Slider value={sensor.intervalMs} min={20} max={2000} step={10} ariaLabel="Measurement interval" onChange={(v) => onChange({ intervalMs: v })} format={(v) => `${v}ms`} />
      </Field>
      <Field label="Measurement uncertainty" hint="±cm (1σ)">
        <Slider value={sensor.uncertaintyCm} min={0} max={20} step={0.5} ariaLabel="Uncertainty" onChange={(v) => onChange({ uncertaintyCm: v })} format={(v) => `${v}cm`} />
      </Field>
      <Field label="Response delay" hint="ms">
        <Slider value={sensor.responseDelayMs} min={0} max={500} step={10} ariaLabel="Response delay" onChange={(v) => onChange({ responseDelayMs: v })} format={(v) => `${v}ms`} />
      </Field>
      <Field label="Power draw" hint="mW">
        <Slider value={sensor.powerDrawMw} min={1} max={100} step={1} ariaLabel="Power draw" onChange={(v) => onChange({ powerDrawMw: v })} format={(v) => `${v}mW`} />
      </Field>

      <PositionEditor x={placement.x} y={placement.y} onChange={(x, y) => onPositionChange?.(x, y)} />
      <p className="text-[11px] text-muted">Position is in device-local centimeters relative to the user center. +x is forward, +y is left.</p>
    </div>
  );
}

function PositionEditor({ x, y, onChange }: { x: number; y: number; onChange: (x: number, y: number) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Field label="X offset">
        <input type="number" value={x} step={1} onChange={(e) => onChange(parseFloat(e.target.value) || 0, y)} className="w-full bg-paper border border-line rounded-lg px-2 py-1.5 text-sm font-mono" />
      </Field>
      <Field label="Y offset">
        <input type="number" value={y} step={1} onChange={(e) => onChange(x, parseFloat(e.target.value) || 0)} className="w-full bg-paper border border-line rounded-lg px-2 py-1.5 text-sm font-mono" />
      </Field>
    </div>
  );
}

function AlertInspector({ alert, onChange }: { alert: AlertModule; onChange: (patch: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Name">
        <input type="text" value={alert.name} onChange={(e) => onChange({ name: e.target.value })} className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm" />
      </Field>
      <Field label="Alert type">
        <Select
          value={alert.type}
          ariaLabel="Alert type"
          options={[
            { value: 'vibration', label: 'Vibration' },
            { value: 'audio', label: 'Audio' },
            { value: 'combined', label: 'Combined' },
          ]}
          onChange={(v) => onChange({ type: v })}
        />
      </Field>
      <Field label="Pattern">
        <Select
          value={alert.pattern}
          ariaLabel="Alert pattern"
          options={[
            { value: 'steady', label: 'Steady' },
            { value: 'pulsed', label: 'Pulsed' },
            { value: 'rising', label: 'Rising' },
            { value: 'triple-burst', label: 'Triple burst' },
          ]}
          onChange={(v) => onChange({ pattern: v })}
        />
      </Field>
      <Field label="Intensity" hint="0–100">
        <Slider value={alert.intensity} min={0} max={100} step={5} ariaLabel="Intensity" onChange={(v) => onChange({ intensity: v })} format={(v) => `${v}%`} />
      </Field>
      <Field label="Repetition interval" hint="ms">
        <Slider value={alert.repetitionMs} min={100} max={3000} step={50} ariaLabel="Repetition" onChange={(v) => onChange({ repetitionMs: v })} format={(v) => `${v}ms`} />
      </Field>
      <Field label="Power draw" hint="mW">
        <Slider value={alert.powerDrawMw} min={1} max={200} step={1} ariaLabel="Power draw" onChange={(v) => onChange({ powerDrawMw: v })} format={(v) => `${v}mW`} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={alert.muted} onChange={(e) => onChange({ muted: e.target.checked })} className="accent-blue" />
        {alert.type === 'audio' || alert.type === 'combined' ? 'Mute audio output' : 'Disable this alert'}
      </label>
      {(alert.type === 'audio' || alert.type === 'combined') && (
        <Notice tone="info">A non-audio alternative (vibration or visual cue) is always available. Audio is optional and can be muted.</Notice>
      )}
    </div>
  );
}

function McuInspector({ mcu, onChange }: { mcu: Microcontroller; onChange: (patch: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Name">
        <input type="text" value={mcu.name} onChange={(e) => onChange({ name: e.target.value })} className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm" />
      </Field>
      <Field label="Power draw" hint="mW">
        <Slider value={mcu.powerDrawMw} min={5} max={500} step={5} ariaLabel="Power draw" onChange={(v) => onChange({ powerDrawMw: v })} format={(v) => `${v}mW`} />
      </Field>
      <Field label="Processing delay" hint="ms">
        <Slider value={mcu.processingDelayMs} min={0} max={200} step={5} ariaLabel="Processing delay" onChange={(v) => onChange({ processingDelayMs: v })} format={(v) => `${v}ms`} />
      </Field>
      <Notice tone="info">An Arduino Uno-inspired simulated controller. SenseSpace does not physically connect to or control an actual Arduino.</Notice>
    </div>
  );
}

function BatteryInspector({ batt, onChange }: { batt: import('../types').BatteryModel; onChange: (patch: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Name">
        <input type="text" value={batt.name} onChange={(e) => onChange({ name: e.target.value })} className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm" />
      </Field>
      <Field label="Capacity" hint="mAh">
        <Slider value={batt.capacityMah} min={100} max={10000} step={100} ariaLabel="Capacity" onChange={(v) => onChange({ capacityMah: v })} format={(v) => `${v}mAh`} />
      </Field>
      <Field label="Voltage" hint="V">
        <Slider value={batt.voltageV} min={1.5} max={12} step={0.1} ariaLabel="Voltage" onChange={(v) => onChange({ voltageV: v })} format={(v) => `${v}V`} />
      </Field>
      <Notice tone="info">A simplified battery model. Operating-time estimates are educational and assume constant draw.</Notice>
    </div>
  );
}

function ThresholdEditor({ thresholds, onChange }: { thresholds: import('../types').AlertThresholds; onChange: (t: import('../types').AlertThresholds) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Caution zone" hint="cm — below this, caution">
        <Slider value={thresholds.cautionCm} min={20} max={300} step={5} ariaLabel="Caution" onChange={(v) => onChange({ ...thresholds, cautionCm: v })} format={(v) => `${v}cm`} />
      </Field>
      <Field label="Warning zone" hint="cm">
        <Slider value={thresholds.warningCm} min={10} max={250} step={5} ariaLabel="Warning" onChange={(v) => onChange({ ...thresholds, warningCm: v })} format={(v) => `${v}cm`} />
      </Field>
      <Field label="Critical zone" hint="cm">
        <Slider value={thresholds.criticalCm} min={5} max={150} step={5} ariaLabel="Critical" onChange={(v) => onChange({ ...thresholds, criticalCm: v })} format={(v) => `${v}cm`} />
      </Field>
      <Field label="Hysteresis" hint="cm — prevents flicker near thresholds">
        <Slider value={thresholds.hysteresisCm} min={0} max={20} step={1} ariaLabel="Hysteresis" onChange={(v) => onChange({ ...thresholds, hysteresisCm: v })} format={(v) => `${v}cm`} />
      </Field>
      <div className="flex gap-1 h-3 rounded overflow-hidden mt-2">
        <div className="bg-clay/70 flex-1" title="Critical" />
        <div className="bg-clay-pale flex-1" title="Warning" />
        <div className="bg-blue-pale flex-1" title="Caution" />
        <div className="bg-teal-pale flex-1" title="Clear" />
      </div>
      <div className="flex justify-between text-[10px] font-mono text-muted">
        <span>0</span>
        <span>{thresholds.criticalCm}</span>
        <span>{thresholds.warningCm}</span>
        <span>{thresholds.cautionCm}</span>
        <span>max</span>
      </div>
    </div>
  );
}
