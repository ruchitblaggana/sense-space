// SenseSpace — Core domain types

export type ID = string;

// --- Components -------------------------------------------------

export type SensorPosition = 'front' | 'front-left' | 'front-right' | 'top' | 'left' | 'right';

export interface UltrasonicSensor {
  id: ID;
  kind: 'ultrasonic';
  name: string;
  position: SensorPosition;
  orientationDeg: number; // forward direction angle, 0 = forward (+x)
  rangeCm: number; // max detection distance
  detectionAngleDeg: number; // field-of-view half-angle (cone half-angle)
  intervalMs: number; // measurement interval
  uncertaintyCm: number; // +/- noise magnitude (1 sigma approx)
  responseDelayMs: number; // processing delay before a reading is available
  powerDrawMw: number; // estimated power consumption when active
}

export type AlertType = 'vibration' | 'audio' | 'combined';
export type AlertPattern = 'steady' | 'pulsed' | 'rising' | 'triple-burst';

export interface AlertModule {
  id: ID;
  kind: 'alert';
  name: string;
  type: AlertType;
  intensity: number; // 0..100
  pattern: AlertPattern;
  repetitionMs: number; // alert repeat interval
  powerDrawMw: number;
  muted: boolean;
}

export interface Microcontroller {
  id: ID;
  kind: 'mcu';
  name: string;
  powerDrawMw: number; // baseline processing power
  processingDelayMs: number; // overhead added to each measurement cycle
}

export interface BatteryModel {
  id: ID;
  kind: 'battery';
  name: string;
  capacityMah: number;
  voltageV: number;
  powerDrawMw: number; // 0 — batteries supply, not draw
}

export type DeviceComponent = UltrasonicSensor | AlertModule | Microcontroller | BatteryModel;

// --- Device Configuration ---------------------------------------

export interface DeviceConfig {
  id: ID;
  name: string;
  description: string;
  components: DeviceComponent[];
  createdAt: number;
  modifiedAt: number;
  sensorPositions: Record<ID, { x: number; y: number; angleDeg: number }>; // 2D placement on device body
  alertThresholds: AlertThresholds;
}

export interface AlertThresholds {
  cautionCm: number; // distances below this enter caution
  warningCm: number; // below this → warning
  criticalCm: number; // below this → critical
  hysteresisCm: number; // deadband to prevent flicker near a threshold
}

export const DEFAULT_THRESHOLDS: AlertThresholds = {
  cautionCm: 120,
  warningCm: 70,
  criticalCm: 35,
  hysteresisCm: 4,
};

// --- Simulation Environment ------------------------------------

export interface Vec2 {
  x: number;
  y: number;
}

export interface Obstacle {
  id: ID;
  kind: 'box' | 'cylinder' | 'wall' | 'overhang';
  // axis-aligned bounding box in cm, origin at environment center
  x: number;
  y: number;
  w: number;
  h: number;
  moving?: {
    axis: 'x' | 'y';
    amplitude: number;
    speed: number; // cm/s
    phase: number; // radians
  };
  label?: string;
}

export interface SimulationUser {
  x: number;
  y: number;
  facingDeg: number; // direction of travel
  speedCmS: number; // walking speed
}

export interface SimEnvironment {
  id: ID;
  name: string;
  widthCm: number;
  heightCm: number;
  obstacles: Obstacle[];
  walls: Obstacle[];
  user: SimulationUser;
  description?: string;
}

// --- Simulation State & Results --------------------------------

export type AlertLevel = 'none' | 'caution' | 'warning' | 'critical';

export interface SensorReading {
  sensorId: ID;
  timeMs: number;
  actualDistanceCm: number | null; // null if nothing in range
  measuredDistanceCm: number | null;
  detected: boolean;
  obstacleId: ID | null;
  alertLevel: AlertLevel;
  orientationDeg: number;
  position: Vec2;
  uncertaintyCm: number;
}

export interface SimFrame {
  timeMs: number;
  user: SimulationUser;
  readings: SensorReading[];
  alertLevel: AlertLevel; // aggregate highest across sensors
  events: SimEvent[];
}

export interface SimEvent {
  id: ID;
  timeMs: number;
  type:
    | 'obstacle-entered'
    | 'obstacle-left'
    | 'new-measurement'
    | 'caution-crossed'
    | 'warning-activated'
    | 'critical-activated'
    | 'config-changed'
    | 'test-completed'
    | 'no-detection'
    | 'false-positive'
    | 'false-negative'
    | 'true-positive'
    | 'true-negative';
  message: string;
  sensorId?: ID;
  obstacleId?: ID;
}

export interface SimulationResult {
  frames: SimFrame[];
  events: SimEvent[];
  durationMs: number;
  totalFrames: number;
  metrics?: ComparisonMetrics;
}

// --- Comparison Metrics ----------------------------------------

export interface ComparisonMetrics {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  detectionRate: number | null; // TP / (TP + FN)
  falsePositiveRate: number | null; // FP / (FP + TN)
  falseNegativeRate: number | null; // FN / (TP + FN)
  detectionDelayMs: number | null;
  alertCount: number;
  energyConsumedMah: number | null;
  coveragePercent: number | null;
}

// --- Experiment Journal ----------------------------------------

export type ExperimentStatus = 'draft' | 'in-progress' | 'completed' | 'archived';

export interface Experiment {
  id: ID;
  title: string;
  createdAt: number;
  modifiedAt: number;
  status: ExperimentStatus;
  researchQuestion: string;
  hypothesis: string;
  configSnapshotId?: ID;
  configName?: string;
  configSnapshot?: DeviceConfig;
  testEnvironment: string;
  controlledVariables: string;
  independentVariable: string;
  evaluationMetrics: string;
  expectedResult: string;
  observedResult: string;
  limitations: string;
  conclusion: string;
  nextExperiment: string;
  isExample?: boolean;
}

// --- Saved Design Gallery --------------------------------------

export interface SavedDesign {
  config: DeviceConfig;
  lastTestResult?: SimulationResult;
  linkedExperimentIds: ID[];
  notes?: string;
}

export interface ConfigSnapshot {
  id: ID;
  config: DeviceConfig;
  savedAt: number;
  label: string;
}

// --- Learning Topics ------------------------------------------

export interface LearningTopic {
  id: string;
  title: string;
  category: 'geometry' | 'sensors' | 'alerts' | 'experimentation' | 'energy';
  summary: string;
  explanation: string;
  interactive: 'detection-angle' | 'distance' | 'thresholds' | 'noise' | 'energy' | 'fov-coverage' | 'experiment';
  challengeQuestion: string;
  challengeAnswer: string;
}

// --- Accessibility Challenges -----------------------------------

export interface ChallengeDef {
  id: string;
  number: number;
  title: string;
  difficulty: 'Introductory' | 'Intermediate' | 'Advanced';
  intro: string;
  objective: string;
  teaches: string[];
  environment: SimEnvironment;
  initialConfig: DeviceConfig;
  successCheck: (frames: SimFrame[], config: DeviceConfig) => ChallengeResult;
  explanation: string;
}

export interface ChallengeResult {
  passed: boolean;
  summary: string;
  details: string[];
}

// --- Validation -------------------------------------------------

export interface ValidationIssue {
  level: 'error' | 'warning';
  message: string;
  field?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

// --- Settings --------------------------------------------------

export interface UISettings {
  reducedMotion: boolean;
  muted: boolean;
  showGrid: boolean;
  showLabels: boolean;
  theme: 'paper';
  tutorialCompleted: boolean;
}
