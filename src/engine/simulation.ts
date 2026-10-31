// SenseSpace — Simulation Engine
// Deterministic, configurable, geometry-driven simulation.

import type {
  AlertLevel,
  AlertThresholds,
  DeviceComponent,
  DeviceConfig,
  Obstacle,
  SimEnvironment,
  SimEvent,
  SimFrame,
  SimEvent as Event,
  SensorReading,
  SimulationResult,
  SimulationUser,
  UltrasonicSensor,
  Vec2,
} from '../types';
import {
  aggregateAlertLevel,
  computeAlertLevel,
  obstacleAtTime,
  obstacleInCone,
  rad,
  SeededRandom,
  sensorWorldHeading,
  sensorWorldPosition,
  normalizeAngleDeg,
} from './geometry';

export { sensorWorldPosition, sensorWorldHeading } from './geometry';

export interface SimOptions {
  config: DeviceConfig;
  environment: SimEnvironment;
  durationMs: number;
  stepMs: number; // frame step
  speed: number; // playback multiplier (doesn't affect physics, only how frames are generated)
  seed: number;
  walkingPath?: 'linear' | 'circular' | 'stationary';
}

export interface SimContext {
  options: SimOptions;
  sensors: UltrasonicSensor[];
  rng: SeededRandom;
  // previous alert level per sensor for hysteresis
  prevAlert: Map<string, AlertLevel>;
  // previous detection state per sensor for enter/leave events
  prevDetected: Map<string, string | null>; // sensorId -> obstacleId or null
  // pending readings due to response delay: queued {readyAtMs, reading}
  pendingReadings: Map<string, { readyAtMs: number; reading: SensorReading }>;
  events: Event[];
  energyMah: number;
  totalElapsedMs: number;
}

export function getSensorPlacement(config: DeviceConfig, sensorId: string): { x: number; y: number } | undefined {
  return config.sensorPositions[sensorId];
}

export function listSensors(config: DeviceConfig): UltrasonicSensor[] {
  return config.components.filter((c): c is UltrasonicSensor => c.kind === 'ultrasonic');
}

export function listAlertModules(config: DeviceConfig) {
  return config.components.filter((c) => c.kind === 'alert');
}

export function listControllers(config: DeviceConfig) {
  return config.components.filter((c) => c.kind === 'mcu');
}

export function listBatteries(config: DeviceConfig) {
  return config.components.filter((c) => c.kind === 'battery');
}

// Default sensor placement offsets relative to user center, in cm.
// These are in "device frame" where +x is forward, +y is left.
export const DEFAULT_PLACEMENT: Record<string, { x: number; y: number }> = {
  front: { x: 8, y: 0 },
  'front-left': { x: 6, y: 5 },
  'front-right': { x: 6, y: -5 },
  top: { x: 0, y: 0 },
  left: { x: 0, y: 8 },
  right: { x: 0, y: -8 },
};

export function createSimContext(opts: SimOptions): SimContext {
  return {
    options: opts,
    sensors: listSensors(opts.config),
    rng: new SeededRandom(opts.seed),
    prevAlert: new Map(),
    prevDetected: new Map(),
    pendingReadings: new Map(),
    events: [],
    energyMah: 0,
    totalElapsedMs: 0,
  };
}

// Generate a sensor reading for a single sensor at a given simulation time.
// This is the "measurement" — applies uncertainty and delay.
export function measureSensor(
  ctx: SimContext,
  sensor: UltrasonicSensor,
  user: SimulationUser,
  obstacles: Obstacle[],
  timeMs: number,
  thresholds: AlertThresholds,
): SensorReading {
  const placement = ctx.options.config.sensorPositions[sensor.id] ?? DEFAULT_PLACEMENT[sensor.position];
  const origin = sensorWorldPosition(user, placement);
  const heading = sensorWorldHeading(user, sensor.orientationDeg);
  const halfAngle = sensor.detectionAngleDeg;

  // find nearest detectable obstacle
  let nearestDist: number | null = null;
  let nearestObsId: string | null = null;
  for (const obs of obstacles) {
    const r = obstacleInCone(origin, heading, sensor.rangeCm, halfAngle, obs);
    if (r.detected && r.nearestDistance !== null) {
      if (nearestDist === null || r.nearestDistance < nearestDist) {
        nearestDist = r.nearestDistance;
        nearestObsId = obs.id;
      }
    }
  }

  const actualDistance = nearestDist;
  let measured: number | null = null;
  if (actualDistance !== null) {
    // apply gaussian noise scaled by uncertainty
    measured = ctx.rng.gaussian(actualDistance, sensor.uncertaintyCm);
    measured = Math.max(0, measured);
  }

  const prevLevel = ctx.prevAlert.get(sensor.id) ?? 'none';
  const alertLevel = computeAlertLevel(measured, thresholds, prevLevel);

  const reading: SensorReading = {
    sensorId: sensor.id,
    timeMs,
    actualDistanceCm: actualDistance,
    measuredDistanceCm: measured,
    detected: actualDistance !== null,
    obstacleId: nearestObsId,
    alertLevel,
    orientationDeg: heading,
    position: origin,
    uncertaintyCm: sensor.uncertaintyCm,
  };

  return reading;
}

// Compute the user's position at a given time along a path.
export function userAtTime(env: SimEnvironment, timeMs: number, path: string): SimulationUser {
  const base = env.user;
  if (path === 'stationary') {
    return { ...base };
  }
  const t = timeMs / 1000;
  if (path === 'circular') {
    const radius = Math.min(env.widthCm, env.heightCm) * 0.25;
    const angle = (t * base.speedCmS) / radius;
    return {
      ...base,
      x: base.x + Math.cos(angle) * radius,
      y: base.y + Math.sin(angle) * radius,
      facingDeg: normalizeAngleDeg((angle * 180) / Math.PI + 90),
    };
  }
  // linear: move forward, bounce off walls
  const halfW = env.widthCm / 2;
  const distance = t * base.speedCmS;
  // oscillate between -halfW+margin and halfW-margin
  const margin = 40;
  const span = halfW - margin;
  const cycle = span * 2;
  const pos = ((distance % cycle) + cycle) % cycle;
  const x = pos < span ? pos : cycle - pos;
  const dir = pos < span ? 1 : -1;
  return {
    ...base,
    x: x,
    facingDeg: dir > 0 ? 0 : 180,
  };
}

// Energy consumed (mAh) for a given total power (mW) over time (ms) at voltage V.
export function powerToMah(mw: number, ms: number, voltage: number): number {
  return (mw * (ms / 1000 / 3600)) / voltage;
}

export function estimatePowerDraw(config: DeviceConfig): number {
  let total = 0;
  for (const c of config.components) {
    total += c.powerDrawMw;
  }
  return total;
}

export function getBatteryVoltage(config: DeviceConfig): number {
  const b = listBatteries(config)[0];
  return b ? b.voltageV : 3.7;
}

export function getBatteryCapacity(config: DeviceConfig): number {
  const b = listBatteries(config)[0];
  return b ? b.capacityMah : 1000;
}

export function estimateOperatingHours(config: DeviceConfig): number | null {
  const cap = getBatteryCapacity(config);
  const draw = estimatePowerDraw(config);
  const v = getBatteryVoltage(config);
  if (draw <= 0) return null;
  return cap / (draw / v); // mWh / mW = h
}

// --- Main simulation run ---------------------------------------

export function runSimulation(opts: SimOptions): SimulationResult {
  const ctx = createSimContext(opts);
  const { config, environment, durationMs, stepMs } = opts;
  const thresholds = config.alertThresholds;
  const frames: SimFrame[] = [];
  const allEvents: SimEvent[] = [];

  for (let t = 0; t <= durationMs; t += stepMs) {
    ctx.totalElapsedMs = t;
    // update obstacle positions
    const liveObstacles = environment.obstacles.map((o) => obstacleAtTime(o, t));
    const allObs = [...liveObstacles, ...environment.walls];

    // user position
    const user = userAtTime(environment, t, opts.walkingPath ?? 'linear');

    // Only measure at sensor intervals — but for visualization we compute
    // "instantaneous" readings every frame; the measurement interval gates
    // whether a reading is *fresh*. We track last-measured time.
    const readings: SensorReading[] = [];
    const frameEvents: SimEvent[] = [];

    for (const sensor of ctx.sensors) {
      // Check if this sensor should take a new measurement this tick.
      // We take a measurement if t is a multiple of interval (aligned), or
      // it's the first frame.
      const shouldMeasure = t === 0 || Math.floor(t / sensor.intervalMs) !== Math.floor((t - stepMs) / sensor.intervalMs);

      let reading: SensorReading;
      if (shouldMeasure) {
        // produce a new measurement; queue it with response delay
        const freshReading = measureSensor(ctx, sensor, user, allObs, t, thresholds);
        const readyAt = t + sensor.responseDelayMs;
        ctx.pendingReadings.set(sensor.id, { readyAtMs: readyAt, reading: freshReading });
        // emit new-measurement event
        frameEvents.push({
          id: `evt-${t}-${sensor.id}-meas`,
          timeMs: t,
          type: 'new-measurement',
          message: `${sensor.name}: new measurement queued (ready at ${readyAt}ms)`,
          sensorId: sensor.id,
        });
      }

      // The *displayed* reading is the most recently completed one.
      const pending = ctx.pendingReadings.get(sensor.id);
      if (pending && t >= pending.readyAtMs) {
        reading = pending.reading;
      } else if (pending) {
        // still pending — show previous
        const prevReading = readings.find((r) => r.sensorId === sensor.id);
        reading = prevReading ?? pending.reading;
      } else {
        // no pending — fabricate a no-detection reading
        const placement = config.sensorPositions[sensor.id] ?? DEFAULT_PLACEMENT[sensor.position];
        reading = {
          sensorId: sensor.id,
          timeMs: t,
          actualDistanceCm: null,
          measuredDistanceCm: null,
          detected: false,
          obstacleId: null,
          alertLevel: 'none',
          orientationDeg: sensorWorldHeading(user, sensor.orientationDeg),
          position: sensorWorldPosition(user, placement),
          uncertaintyCm: sensor.uncertaintyCm,
        };
      }

      // Detect enter/leave events (compare against previous detection)
      const prevObsId = ctx.prevDetected.get(sensor.id) ?? null;
      if (reading.obstacleId !== prevObsId) {
        if (reading.obstacleId && !prevObsId) {
          frameEvents.push({
            id: `evt-${t}-${sensor.id}-enter`,
            timeMs: t,
            type: 'obstacle-entered',
            message: `${sensor.name}: obstacle entered detection field`,
            sensorId: sensor.id,
            obstacleId: reading.obstacleId,
          });
        } else if (!reading.obstacleId && prevObsId) {
          frameEvents.push({
            id: `evt-${t}-${sensor.id}-leave`,
            timeMs: t,
            type: 'obstacle-left',
            message: `${sensor.name}: obstacle left detection field`,
            sensorId: sensor.id,
            obstacleId: prevObsId,
          });
        }
        ctx.prevDetected.set(sensor.id, reading.obstacleId ?? null);
      }

      // Alert-level transitions
      const prevAlert = ctx.prevAlert.get(sensor.id) ?? 'none';
      if (reading.alertLevel !== prevAlert) {
        if (reading.alertLevel === 'caution') {
          frameEvents.push({
            id: `evt-${t}-${sensor.id}-caution`,
            timeMs: t,
            type: 'caution-crossed',
            message: `${sensor.name}: caution threshold crossed`,
            sensorId: sensor.id,
          });
        } else if (reading.alertLevel === 'warning') {
          frameEvents.push({
            id: `evt-${t}-${sensor.id}-warn`,
            timeMs: t,
            type: 'warning-activated',
            message: `${sensor.name}: warning activated`,
            sensorId: sensor.id,
          });
        } else if (reading.alertLevel === 'critical') {
          frameEvents.push({
            id: `evt-${t}-${sensor.id}-crit`,
            timeMs: t,
            type: 'critical-activated',
            message: `${sensor.name}: critical alert activated`,
            sensorId: sensor.id,
          });
        }
      }
      ctx.prevAlert.set(sensor.id, reading.alertLevel);

      readings.push(reading);
    }

    // energy: accumulate power draw over this step
    const power = estimatePowerDraw(config);
    const v = getBatteryVoltage(config);
    ctx.energyMah += powerToMah(power, stepMs, v);

    const frame: SimFrame = {
      timeMs: t,
      user,
      readings,
      alertLevel: aggregateAlertLevel(readings),
      events: frameEvents,
    };
    frames.push(frame);

    for (const e of frameEvents) allEvents.push(e);
  }

  // test-completed event
  allEvents.push({
    id: `evt-${durationMs}-done`,
    timeMs: durationMs,
    type: 'test-completed',
    message: 'Device test completed.',
  });

  return {
    frames,
    events: allEvents,
    durationMs,
    totalFrames: frames.length,
  };
}

// --- Coverage analysis -----------------------------------------
// Fraction of the relevant obstacle region covered by at least one sensor cone.

export function computeCoverage(
  config: DeviceConfig,
  environment: SimEnvironment,
  resolution = 20,
): number {
  const sensors = listSensors(config);
  if (sensors.length === 0) return 0;
  const user = environment.user;
  // Sample a grid over the environment
  const xSteps = Math.max(2, Math.floor(environment.widthCm / resolution));
  const ySteps = Math.max(2, Math.floor(environment.heightCm / resolution));
  let covered = 0;
  let total = 0;
  for (let i = 0; i <= xSteps; i++) {
    for (let j = 0; j <= ySteps; j++) {
      const x = -environment.widthCm / 2 + (i / xSteps) * environment.widthCm;
      const y = -environment.heightCm / 2 + (j / ySteps) * environment.heightCm;
      // Only count points that are inside an obstacle's expanded region (the
      // "relevant obstacle region" = near obstacles). We test proximity to
      // any obstacle within 20cm.
      let relevant = false;
      for (const obs of environment.obstacles) {
        const np = { x: Math.max(obs.x, Math.min(x, obs.x + obs.w)), y: Math.max(obs.y, Math.min(y, obs.y + obs.h)) };
        if (Math.hypot(x - np.x, y - np.y) < 25) {
          relevant = true;
          break;
        }
      }
      if (!relevant) continue;
      total++;
      for (const sensor of sensors) {
        const placement = config.sensorPositions[sensor.id] ?? DEFAULT_PLACEMENT[sensor.position];
        const origin = sensorWorldPosition(user, placement);
        const heading = sensorWorldHeading(user, sensor.orientationDeg);
        // point in cone?
        const d = Math.hypot(x - origin.x, y - origin.y);
        if (d > sensor.rangeCm) continue;
        const angleToPt = (Math.atan2(y - origin.y, x - origin.x) * 180) / Math.PI;
        const diff = ((angleToPt - heading + 540) % 360) - 180;
        if (Math.abs(diff) <= sensor.detectionAngleDeg) {
          covered++;
          break;
        }
      }
    }
  }
  return total > 0 ? covered / total : 0;
}
