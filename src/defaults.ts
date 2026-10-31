// SenseSpace — Default prototypes, components, and environments

import type {
  BatteryModel,
  DeviceComponent,
  DeviceConfig,
  Obstacle,
  SimEnvironment,
  SensorPosition,
  UltrasonicSensor,
  AlertModule,
  Microcontroller,
} from './types';
import { DEFAULT_THRESHOLDS } from './types';
import { DEFAULT_PLACEMENT } from './engine/simulation';

let _id = 0;
export function uid(prefix = 'id'): string {
  _id += 1;
  return `${prefix}-${Date.now().toString(36)}-${_id}-${Math.random().toString(36).slice(2, 7)}`;
}

// Stable IDs for the default prototype so tests can reference them.
export const DEFAULT_SENSOR_ID = 'sensor-default-front';
export const DEFAULT_ALERT_ID = 'alert-default';
export const DEFAULT_MCU_ID = 'mcu-default';
export const DEFAULT_BATT_ID = 'batt-default';
export const DEFAULT_CONFIG_ID = 'config-default-s1';

export function createUltrasonicSensor(overrides: Partial<UltrasonicSensor> = {}): UltrasonicSensor {
  return {
    id: uid('sensor'),
    kind: 'ultrasonic',
    name: 'Ultrasonic Sensor',
    position: 'front',
    orientationDeg: 0,
    rangeCm: 200,
    detectionAngleDeg: 15,
    intervalMs: 100,
    uncertaintyCm: 2,
    responseDelayMs: 30,
    powerDrawMw: 15,
    ...overrides,
  };
}

export function createAlertModule(overrides: Partial<AlertModule> = {}): AlertModule {
  return {
    id: uid('alert'),
    kind: 'alert',
    name: 'Alert Module',
    type: 'vibration',
    intensity: 60,
    pattern: 'pulsed',
    repetitionMs: 500,
    powerDrawMw: 25,
    muted: false,
    ...overrides,
  };
}

export function createMicrocontroller(overrides: Partial<Microcontroller> = {}): Microcontroller {
  return {
    id: uid('mcu'),
    kind: 'mcu',
    name: 'Microcontroller (Uno-class)',
    powerDrawMw: 50,
    processingDelayMs: 10,
    ...overrides,
  };
}

export function createBattery(overrides: Partial<BatteryModel> = {}): BatteryModel {
  return {
    id: uid('batt'),
    kind: 'battery',
    name: 'Li-ion Pack',
    capacityMah: 2000,
    voltageV: 3.7,
    powerDrawMw: 0,
    ...overrides,
  };
}

export function createDefaultConfig(): DeviceConfig {
  const sensor = createUltrasonicSensor({
    id: DEFAULT_SENSOR_ID,
    name: 'Front Ultrasonic',
    position: 'front',
    orientationDeg: 0,
    rangeCm: 200,
    detectionAngleDeg: 15,
  });
  const alert = createAlertModule({ id: DEFAULT_ALERT_ID, name: 'Vibration Alert' });
  const mcu = createMicrocontroller({ id: DEFAULT_MCU_ID });
  const batt = createBattery({ id: DEFAULT_BATT_ID });

  return {
    id: DEFAULT_CONFIG_ID,
    name: 'SenseSpace Prototype S1',
    description:
      'A conceptual wearable assistive device that uses distance sensing and configurable alerts to help users identify selected nearby obstacles in a simulated environment. This is a virtual prototype — not a validated assistive product.',
    components: [sensor, alert, mcu, batt],
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    sensorPositions: {
      [sensor.id]: { ...DEFAULT_PLACEMENT.front, angleDeg: 0 },
    },
    alertThresholds: { ...DEFAULT_THRESHOLDS },
  };
}

// --- Environments ----------------------------------------------

function obs(o: Partial<Obstacle> & { id: string }): Obstacle {
  return {
    kind: 'box',
    x: 0,
    y: 0,
    w: 40,
    h: 40,
    ...o,
  };
}

export const ENV_OPEN_LAB: SimEnvironment = {
  id: 'env-open-lab',
  name: 'Open Laboratory',
  widthCm: 600,
  heightCm: 400,
  obstacles: [
    obs({ id: 'obs-lab-1', x: 120, y: -40, w: 50, h: 50, label: 'Cabinet' }),
    obs({ id: 'obs-lab-2', x: -160, y: 60, w: 40, h: 60, label: 'Chair' }),
    obs({ id: 'obs-lab-3', x: 80, y: 100, w: 60, h: 30, label: 'Table' }),
  ],
  walls: [
    obs({ id: 'wall-n', x: -300, y: -200, w: 600, h: 10, kind: 'wall' }),
    obs({ id: 'wall-s', x: -300, y: 190, w: 600, h: 10, kind: 'wall' }),
    obs({ id: 'wall-w', x: -300, y: -200, w: 10, h: 400, kind: 'wall' }),
    obs({ id: 'wall-e', x: 290, y: -200, w: 10, h: 400, kind: 'wall' }),
  ],
  user: { x: 0, y: 0, facingDeg: 0, speedCmS: 80 },
  description: 'A wide-open lab space with a few pieces of furniture.',
};

export const ENV_CORRIDOR: SimEnvironment = {
  id: 'env-corridor',
  name: 'Narrow Corridor',
  widthCm: 500,
  heightCm: 160,
  obstacles: [
    obs({ id: 'obs-cor-1', x: 100, y: -70, w: 30, h: 20, label: 'Box' }),
    obs({ id: 'obs-cor-2', x: -120, y: 50, w: 30, h: 20, label: 'Box' }),
    obs({ id: 'obs-cor-3', x: 0, y: -65, w: 25, h: 15, label: 'Pipe' }),
  ],
  walls: [
    obs({ id: 'cor-wall-n', x: -250, y: -80, w: 500, h: 8, kind: 'wall' }),
    obs({ id: 'cor-wall-s', x: -250, y: 72, w: 500, h: 8, kind: 'wall' }),
  ],
  user: { x: -200, y: 0, facingDeg: 0, speedCmS: 80 },
  description: 'A tight corridor where wide detection angles catch the walls.',
};

export const ENV_OVERHEAD: SimEnvironment = {
  id: 'env-overhead',
  name: 'Overhead Hazards',
  widthCm: 500,
  heightCm: 300,
  obstacles: [
    obs({ id: 'obs-oh-1', x: 80, y: -30, w: 60, h: 20, kind: 'overhang', label: 'Low Beam' }),
    obs({ id: 'obs-oh-2', x: -100, y: 40, w: 40, h: 40, kind: 'overhang', label: 'Sign' }),
  ],
  walls: [
    obs({ id: 'oh-wall-n', x: -250, y: -150, w: 500, h: 8, kind: 'wall' }),
    obs({ id: 'oh-wall-s', x: -250, y: 142, w: 500, h: 8, kind: 'wall' }),
    obs({ id: 'oh-wall-w', x: -250, y: -150, w: 8, h: 300, kind: 'wall' }),
    obs({ id: 'oh-wall-e', x: 242, y: -150, w: 8, h: 300, kind: 'wall' }),
  ],
  user: { x: -150, y: 0, facingDeg: 0, speedCmS: 80 },
  description: 'A space with low overhangs requiring upward sensor orientation.',
};

export const ENV_MOVING: SimEnvironment = {
  id: 'env-moving',
  name: 'Moving Obstacles',
  widthCm: 500,
  heightCm: 300,
  obstacles: [
    obs({
      id: 'obs-mov-1',
      x: 100,
      y: 0,
      w: 30,
      h: 30,
      label: 'Walker',
      moving: { axis: 'y', amplitude: 80, speed: 0.8, phase: 0 },
    }),
    obs({
      id: 'obs-mov-2',
      x: -80,
      y: 40,
      w: 25,
      h: 25,
      label: 'Cart',
      moving: { axis: 'x', amplitude: 60, speed: 1.2, phase: Math.PI / 2 },
    }),
  ],
  walls: [
    obs({ id: 'mov-wall-n', x: -250, y: -150, w: 500, h: 8, kind: 'wall' }),
    obs({ id: 'mov-wall-s', x: -250, y: 142, w: 500, h: 8, kind: 'wall' }),
    obs({ id: 'mov-wall-w', x: -250, y: -150, w: 8, h: 300, kind: 'wall' }),
    obs({ id: 'mov-wall-e', x: 242, y: -150, w: 8, h: 300, kind: 'wall' }),
  ],
  user: { x: -150, y: 0, facingDeg: 0, speedCmS: 80 },
  description: 'Obstacles move laterally — tests measurement interval and delay.',
};

export const ENV_NOISY: SimEnvironment = {
  id: 'env-noisy',
  name: 'Noisy Environment',
  widthCm: 500,
  heightCm: 300,
  obstacles: [
    obs({ id: 'obs-noise-1', x: 120, y: 0, w: 40, h: 40, label: 'Pillar' }),
    obs({ id: 'obs-noise-2', x: -120, y: -50, w: 35, h: 35, label: 'Post' }),
  ],
  walls: [
    obs({ id: 'noise-wall-n', x: -250, y: -150, w: 500, h: 8, kind: 'wall' }),
    obs({ id: 'noise-wall-s', x: -250, y: 142, w: 500, h: 8, kind: 'wall' }),
    obs({ id: 'noise-wall-w', x: -250, y: -150, w: 8, h: 300, kind: 'wall' }),
    obs({ id: 'noise-wall-e', x: 242, y: -150, w: 8, h: 300, kind: 'wall' }),
  ],
  user: { x: 0, y: 0, facingDeg: 0, speedCmS: 80 },
  description: 'A clean space where measurement noise is the main challenge.',
};

export const ENV_BLINDSPOT: SimEnvironment = {
  id: 'env-blindspot',
  name: 'Blind Spot Lab',
  widthCm: 500,
  heightCm: 300,
  obstacles: [
    obs({ id: 'obs-bs-1', x: 140, y: 80, w: 40, h: 40, label: 'Obstacle A' }),
    obs({ id: 'obs-bs-2', x: -140, y: -80, w: 40, h: 40, label: 'Obstacle B' }),
    obs({ id: 'obs-bs-3', x: 0, y: 120, w: 30, h: 30, label: 'Obstacle C' }),
  ],
  walls: [
    obs({ id: 'bs-wall-n', x: -250, y: -150, w: 500, h: 8, kind: 'wall' }),
    obs({ id: 'bs-wall-s', x: -250, y: 142, w: 500, h: 8, kind: 'wall' }),
    obs({ id: 'bs-wall-w', x: -250, y: -150, w: 8, h: 300, kind: 'wall' }),
    obs({ id: 'bs-wall-e', x: 242, y: -150, w: 8, h: 300, kind: 'wall' }),
  ],
  user: { x: 0, y: 0, facingDeg: 0, speedCmS: 80 },
  description: 'Obstacles surround the user at varying angles.',
};

export const ALL_ENVIRONMENTS: SimEnvironment[] = [
  ENV_OPEN_LAB,
  ENV_CORRIDOR,
  ENV_OVERHEAD,
  ENV_MOVING,
  ENV_NOISY,
  ENV_BLINDSPOT,
];

export function getEnvironment(id: string): SimEnvironment {
  return ALL_ENVIRONMENTS.find((e) => e.id === id) ?? ENV_OPEN_LAB;
}

// --- Example experiment -----------------------------------------

export const EXAMPLE_EXPERIMENT = {
  id: 'exp-example-angle',
  title: 'How does detection angle affect obstacle coverage?',
  researchQuestion: 'Does widening the detection angle increase the number of obstacles detected without increasing false alerts from walls?',
  hypothesis: 'A wider detection angle (30°) will detect more obstacles at oblique angles, but in a narrow corridor it will also detect walls, producing unwanted alerts.',
  testEnvironment: 'Narrow Corridor',
  controlledVariables: 'Sensor range (200 cm), measurement interval (100 ms), walking speed (80 cm/s), thresholds.',
  independentVariable: 'Detection angle (15° vs 30° vs 45°).',
  evaluationMetrics: 'True positives (obstacles detected), false positives (wall detections), alert count.',
  expectedResult: 'The 30° configuration detects side obstacles earlier but generates more wall-driven alerts than 15°.',
  observedResult: '',
  limitations: 'This is an educational simulation. Real ultrasonic sensors have complex beam patterns not fully captured by a simple cone model.',
  conclusion: '',
  nextExperiment: 'Test whether raising the caution threshold eliminates wall false positives while keeping obstacle coverage.',
  isExample: true,
} as const;
