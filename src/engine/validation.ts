// SenseSpace — Configuration Validation

import type { DeviceConfig, ValidationIssue, ValidationResult } from '../types';
import { listAlertModules, listBatteries, listControllers, listSensors } from './simulation';

export function validateConfig(config: DeviceConfig): ValidationResult {
  const issues: ValidationIssue[] = [];

  const sensors = listSensors(config);
  const alerts = listAlertModules(config);
  const controllers = listControllers(config);
  const batteries = listBatteries(config);

  if (sensors.length === 0) {
    issues.push({ level: 'error', message: 'No distance sensor configured. The device cannot detect obstacles.', field: 'sensors' });
  }
  if (alerts.length === 0) {
    issues.push({ level: 'error', message: 'No alert module configured. The device cannot notify the user.', field: 'alerts' });
  }
  if (controllers.length === 0) {
    issues.push({ level: 'warning', message: 'No microcontroller configured. Processing is assumed but not simulated.', field: 'mcu' });
  }
  if (batteries.length === 0) {
    issues.push({ level: 'warning', message: 'No battery model configured. Operating-time estimate is unavailable.', field: 'battery' });
  }

  for (const s of sensors) {
    if (s.rangeCm < 10) {
      issues.push({ level: 'warning', message: `${s.name}: detection range is very small (${s.rangeCm} cm). Few obstacles will be detected.`, field: 'range' });
    }
    if (s.detectionAngleDeg <= 0) {
      issues.push({ level: 'error', message: `${s.name}: detection angle is zero. Nothing can be detected.`, field: 'angle' });
    }
    if (s.intervalMs > 1000) {
      issues.push({ level: 'warning', message: `${s.name}: measurement interval is slow (${s.intervalMs} ms). Fast obstacles may be missed.`, field: 'interval' });
    }
    if (s.responseDelayMs > 500) {
      issues.push({ level: 'warning', message: `${s.name}: response delay is high (${s.responseDelayMs} ms). Alerts may arrive late.`, field: 'delay' });
    }
  }

  const t = config.alertThresholds;
  if (t.criticalCm >= t.warningCm || t.warningCm >= t.cautionCm) {
    issues.push({ level: 'error', message: 'Alert thresholds are misordered. Critical must be smallest, then warning, then caution.', field: 'thresholds' });
  }
  if (t.hysteresisCm < 0) {
    issues.push({ level: 'error', message: 'Hysteresis cannot be negative.', field: 'hysteresis' });
  }

  // battery budget
  if (batteries.length > 0) {
    const draw = config.components.reduce((sum, c) => sum + c.powerDrawMw, 0);
    const batt = batteries[0];
    const mwh = batt.capacityMah * batt.voltageV;
    if (draw > 0) {
      const hours = mwh / draw;
      if (hours < 0.5) {
        issues.push({ level: 'warning', message: `Estimated operating time is very short (~${hours.toFixed(2)} h). Power budget may be exceeded.`, field: 'battery' });
      }
    }
  }

  return {
    valid: issues.filter((i) => i.level === 'error').length === 0,
    issues,
  };
}
