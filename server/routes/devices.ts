import express, { type Request, type Response } from 'express';
import { randomBytes } from 'crypto';
import { Ajv, type ValidateFunction } from 'ajv';
import { getDb } from '../db.js';
import type { Device } from '../types.js';
import { errorMessage } from '../types.js';

const router = express.Router();
const ajv = new Ajv();

const schema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    location: { type: 'string' },
  },
  required: ['name', 'location'],
  additionalProperties: false,
};

const validate: ValidateFunction = ajv.compile(schema);

router.post('/', async (req: Request, res: Response) => {
  try {
    const valid = validate(req.body);
    if (!valid) {
      res.status(400).json({ success: false, error: 'Données invalides', details: validate.errors });
      return;
    }

    const { name, location } = req.body as { name: string; location: string };
    const apiKey = randomBytes(24).toString('hex');

    const device: Omit<Device, '_id'> = { name, location, apiKey, createdAt: new Date() };
    const db = getDb();
    const result = await db.collection<Omit<Device, '_id'>>('devices').insertOne(device);

    res.status(201).json({ success: true, data: { id: result.insertedId, apiKey } });
  } catch (err) {
    res.status(500).json({ success: false, error: errorMessage(err) });
  }
});

router.get('/', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const devices = await db
      .collection<Device>('devices')
      .find({}, { projection: { apiKey: 0 } })
      .toArray();
    res.status(200).json({ success: true, data: devices });
  } catch (err) {
    res.status(500).json({ success: false, error: errorMessage(err) });
  }
});

export default router;
