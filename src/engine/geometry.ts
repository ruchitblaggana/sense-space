// SenseSpace — Geometry & Detection Engine
// All distances in centimeters, angles in degrees (converted internally to radians).

import type {
  AlertLevel,
  AlertThresholds,
  Obstacle,
  SensorReading,
  SimulationUser,
  UltrasonicSensor,
  Vec2,
} from '../types';

export const DEG2RAD = Math.PI / 180;

export function rad(deg: number): number {
  return deg * DEG2RAD;
}

export function deg(rad: number): number {
  return rad / DEG2RAD;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// Normalize an angle to (-180, 180]
export function normalizeAngleDeg(a: number): number {
  let x = a % 360;
  if (x > 180) x -= 360;
  if (x <= -180) x += 360;
  return x;
}

export function angleDeltaDeg(a: number, b: number): number {
  return Math.abs(normalizeAngleDeg(a - b));
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// --- Obstacle geometry -----------------------------------------
// Obstacles are axis-aligned boxes. Compute nearest-point distance from a sensor point.
// Returns the nearest point on the obstacle perimeter and the distance to it.

export interface NearestPoint {
  point: Vec2;
  distance: number;
}

export function nearestPointOnObstacle(sensor: Vec2, obs: Obstacle): NearestPoint {
  const left = obs.x;
  const right = obs.x + obs.w;
  const top = obs.y;
  const bottom = obs.y + obs.h;

  const nx = clamp(sensor.x, left, right);
  const ny = clamp(sensor.y, top, bottom);
  const point = { x: nx, y: ny };
  return { point, distance: dist(sensor, point) };
}

// Sample obstacle perimeter at a resolution to detect angular coverage.
export function sampleObstaclePerimeter(obs: Obstacle, step = 8): Vec2[] {
  const pts: Vec2[] = [];
  const left = obs.x;
  const right = obs.x + obs.w;
  const top = obs.y;
  const bottom = obs.y + obs.h;

  for (let x = left; x <= right; x += step) {
    pts.push({ x, y: top });
    pts.push({ x, y: bottom });
  }
  for (let y = top; y <= bottom; y += step) {
    pts.push({ x: left, y });
    pts.push({ x: right, y });
  }
  // ensure corners
  pts.push({ x: left, y: top });
  pts.push({ x: right, y: top });
  pts.push({ x: left, y: bottom });
  pts.push({ x: right, y: bottom });
  return pts;
}

// --- Detection cone --------------------------------------------
// Sensor at `origin` facing `headingDeg`. Half-angle = halfAngleDeg.
// Returns true if a point is within the cone (range & angular).

export function isPointInCone(
  origin: Vec2,
  headingDeg: number,
  rangeCm: number,
  halfAngleDeg: number,
  point: Vec2,
): boolean {
  const d = dist(origin, point);
  if (d > rangeCm || d < 0.001) return false;
  const angleToPt = deg(Math.atan2(point.y - origin.y, point.x - origin.x));
  return angleDeltaDeg(headingDeg, angleToPt) <= halfAngleDeg;
}

// Check whether an obstacle is detectable: sample perimeter points and see if
// any fall within the cone. Also returns the nearest in-cone point distance.
export function obstacleInCone(
  sensor: Vec2,
  headingDeg: number,
  rangeCm: number,
  halfAngleDeg: number,
  obs: Obstacle,
): { detected: boolean; nearestDistance: number | null; nearestPoint: Vec2 | null } {
  // Quick reject: bounding-circle test
  const center = { x: obs.x + obs.w / 2, y: obs.y + obs.h / 2 };
  const centerDist = dist(sensor, center);
  const radius = Math.hypot(obs.w, obs.h) / 2;
  if (centerDist - radius > rangeCm) {
    return { detected: false, nearestDistance: null, nearestPoint: null };
  }

  const pts = sampleObstaclePerimeter(obs);
  let nearest: number | null = null;
  let nearestPt: Vec2 | null = null;

  for (const p of pts) {
    if (isPointInCone(sensor, headingDeg, rangeCm, halfAngleDeg, p)) {
      const d = dist(sensor, p);
      if (nearest === null || d < nearest) {
        nearest = d;
        nearestPt = p;
      }
    }
  }

  // Also test the nearest point on the box (interior projection)
  const np = nearestPointOnObstacle(sensor, obs);
  if (isPointInCone(sensor, headingDeg, rangeCm, halfAngleDeg, np.point)) {
    if (nearest === null || np.distance < nearest) {
      nearest = np.distance;
      nearestPt = np.point;
    }
  }

  return { detected: nearest !== null, nearestDistance: nearest, nearestPoint: nearestPt };
}

// --- Noise (deterministic seeded PRNG) -------------------------

export class SeededRandom {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  next(): number {
    // mulberry32
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  // Box-Muller gaussian
  gaussian(mean: number, sigma: number): number {
    const u1 = this.next() || 0.0001;
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * sigma;
  }
}

// --- Alert threshold logic with hysteresis ---------------------

export function computeAlertLevel(
  distance: number | null,
  thresholds: AlertThresholds,
  prevLevel: AlertLevel,
): AlertLevel {
  if (distance === null) {
    // No detection. Apply hysteresis: only clear if "well past" the caution boundary.
    if (prevLevel === 'none') return 'none';
    return 'none'; // obstacle gone → clear
  }

  const h = thresholds.hysteresisCm;
  // Hysteresis: to escalate up, distance must be clearly below the next threshold.
  // To drop down a level, distance must be clearly above (threshold + hysteresis).
  if (distance <= thresholds.criticalCm) return 'critical';
  if (distance <= thresholds.warningCm) {
    if (prevLevel === 'critical' && distance > thresholds.criticalCm - h) {
      // staying near critical boundary
      return distance <= thresholds.criticalCm + h ? 'critical' : 'warning';
    }
    return 'warning';
  }
  if (distance <= thresholds.cautionCm) {
    if (prevLevel === 'warning' && distance > thresholds.warningCm - h) {
      return distance <= thresholds.warningCm + h ? 'warning' : 'caution';
    }
    return 'caution';
  }
  // Above caution
  if (prevLevel !== 'none' && distance <= thresholds.cautionCm + h) {
    return 'caution';
  }
  return 'none';
}

export function alertLevelRank(level: AlertLevel): number {
  switch (level) {
    case 'none': return 0;
    case 'caution': return 1;
    case 'warning': return 2;
    case 'critical': return 3;
    default: return 0;
  }
}

export function aggregateAlertLevel(readings: SensorReading[]): AlertLevel {
  let max: AlertLevel = 'none';
  for (const r of readings) {
    if (alertLevelRank(r.alertLevel) > alertLevelRank(max)) max = r.alertLevel;
  }
  return max;
}

// --- Sensor world position -------------------------------------
// Convert a sensor's device-local placement into world coordinates given the user pose.
// The device sits at the user position; sensor position offsets are applied in the
// user's facing frame.

export function sensorWorldPosition(
  user: SimulationUser,
  placement: { x: number; y: number } | undefined,
): Vec2 {
  if (!placement) return { x: user.x, y: user.y };
  // Rotate the placement offset by the user's facing angle
  const a = rad(user.facingDeg);
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return {
    x: user.x + placement.x * cos - placement.y * sin,
    y: user.y + placement.x * sin + placement.y * cos,
  };
}

export function sensorWorldHeading(user: SimulationUser, sensorOrientationDeg: number): number {
  return normalizeAngleDeg(user.facingDeg + sensorOrientationDeg);
}

// --- Moving obstacle position at time t ------------------------

export function obstacleAtTime(obs: Obstacle, tMs: number): Obstacle {
  if (!obs.moving) return obs;
  const t = tMs / 1000;
  const offset = Math.sin(t * obs.moving.speed + obs.moving.phase) * obs.moving.amplitude;
  if (obs.moving.axis === 'x') {
    return { ...obs, x: obs.x + offset };
  }
  return { ...obs, y: obs.y + offset };
}
