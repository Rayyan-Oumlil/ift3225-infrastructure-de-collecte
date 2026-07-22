import express, { type Request, type Response } from 'express';
import { getDb } from '../db.js';
import authMiddleware from '../middleware/auth.js';
import validate from '../schemas/measurement.js';
import type { Measurement } from '../types.js';
import { errorMessage } from '../types.js';

const router = express.Router();

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const valid = validate(req.body);
    if (!valid) {
      res.status(400).json({ success: false, error: 'Données invalides', details: validate.errors });
      return;
    }

    const body = req.body as {
      type: 'audio';
      value: number;
      location: string;
      timestamp?: string;
    };

    const receivedAt = new Date();
    const doc: Omit<Measurement, '_id'> = {
      type: body.type,
      value: body.value,
      location: body.location,
      deviceId: req.device!._id,
      timestamp: body.timestamp ? new Date(body.timestamp) : receivedAt,
      receivedAt,
    };

    const db = getDb();
    const result = await db.collection<Omit<Measurement, '_id'>>('measurements').insertOne(doc);

    res.status(201).json({ success: true, data: { id: result.insertedId, ...doc } });
  } catch (err) {
    res.status(500).json({ success: false, error: errorMessage(err) });
  }
});

export default router;
