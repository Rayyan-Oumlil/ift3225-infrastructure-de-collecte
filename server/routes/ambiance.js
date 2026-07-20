import express from 'express';
import { getDb } from '../db.js';

const router = express.Router();

function parseDuration(str) {
  if (!str) return 3 * 3600000;
  const match = str.match(/^(\d+)(m|h|d)$/);
  if (!match) return 3 * 3600000;
  const multipliers = { m: 60000, h: 3600000, d: 86400000 };
  return parseInt(match[1]) * multipliers[match[2]];
}

function classifyDb(avgDb) {
  if (avgDb < 45) return 'calme';
  if (avgDb < 60) return 'modéré';
  if (avgDb < 75) return 'animé';
  return 'bruyant';
}

// Échelle des seuils utilisés par classifyDb, exposée par l'API pour que le client
// affiche la classification sans dupliquer ces valeurs de son côté.
function getScale() {
  return [
    { label: 'calme', minDb: 0, maxDb: 45 },
    { label: 'modéré', minDb: 45, maxDb: 60 },
    { label: 'animé', minDb: 60, maxDb: 75 },
    { label: 'bruyant', minDb: 75, maxDb: null }
  ];
}

// GET /ambiance/:location/snapshot — current portrait (last 30 min of audio + latest observation)
router.get('/:location/snapshot', async (req, res) => {
  try {
    const { location } = req.params;
    const since = new Date(Date.now() - 30 * 60000);
    const db = getDb();

    const [measurements, lastObservation] = await Promise.all([
      db.collection('measurements').find({ location, timestamp: { $gte: since } }).toArray(),
      db.collection('observations').findOne({ location }, { sort: { timestamp: -1 } })
    ]);

    if (measurements.length === 0 && !lastObservation) {
      return res.status(404).json({ success: false, error: 'Aucune donnée pour ce lieu' });
    }

    const avgDb = measurements.length > 0
      ? measurements.reduce((sum, m) => sum + m.value, 0) / measurements.length
      : null;

    return res.status(200).json({
      success: true,
      data: {
        location,
        generatedAt: new Date(),
        audio: avgDb !== null ? {
          avgDb: Math.round(avgDb * 10) / 10,
          sampleCount: measurements.length,
          classification: classifyDb(avgDb)
        } : null,
        observation: lastObservation ? {
          proximity: lastObservation.proximity,
          vibe: lastObservation.vibe,
          notes: lastObservation.notes,
          recordedAt: lastObservation.timestamp
        } : null
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /ambiance/:location/history?last=3h — sound level evolution grouped into time buckets
router.get('/:location/history', async (req, res) => {
  try {
    const { location } = req.params;
    const durationMs = parseDuration(req.query.last);
    const since = new Date(Date.now() - durationMs);
    // 12 buckets over the requested period, minimum 5 minutes each
    const bucketMs = Math.max(Math.floor(durationMs / 12), 5 * 60000);

    const db = getDb();
    const measurements = await db.collection('measurements')
      .find({ location, timestamp: { $gte: since } })
      .sort({ timestamp: 1 })
      .toArray();

    if (measurements.length === 0) {
      return res.status(404).json({ success: false, error: 'Aucune mesure pour ce lieu et cette période' });
    }

    const buckets = new Map();
    for (const m of measurements) {
      const key = Math.floor(m.timestamp.getTime() / bucketMs) * bucketMs;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(m.value);
    }

    const history = [...buckets.entries()].map(([ts, values]) => {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      return {
        timestamp: new Date(ts),
        avgDb: Math.round(avg * 10) / 10,
        sampleCount: values.length,
        classification: classifyDb(avg)
      };
    });

    return res.status(200).json({
      success: true,
      data: { location, period: req.query.last || '3h', history }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /ambiance/:location/quiet-hours — hours of day that are typically quiet (< 50 dB average)
router.get('/:location/quiet-hours', async (req, res) => {
  try {
    const { location } = req.params;
    const QUIET_THRESHOLD_DB = 50;
    const MIN_SAMPLES = 3;

    const db = getDb();
    const stats = await db.collection('measurements').aggregate([
      { $match: { location } },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          avgDb: { $avg: '$value' },
          sampleCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    if (stats.length === 0) {
      return res.status(404).json({ success: false, error: 'Aucune mesure pour ce lieu' });
    }

    const quietHours = stats
      .filter(s => s.avgDb < QUIET_THRESHOLD_DB && s.sampleCount >= MIN_SAMPLES)
      .map(s => ({
        hour: s._id,
        avgDb: Math.round(s.avgDb * 10) / 10,
        sampleCount: s.sampleCount
      }));

    return res.status(200).json({
      success: true,
      data: { location, quietThresholdDb: QUIET_THRESHOLD_DB, quietHours }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
