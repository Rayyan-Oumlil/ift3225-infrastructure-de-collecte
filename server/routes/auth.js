import express from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';
import validate from '../schemas/auth.js';
import { signToken } from '../lib/jwt.js';

const router = express.Router();
const SALT_ROUNDS = 10;

// POST /auth/register — create a user account, receive a JWT
router.post('/register', async (req, res) => {
  try {
    const valid = validate(req.body);
    if (!valid) {
      return res.status(400).json({ success: false, error: 'Données invalides', details: validate.errors });
    }

    const { username, password } = req.body;
    const db = getDb();

    const existing = await db.collection('users').findOne({ username });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Ce nom d\'utilisateur est déjà pris' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = { username, passwordHash, favoriteLocations: [], createdAt: new Date() };
    const result = await db.collection('users').insertOne(user);

    const token = signToken({ _id: result.insertedId, username });
    return res.status(201).json({ success: true, data: { id: result.insertedId, username, token } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /auth/login — verify credentials, receive a JWT
router.post('/login', async (req, res) => {
  try {
    const valid = validate(req.body);
    if (!valid) {
      return res.status(400).json({ success: false, error: 'Données invalides', details: validate.errors });
    }

    const { username, password } = req.body;
    const db = getDb();

    const user = await db.collection('users').findOne({ username });
    const passwordOk = user ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!user || !passwordOk) {
      return res.status(401).json({ success: false, error: 'Identifiants invalides' });
    }

    const token = signToken(user);
    return res.status(200).json({ success: true, data: { id: user._id, username: user.username, token } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
