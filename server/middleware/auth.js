import { timingSafeEqual } from 'crypto';
import { getDb } from '../db.js';

// Comparaison en temps constant (règle de sécurité du repo : éviter les timing attacks
// sur la vérification d'un secret). Renvoie false si les longueurs diffèrent.
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

async function authMiddleware(req, res, next) {
  try {
    const key = req.headers['x-api-key'];

    if (!key) {
      return res.status(401).json({ success: false, error: 'Clé API manquante' });
    }

    const db = getDb();
    const device = await db.collection('devices').findOne({ apiKey: key });

    if (!device || !safeEqual(device.apiKey, key)) {
      return res.status(403).json({ success: false, error: 'Clé API invalide' });
    }

    req.device = device;
    return next();
  } catch (err) {
    return next(err);
  }
}

export default authMiddleware;
