import type { Classification, Measurement, Observation, ScaleEntry } from '../types.js';

export function parseDuration(str: string | undefined): number {
  if (!str) return 3 * 3600000;
  const match = str.match(/^(\d+)(m|h|d)$/);
  if (!match) return 3 * 3600000;
  const multipliers: Record<string, number> = { m: 60000, h: 3600000, d: 86400000 };
  return parseInt(match[1], 10) * multipliers[match[2]];
}

export function classifyDb(avgDb: number): Classification {
  if (avgDb < 45) return 'calme';
  if (avgDb < 60) return 'modéré';
  if (avgDb < 75) return 'animé';
  return 'bruyant';
}

export function getScale(): ScaleEntry[] {
  return [
    { label: 'calme', minDb: 0, maxDb: 45 },
    { label: 'modéré', minDb: 45, maxDb: 60 },
    { label: 'animé', minDb: 60, maxDb: 75 },
    { label: 'bruyant', minDb: 75, maxDb: null },
  ];
}

export interface Snapshot {
  location: string;
  generatedAt: Date;
  scale: ScaleEntry[];
  audio: { avgDb: number; sampleCount: number; classification: Classification } | null;
  observation: {
    proximity: Observation['proximity'];
    vibe: Classification;
    notes: string | null;
    recordedAt: Date;
  } | null;
}

export function buildSnapshot(
  location: string,
  measurements: Measurement[],
  lastObservation: Observation | null,
): Snapshot | null {
  if (measurements.length === 0 && !lastObservation) return null;

  const avgDb =
    measurements.length > 0
      ? measurements.reduce((sum, m) => sum + m.value, 0) / measurements.length
      : null;

  return {
    location,
    generatedAt: new Date(),
    scale: getScale(),
    audio:
      avgDb !== null
        ? { avgDb: Math.round(avgDb * 10) / 10, sampleCount: measurements.length, classification: classifyDb(avgDb) }
        : null,
    observation: lastObservation
      ? {
          proximity: lastObservation.proximity,
          vibe: lastObservation.vibe,
          notes: lastObservation.notes,
          recordedAt: lastObservation.timestamp,
        }
      : null,
  };
}

export interface HistoryPoint {
  timestamp: Date;
  avgDb: number;
  sampleCount: number;
  classification: Classification;
}

export function buildHistory(measurements: Measurement[], durationMs: number): HistoryPoint[] {
  const bucketMs = Math.max(Math.floor(durationMs / 12), 5 * 60000);
  const buckets = new Map<number, number[]>();
  for (const m of measurements) {
    const key = Math.floor(m.timestamp.getTime() / bucketMs) * bucketMs;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(m.value);
  }

  return [...buckets.entries()].map(([ts, values]) => {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return {
      timestamp: new Date(ts),
      avgDb: Math.round(avg * 10) / 10,
      sampleCount: values.length,
      classification: classifyDb(avg),
    };
  });
}

export interface HourStat {
  _id: number;
  avgDb: number;
  sampleCount: number;
}

export interface QuietHour {
  hour: number;
  avgDb: number;
  sampleCount: number;
}

export const QUIET_THRESHOLD_DB = 50;
export const QUIET_MIN_SAMPLES = 3;

export function computeQuietHours(stats: HourStat[]): QuietHour[] {
  return stats
    .filter((s) => s.avgDb < QUIET_THRESHOLD_DB && s.sampleCount >= QUIET_MIN_SAMPLES)
    .map((s) => ({ hour: s._id, avgDb: Math.round(s.avgDb * 10) / 10, sampleCount: s.sampleCount }));
}
