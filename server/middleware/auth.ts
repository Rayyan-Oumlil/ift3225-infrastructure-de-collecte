import { timingSafeEqual } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../db.js';
import { verifyToken } from '../lib/jwt.js';
import type { Device, User } from '../types.js';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const key = req.headers['x-api-key'];
    if (!key || Array.isArray(key)) {
      res.status(401).json({ success: false, error: 'Clé API manquante' });
      return;
    }

    const db = getDb();
    const device = await db.collection<Device>('devices').findOne({ apiKey: key });

    if (!device || !safeEqual(device.apiKey, key)) {
      res.status(403).json({ success: false, error: 'Clé API invalide' });
      return;
    }

    req.device = device;
    next();
  } catch (err) {
    next(err);
  }
}

async function resolveUserFromHeader(
  authHeader: string | undefined,
): Promise<{ user?: User; error?: { status: number; message: string } }> {
  const [scheme, token] = (authHeader ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return { error: { status: 401, message: 'En-tête Authorization mal formé (attendu: Bearer <token>)' } };
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return { error: { status: 403, message: 'Jeton invalide ou expiré' } };
  }

  const db = getDb();
  const user = await db.collection<User>('users').findOne({ _id: new ObjectId(payload.sub) });
  if (!user) {
    return { error: { status: 403, message: 'Usager introuvable' } };
  }

  return { user };
}

async function resolveAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers['authorization'];

    if (!apiKey && !authHeader) {
      res.status(401).json({
        success: false,
        error: 'Authentification manquante (x-api-key ou Authorization: Bearer requis)',
      });
      return;
    }

    if (apiKey && !Array.isArray(apiKey)) {
      const db = getDb();
      const device = await db.collection<Device>('devices').findOne({ apiKey });
      if (!device || !safeEqual(device.apiKey, apiKey)) {
        res.status(403).json({ success: false, error: 'Clé API invalide' });
        return;
      }
      req.device = device;
      next();
      return;
    }

    const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    const { user, error } = await resolveUserFromHeader(header);
    if (error) {
      res.status(error.status).json({ success: false, error: error.message });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      res.status(401).json({ success: false, error: 'Authentification manquante (Authorization: Bearer requis)' });
      return;
    }

    const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    const { user, error } = await resolveUserFromHeader(header);
    if (error) {
      res.status(error.status).json({ success: false, error: error.message });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export default authMiddleware;
export { resolveAuth, requireUser };
