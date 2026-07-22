import express, { type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';
import validate from '../schemas/auth.js';
import { signToken } from '../lib/jwt.js';
import type { User } from '../types.js';
import { errorMessage } from '../types.js';

const router = express.Router();
const SALT_ROUNDS = 10;

router.post('/register', async (req: Request, res: Response) => {
  try {
    const valid = validate(req.body);
    if (!valid) {
      res.status(400).json({ success: false, error: 'Données invalides', details: validate.errors });
      return;
    }

    const { username, password } = req.body as { username: string; password: string };
    const db = getDb();

    const existing = await db.collection<User>('users').findOne({ username });
    if (existing) {
      res.status(409).json({ success: false, error: 'Ce nom d\'utilisateur est déjà pris' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user: Omit<User, '_id'> = { username, passwordHash, favoriteLocations: [], createdAt: new Date() };
    const result = await db.collection<Omit<User, '_id'>>('users').insertOne(user);

    const token = signToken({ _id: result.insertedId, username });
    res.status(201).json({ success: true, data: { id: result.insertedId, username, token } });
  } catch (err) {
    res.status(500).json({ success: false, error: errorMessage(err) });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const valid = validate(req.body);
    if (!valid) {
      res.status(400).json({ success: false, error: 'Données invalides', details: validate.errors });
      return;
    }

    const { username, password } = req.body as { username: string; password: string };
    const db = getDb();

    const user = await db.collection<User>('users').findOne({ username });
    const passwordOk = user ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!user || !passwordOk) {
      res.status(401).json({ success: false, error: 'Identifiants invalides' });
      return;
    }

    const token = signToken(user);
    res.status(200).json({ success: true, data: { id: user._id, username: user.username, token } });
  } catch (err) {
    res.status(500).json({ success: false, error: errorMessage(err) });
  }
});

export default router;
