import express from 'express';
import { getDb } from '../db.js';
import authMiddleware from '../middleware/auth.js';
import validate from '../schemas/measurement.js';

const router = express.Router();

// POST /measurements — record an audio measurement from Phyphox
router.post('/', authMiddleware, async (req, res) => {
  try {
    const valid = validate(req.body);
    if (!valid) {
      return res.status(400).json({ success: false, error: 'Données invalides', details: validate.errors });
    }

    const receivedAt = new Date();
    const doc = {
      type: req.body.type,
      value: req.body.value,
      location: req.body.location,
      deviceId: req.device._id,
      timestamp: req.body.timestamp ? new Date(req.body.timestamp) : receivedAt,
      receivedAt
    };

    const db = getDb();
    const result = await db.collection('measurements').insertOne(doc);

    return res.status(201).json({ success: true, data: { id: result.insertedId, ...doc } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
