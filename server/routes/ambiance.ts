import express, { type Request, type Response } from 'express';
import { getDb } from '../db.js';
import type { Measurement, Observation } from '../types.js';
import { errorMessage } from '../types.js';
import {
  buildHistory,
  buildSnapshot,
  computeQuietHours,
  getScale,
  parseDuration,
  QUIET_THRESHOLD_DB,
} from '../services/ambiance.js';
import { cacheControl } from '../middleware/cache.js';

const router = express.Router();

router.get('/:location/snapshot', cacheControl(30), async (req: Request, res: Response) => {
  try {
    const location = req.params.location as string;
    const since = new Date(Date.now() - 30 * 60000);
    const db = getDb();

    const [measurements, lastObservation] = await Promise.all([
      db.collection<Measurement>('measurements').find({ location, timestamp: { $gte: since } }).toArray(),
      db.collection<Observation>('observations').findOne({ location }, { sort: { timestamp: -1 } }),
    ]);

    const snapshot = buildSnapshot(location, measurements, lastObservation);
    if (!snapshot) {
      res.status(404).json({ success: false, error: 'Aucune donnée pour ce lieu' });
      return;
    }

    res.status(200).json({ success: true, data: snapshot });
  } catch (err) {
    res.status(500).json({ success: false, error: errorMessage(err) });
  }
});

router.get('/:location/history', cacheControl(60), async (req: Request, res: Response) => {
  try {
    const { location } = req.params;
    const lastParam = typeof req.query.last === 'string' ? req.query.last : undefined;
    const durationMs = parseDuration(lastParam);
    const since = new Date(Date.now() - durationMs);

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

    const history = buildHistory(measurements, durationMs);

    res.status(200).json({
      success: true,
      data: { location, period: lastParam || '3h', scale: getScale(), history },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: errorMessage(err) });
  }
});

router.get('/:location/quiet-hours', cacheControl(300), async (req: Request, res: Response) => {
  try {
    const { location } = req.params;

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

    const quietHours = computeQuietHours(stats);

    res.status(200).json({
      success: true,
      data: { location, quietThresholdDb: QUIET_THRESHOLD_DB, quietHours },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: errorMessage(err) });
  }
});

export default router;
