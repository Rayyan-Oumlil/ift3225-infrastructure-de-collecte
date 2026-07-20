import { timingSafeEqual } from 'crypto';
import { ObjectId } from 'mongodb';
import { getDb } from '../db.js';
import { verifyToken } from '../lib/jwt.js';

// Comparaison en temps constant (règle de sécurité du repo : éviter les timing attacks
// sur la vérification d'un secret). Renvoie false si les longueurs diffèrent.
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// Middleware device-only (clé API), utilisé par /measurements, inchangé depuis la Phase 1.
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

// Middleware hybride : accepte soit x-api-key (device) soit Authorization: Bearer <JWT> (usager).
// Utilisé par /observations pour permettre à la fois la collecte automatisée (bridge/import)
// et la soumission manuelle depuis l'application cliente (Phase 2).
async function resolveAuth(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers['authorization'];

    if (!apiKey && !authHeader) {
      return res.status(401).json({ success: false, error: 'Authentification manquante (x-api-key ou Authorization: Bearer requis)' });
    }

    const db = getDb();

    if (apiKey) {
      const device = await db.collection('devices').findOne({ apiKey });
      if (!device || !safeEqual(device.apiKey, apiKey)) {
        return res.status(403).json({ success: false, error: 'Clé API invalide' });
      }
      req.device = device;
      return next();
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ success: false, error: 'En-tête Authorization mal formé (attendu: Bearer <token>)' });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      return res.status(403).json({ success: false, error: 'Jeton invalide ou expiré' });
    }

    const user = await db.collection('users').findOne({ _id: new ObjectId(payload.sub) });
    if (!user) {
      return res.status(403).json({ success: false, error: 'Usager introuvable' });
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

export default authMiddleware;
export { resolveAuth };
