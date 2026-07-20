import express from 'express';
import { getDb } from '../db.js';
import validate from '../schemas/location.js';

const router = express.Router();

// POST /locations — register (or update) a location's coordinates
router.post('/', async (req, res) => {
  try {
    const valid = validate(req.body);
    if (!valid) {
      return res.status(400).json({ success: false, error: 'Données invalides', details: validate.errors });
    }

    const { name, lat, lng } = req.body;
    const db = getDb();

    const existing = await db.collection('locations').findOne({ name });

    const result = await db.collection('locations').findOneAndUpdate(
      { name },
      { $set: { name, lat, lng }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, returnDocument: 'after' }
    );

    return res.status(existing ? 200 : 201).json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /locations — list all known locations with coordinates
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const locations = await db.collection('locations').find({}).toArray();
    return res.status(200).json({ success: true, data: locations });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
