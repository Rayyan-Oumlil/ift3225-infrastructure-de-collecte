import express from 'express';
import { randomBytes } from 'crypto';
import Ajv from 'ajv';
import { getDb } from '../db.js';

const router = express.Router();
const ajv = new Ajv();

const schema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    location: { type: 'string' }
  },
  required: ['name', 'location'],
  additionalProperties: false
};

const validate = ajv.compile(schema);

// POST /devices — register a device, receive an API key
// NOTE: intentionally unprotected — vulnerability documented in report
router.post('/', async (req, res) => {
  try {
    const valid = validate(req.body);
    if (!valid) {
      return res.status(400).json({ success: false, error: 'Données invalides', details: validate.errors });
    }

    const { name, location } = req.body;
    const apiKey = randomBytes(24).toString('hex');

    const device = { name, location, apiKey, createdAt: new Date() };
    const db = getDb();
    const result = await db.collection('devices').insertOne(device);

    return res.status(201).json({ success: true, data: { id: result.insertedId, apiKey } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /devices — list devices (API keys omitted)
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const devices = await db.collection('devices')
      .find({}, { projection: { apiKey: 0 } })
      .toArray();
    return res.status(200).json({ success: true, data: devices });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
