import express, { type Request, type Response } from 'express';
import { getDb } from '../db.js';
import type { Classification, Measurement, Observation, ScaleEntry } from '../types.js';
import { errorMessage } from '../types.js';

const router = express.Router();

function parseDuration(str: string | undefined): number {
  if (!str) return 3 * 3600000;
  const match = str.match(/^(\d+)(m|h|d)$/);
  if (!match) return 3 * 3600000;
  const multipliers: Record<string, number> = { m: 60000, h: 3600000, d: 86400000 };
  return parseInt(match[1], 10) * multipliers[match[2]];
}

function classifyDb(avgDb: number): Classification {
  if (avgDb < 45) return 'calme';
  if (avgDb < 60) return 'modéré';
  if (avgDb < 75) return 'animé';
  return 'bruyant';
}

function getScale(): ScaleEntry[] {
  return [
    { label: 'calme', minDb: 0, maxDb: 45 },
    { label: 'modéré', minDb: 45, maxDb: 60 },
    { label: 'animé', minDb: 60, maxDb: 75 },
    { label: 'bruyant', minDb: 75, maxDb: null },
  ];
}

router.get('/:location/snapshot', async (req: Request, res: Response) => {
  try {
    const { location } = req.params;
    const since = new Date(Date.now() - 30 * 60000);
    const db = getDb();

    const [measurements, lastObservation] = await Promise.all([
      db.collection<Measurement>('measurements').find({ location, timestamp: { $gte: since } }).toArray(),
      db.collection<Observation>('observations').findOne({ location }, { sort: { timestamp: -1 } }),
    ]);

    if (measurements.length === 0 && !lastObservation) {
      res.status(404).json({ success: false, error: 'Aucune donnée pour ce lieu' });
      return;
    }

    const avgDb =
      measurements.length > 0
        ? measurements.reduce((sum, m) => sum + m.value, 0) / measurements.length
        : null;

    res.status(200).json({
      success: true,
      data: {
        location,
        generatedAt: new Date(),
        scale: getScale(),
        audio:
          avgDb !== null
            ? {
                avgDb: Math.round(avgDb * 10) / 10,
                sampleCount: measurements.length,
                classification: classifyDb(avgDb),
              }
            : null,
        observation: lastObservation
          ? {
              proximity: lastObservation.proximity,
              vibe: lastObservation.vibe,
              notes: lastObservation.notes,
              recordedAt: lastObservation.timestamp,
            }
          : null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: errorMessage(err) });
  }
});

router.get('/:location/history', async (req: Request, res: Response) => {
  try {
    const { location } = req.params;
    const lastParam = typeof req.query.last === 'string' ? req.query.last : undefined;
    const durationMs = parseDuration(lastParam);
    const since = new Date(Date.now() - durationMs);
    const bucketMs = Math.max(Math.floor(durationMs / 12), 5 * 60000);

    const db = getDb();
    const measurements = await db
      .collection<Measurement>('measurements')
      .find({ location, timestamp: { $gte: since } })
      .sort({ timestamp: 1 })
      .toArray();

    if (measurements.length === 0) {
      res.status(404).json({ success: false, error: 'Aucune mesure pour ce lieu et cette période' });
      return;
    }

    const buckets = new Map<number, number[]>();
    for (const m of measurements) {
      const key = Math.floor(m.timestamp.getTime() / bucketMs) * bucketMs;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(m.value);
    }

    const history = [...buckets.entries()].map(([ts, values]) => {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      return {
        timestamp: new Date(ts),
        avgDb: Math.round(avg * 10) / 10,
        sampleCount: values.length,
        classification: classifyDb(avg),
      };
    });

    res.status(200).json({
      success: true,
      data: { location, period: lastParam || '3h', scale: getScale(), history },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: errorMessage(err) });
  }
});

router.get('/:location/quiet-hours', async (req: Request, res: Response) => {
  try {
    const { location } = req.params;
    const QUIET_THRESHOLD_DB = 50;
    const MIN_SAMPLES = 3;

    const db = getDb();
    const stats = await db
      .collection<Measurement>('measurements')
      .aggregate<{ _id: number; avgDb: number; sampleCount: number }>([
        { $match: { location } },
        {
          $group: {
            _id: { $hour: '$timestamp' },
            avgDb: { $avg: '$value' },
            sampleCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    if (stats.length === 0) {
      res.status(404).json({ success: false, error: 'Aucune mesure pour ce lieu' });
      return;
    }

    const quietHours = stats
      .filter((s) => s.avgDb < QUIET_THRESHOLD_DB && s.sampleCount >= MIN_SAMPLES)
      .map((s) => ({
        hour: s._id,
        avgDb: Math.round(s.avgDb * 10) / 10,
        sampleCount: s.sampleCount,
      }));

    res.status(200).json({
      success: true,
      data: { location, quietThresholdDb: QUIET_THRESHOLD_DB, quietHours },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: errorMessage(err) });
  }
});

export default router;
