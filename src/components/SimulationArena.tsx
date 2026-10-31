// SenseSpace — Shared SVG visualization: simulation arena
// Renders the environment, obstacles, user, sensor cones, detection lines, readings.

import { useMemo } from 'react';
import type { DeviceConfig, SensorReading, SimEnvironment, SimulationUser, UltrasonicSensor, Vec2 } from '../types';
import { listSensors, DEFAULT_PLACEMENT, sensorWorldHeading, sensorWorldPosition } from '../engine/simulation';
import { dist, normalizeAngleDeg, rad } from '../engine/geometry';

export interface ArenaProps {
  environment: SimEnvironment;
  config: DeviceConfig;
  user: SimulationUser;
  readings?: SensorReading[];
  showGrid?: boolean;
  showLabels?: boolean;
  height?: number;
  showDetectionLines?: boolean;
  selectedSensorId?: string;
  onSelectSensor?: (id: string) => void;
  className?: string;
}

export function SimulationArena({
  environment,
  config,
  user,
  readings = [],
  showGrid = true,
  showLabels = true,
  height = 360,
  showDetectionLines = true,
  selectedSensorId,
  onSelectSensor,
  className = '',
}: ArenaProps) {
  const sensors = listSensors(config);
  const W = environment.widthCm;
  const H = environment.heightCm;

  // SVG viewBox uses environment coords directly, centered at 0,0.
  const viewBox = `${-W / 2 - 10} ${-H / 2 - 10} ${W + 20} ${H + 20}`;
  const aspect = W / H;
  const width = height * aspect;

  return (
    <div className={`relative ${className}`} style={{ width: '100%' }}>
      <svg
        viewBox={viewBox}
        width="100%"
        height={height}
        role="img"
        aria-label="Simulation environment with obstacles and sensor detection cones"
        className="block w-full"
        style={{ maxHeight: height }}
      >
        {/* grid */}
        {showGrid && <ArenaGrid width={W} height={H} />}

        {/* walls */}
        {environment.walls.map((w) => (
          <rect
            key={w.id}
            x={w.x}
            y={w.y}
            width={w.w}
            height={w.h}
            fill="#E8E0D1"
            stroke="#D6CBB4"
            strokeWidth="1"
          />
        ))}

        {/* obstacles */}
        {environment.obstacles.map((o) => (
          <ObstacleShape key={o.id} obs={o} showLabel={showLabels} />
        ))}

        {/* sensor cones */}
        {sensors.map((s) => (
          <SensorCone
            key={s.id}
            sensor={s}
            config={config}
            user={user}
            highlighted={selectedSensorId === s.id}
            onSelect={onSelectSensor ? () => onSelectSensor(s.id) : undefined}
          />
        ))}

        {/* detection lines */}
        {showDetectionLines &&
          readings.map((r) => {
            if (r.actualDistanceCm === null) return null;
            return (
              <line
                key={`line-${r.sensorId}-${r.timeMs}`}
                x1={r.position.x}
                y1={r.position.y}
                x2={r.position.x + Math.cos(rad(r.orientationDeg)) * r.actualDistanceCm}
                y2={r.position.y + Math.sin(rad(r.orientationDeg)) * r.actualDistanceCm}
                stroke={alertColor(r.alertLevel)}
                strokeWidth="1.4"
                strokeDasharray="4 3"
                opacity="0.85"
              />
            );
          })}

        {/* detected obstacle markers */}
        {readings.map((r) => {
          if (r.actualDistanceCm === null) return null;
          const hx = r.position.x + Math.cos(rad(r.orientationDeg)) * r.actualDistanceCm;
          const hy = r.position.y + Math.sin(rad(r.orientationDeg)) * r.actualDistanceCm;
          return (
            <g key={`hit-${r.sensorId}`}>
              <circle cx={hx} cy={hy} r="5" fill={alertColor(r.alertLevel)} stroke="#252D32" strokeWidth="1" />
              {showLabels && (
                <text x={hx + 8} y={hy + 4} fontSize="9" fontFamily="monospace" fill="#252D32">
                  {r.measuredDistanceCm !== null ? `${r.measuredDistanceCm.toFixed(0)}cm` : '—'}
                </text>
              )}
            </g>
          );
        })}

        {/* user */}
        <UserMarker user={user} />

        {/* axis label */}
        <text x={-W / 2 + 4} y={-H / 2 + 12} fontSize="10" fontFamily="monospace" fill="#9AA4A9">
          0,0
        </text>
      </svg>
    </div>
  );
}

function ArenaGrid({ width, height }: { width: number; height: number }) {
  const lines: React.ReactNode[] = [];
  const step = 50;
  for (let x = -width / 2; x <= width / 2; x += step) {
    lines.push(<line key={`gx${x}`} x1={x} y1={-height / 2} x2={x} y2={height / 2} stroke="#E6E1D5" strokeWidth="0.5" />);
  }
  for (let y = -height / 2; y <= height / 2; y += step) {
    lines.push(<line key={`gy${y}`} x1={-width / 2} y1={y} x2={width / 2} y2={y} stroke="#E6E1D5" strokeWidth="0.5" />);
  }
  // axes
  lines.push(<line key="ax" x1={-width / 2} y1={0} x2={width / 2} y2={0} stroke="#DAD4C4" strokeWidth="0.8" />);
  lines.push(<line key="ay" x1={0} y1={-height / 2} x2={0} y2={height / 2} stroke="#DAD4C4" strokeWidth="0.8" />);
  return <g>{lines}</g>;
}

function ObstacleShape({ obs, showLabel }: { obs: import('../types').Obstacle; showLabel: boolean }) {
  const fill = obs.kind === 'wall' ? '#E8E0D1' : obs.kind === 'overhang' ? '#D6CBB4' : '#C9C0AE';
  const stroke = obs.kind === 'overhang' ? '#B8AC92' : '#A89E84';
  return (
    <g>
      <rect x={obs.x} y={obs.y} width={obs.w} height={obs.h} fill={fill} stroke={stroke} strokeWidth="1" rx="2" />
      {obs.kind === 'overhang' && (
        <line x1={obs.x} y1={obs.y + obs.h / 2} x2={obs.x + obs.w} y2={obs.y + obs.h / 2} stroke="#8C7F63" strokeWidth="0.8" strokeDasharray="3 2" />
      )}
      {showLabel && obs.label && (
        <text x={obs.x + obs.w / 2} y={obs.y + obs.h / 2 + 3} fontSize="9" fontFamily="monospace" fill="#68747A" textAnchor="middle">
          {obs.label}
        </text>
      )}
    </g>
  );
}

function SensorCone({
  sensor,
  config,
  user,
  highlighted,
  onSelect,
}: {
  sensor: UltrasonicSensor;
  config: DeviceConfig;
  user: SimulationUser;
  highlighted: boolean;
  onSelect?: () => void;
}) {
  const placement = config.sensorPositions[sensor.id] ?? DEFAULT_PLACEMENT[sensor.position];
  const origin = sensorWorldPosition(user, placement);
  const heading = sensorWorldHeading(user, sensor.orientationDeg);
  const r = sensor.rangeCm;
  const half = sensor.detectionAngleDeg;

  // cone as a path (pie slice)
  const a1 = rad(heading - half);
  const a2 = rad(heading + half);
  const x1 = origin.x + Math.cos(a1) * r;
  const y1 = origin.y + Math.sin(a1) * r;
  const x2 = origin.x + Math.cos(a2) * r;
  const y2 = origin.y + Math.sin(a2) * r;
  const largeArc = half * 2 > 180 ? 1 : 0;
  const path = `M ${origin.x} ${origin.y} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

  return (
    <g
      onClick={onSelect}
      style={{ cursor: onSelect ? 'pointer' : 'default' }}
      opacity={highlighted ? 1 : 0.55}
    >
      <path d={path} fill={highlighted ? '#567A92' : '#A9BECB'} fillOpacity="0.12" stroke="#567A92" strokeWidth="0.8" strokeDasharray="3 2" />
      {/* range boundary arc */}
      <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`} fill="none" stroke="#567A92" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.6" />
      {/* sensor marker */}
      <circle cx={origin.x} cy={origin.y} r="4" fill={highlighted ? '#567A92' : '#44667C'} stroke="#F7F5EF" strokeWidth="1.5" />
      {/* heading line */}
      <line x1={origin.x} y1={origin.y} x2={origin.x + Math.cos(rad(heading)) * 14} y2={origin.y + Math.sin(rad(heading)) * 14} stroke="#252D32" strokeWidth="1.2" />
    </g>
  );
}

function UserMarker({ user }: { user: SimulationUser }) {
  const a = rad(user.facingDeg);
  return (
    <g>
      {/* body */}
      <circle cx={user.x} cy={user.y} r="10" fill="#252D32" stroke="#F7F5EF" strokeWidth="2" />
      {/* facing arrow */}
      <path
        d={`M ${user.x} ${user.y} L ${user.x + Math.cos(a) * 18} ${user.y + Math.sin(a) * 18}`}
        stroke="#252D32"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <polygon
        points={`${user.x + Math.cos(a) * 18},${user.y + Math.sin(a) * 18} ${user.x + Math.cos(a - 0.4) * 12},${user.y + Math.sin(a - 0.4) * 12} ${user.x + Math.cos(a + 0.4) * 12},${user.y + Math.sin(a + 0.4) * 12}`}
        fill="#252D32"
      />
    </g>
  );
}

export function alertColor(level: string): string {
  switch (level) {
    case 'critical': return '#D98968';
    case 'warning': return '#D98968';
    case 'caution': return '#567A92';
    default: return '#75A99C';
  }
}

// --- Legend ----------------------------------------------------

export function ArenaLegend() {
  const items = [
    { color: '#252D32', shape: 'circle', label: 'Simulated user' },
    { color: '#C9C0AE', shape: 'rect', label: 'Obstacle' },
    { color: '#D6CBB4', shape: 'rect', label: 'Overhang' },
    { color: '#567A92', shape: 'cone', label: 'Detection cone' },
    { color: '#75A99C', shape: 'line', label: 'Detection (clear)' },
    { color: '#D98968', shape: 'line', label: 'Detection (alert)' },
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted font-mono">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-1.5">
          {i.shape === 'circle' && <span className="w-2.5 h-2.5 rounded-full" style={{ background: i.color }} />}
          {i.shape === 'rect' && <span className="w-3 h-2.5 rounded-sm" style={{ background: i.color }} />}
          {i.shape === 'cone' && <span className="w-3 h-2.5 rounded-sm opacity-30" style={{ background: i.color, border: `1px dashed ${i.color}` }} />}
          {i.shape === 'line' && <span className="w-3 h-0.5" style={{ background: i.color }} />}
          {i.label}
        </div>
      ))}
    </div>
  );
}

// --- Device preview (top-down body diagram) --------------------

export function DevicePreview({ config, size = 220 }: { config: DeviceConfig; size?: number }) {
  const sensors = listSensors(config);
  // Device body drawn as a rounded rectangle representing the hat brim / band
  const bodyW = 120;
  const bodyH = 90;

  return (
    <svg viewBox="-80 -70 160 140" width={size} height={size * 0.875} role="img" aria-label="Device preview showing sensor positions">
      {/* grid */}
      <defs>
        <pattern id="dp-grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#E6E1D5" strokeWidth="0.4" />
        </pattern>
      </defs>
      <rect x="-80" y="-70" width="160" height="140" fill="url(#dp-grid)" />

      {/* hat shape */}
      <ellipse cx="0" cy="0" rx={bodyW / 2} ry={bodyH / 2} fill="#F7F5EF" stroke="#567A92" strokeWidth="1.5" />
      <ellipse cx="0" cy="-8" rx={bodyW / 2.5} ry={bodyH / 3.2} fill="#E8E0D1" stroke="#D6CBB4" strokeWidth="1" />
      {/* center mark */}
      <circle cx="0" cy="0" r="2" fill="#252D32" />
      <text x="0" y="40" fontSize="8" fontFamily="monospace" fill="#68747A" textAnchor="middle">device body (top view)</text>

      {/* sensors */}
      {sensors.map((s) => {
        const p = config.sensorPositions[s.id] ?? DEFAULT_PLACEMENT[s.position];
        if (!p) return null;
        // scale device-local cm to preview coords (roughly 1cm = 1.2px)
        const scale = 1.2;
        const px = p.x * scale;
        const py = p.y * scale;
        return (
          <g key={s.id}>
            {/* cone mini */}
            <path
              d={miniConePath(px, py, s.orientationDeg, s.detectionAngleDeg, 28)}
              fill="#567A92"
              fillOpacity="0.12"
              stroke="#567A92"
              strokeWidth="0.6"
              strokeDasharray="2 2"
            />
            <circle cx={px} cy={py} r="4" fill="#D98968" stroke="#252D32" strokeWidth="1" />
            <text x={px} y={py - 7} fontSize="7" fontFamily="monospace" fill="#252D32" textAnchor="middle">
              {s.position}
            </text>
          </g>
        );
      })}

      {/* alert module marker (if present) */}
      {config.components.find((c) => c.kind === 'alert') && (
        <g>
          <rect x="-6" y="22" width="12" height="8" rx="1" fill="#75A99C" stroke="#5E8C7F" strokeWidth="0.8" />
          <text x="0" y="28.5" fontSize="5" fontFamily="monospace" fill="#F7F5EF" textAnchor="middle">ALT</text>
        </g>
      )}
    </svg>
  );
}

function miniConePath(x: number, y: number, headingDeg: number, halfDeg: number, r: number): string {
  const a1 = rad(headingDeg - halfDeg);
  const a2 = rad(headingDeg + halfDeg);
  const x1 = x + Math.cos(a1) * r;
  const y1 = y + Math.sin(a1) * r;
  const x2 = x + Math.cos(a2) * r;
  const y2 = y + Math.sin(a2) * r;
  const large = halfDeg * 2 > 180 ? 1 : 0;
  return `M ${x} ${y} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}
