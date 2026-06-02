import { getDb } from '../db.js';

async function authMiddleware(req, res, next) {
  const key = req.headers['x-api-key'];

  if (!key) {
    return res.status(401).json({ success: false, error: 'Clé API manquante' });
  }

  const db = getDb();
  const device = await db.collection('devices').findOne({ apiKey: key });

  if (!device) {
    return res.status(403).json({ success: false, error: 'Clé API invalide' });
  }

  req.device = device;
  next();
}

export default authMiddleware;
