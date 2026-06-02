import express from 'express';
import { getDb } from '../db.js';
import authMiddleware from '../middleware/auth.js';
import validate from '../schemas/observation.js';

const router = express.Router();

// POST /observations — record a manual environmental observation
router.post('/', authMiddleware, async (req, res) => {
  try {
    const valid = validate(req.body);
    if (!valid) {
      return res.status(400).json({ success: false, error: 'Données invalides', details: validate.errors });
    }

    const receivedAt = new Date();
    const ts = req.body.timestamp ? new Date(req.body.timestamp) : receivedAt;

    const doc = {
      location: req.body.location,
      proximity: req.body.proximity,
      vibe: req.body.vibe,
      notes: req.body.notes ?? null,
      hour: ts.getHours(),
      dayOfWeek: ts.getDay(),
      deviceId: req.device._id,
      timestamp: ts,
      receivedAt
    };

    const db = getDb();
    const result = await db.collection('observations').insertOne(doc);

    return res.status(201).json({ success: true, data: { id: result.insertedId, ...doc } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
