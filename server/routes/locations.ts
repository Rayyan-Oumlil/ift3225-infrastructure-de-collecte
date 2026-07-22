import express, { type Request, type Response } from 'express';
import { getDb } from '../db.js';
import validate from '../schemas/location.js';
import type { LocationDoc } from '../types.js';
import { errorMessage } from '../types.js';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const valid = validate(req.body);
    if (!valid) {
      res.status(400).json({ success: false, error: 'Données invalides', details: validate.errors });
      return;
    }

    const { name, lat, lng } = req.body as { name: string; lat: number; lng: number };
    const db = getDb();

    const existing = await db.collection<LocationDoc>('locations').findOne({ name });

    const result = await db.collection<LocationDoc>('locations').findOneAndUpdate(
      { name },
      { $set: { name, lat, lng }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, returnDocument: 'after' },
    );

    res.status(existing ? 200 : 201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: errorMessage(err) });
  }
});

router.get('/', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const locations = await db.collection<LocationDoc>('locations').find({}).toArray();
    res.status(200).json({ success: true, data: locations });
  } catch (err) {
    res.status(500).json({ success: false, error: errorMessage(err) });
  }
});

export default router;
