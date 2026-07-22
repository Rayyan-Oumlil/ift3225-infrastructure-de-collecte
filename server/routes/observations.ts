import express, { type Request, type Response } from 'express';
import { getDb } from '../db.js';
import { resolveAuth } from '../middleware/auth.js';
import validate from '../schemas/observation.js';
import type { Classification, Observation, Proximity } from '../types.js';
import { errorMessage } from '../types.js';

const router = express.Router();

router.post('/', resolveAuth, async (req: Request, res: Response) => {
  try {
    const valid = validate(req.body);
    if (!valid) {
      res.status(400).json({ success: false, error: 'Données invalides', details: validate.errors });
      return;
    }

    const body = req.body as {
      location: string;
      proximity: Proximity;
      vibe: Classification;
      notes?: string;
      timestamp?: string;
    };

    const receivedAt = new Date();
    const ts = body.timestamp ? new Date(body.timestamp) : receivedAt;

    const doc: Omit<Observation, '_id'> = {
      location: body.location,
      proximity: body.proximity,
      vibe: body.vibe,
      notes: body.notes ?? null,
      hour: ts.getHours(),
      dayOfWeek: ts.getDay(),
      deviceId: req.device?._id ?? null,
      authorId: req.user?._id ?? null,
      timestamp: ts,
      receivedAt,
    };

    const db = getDb();
    const result = await db.collection<Omit<Observation, '_id'>>('observations').insertOne(doc);

    res.status(201).json({ success: true, data: { id: result.insertedId, ...doc } });
  } catch (err) {
    res.status(500).json({ success: false, error: errorMessage(err) });
  }
});

export default router;
