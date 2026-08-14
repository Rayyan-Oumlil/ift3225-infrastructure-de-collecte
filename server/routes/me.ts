import express, { type Request, type Response } from 'express';
import { getDb } from '../db.js';
import { requireUser } from '../middleware/auth.js';
import type { Observation, User } from '../types.js';
import { errorMessage } from '../types.js';
import { noStore } from '../middleware/cache.js';

const router = express.Router();

router.use(requireUser);
router.use(noStore);

router.get('/', (req: Request, res: Response) => {
  const user = req.user!;
  const { _id, username, favoriteLocations, createdAt } = user;
  res.status(200).json({
    success: true,
    data: { id: _id, username, favoriteLocations: favoriteLocations ?? [], createdAt },
  });
});

router.get('/observations', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const observations = await db
      .collection<Observation>('observations')
      .find({ authorId: req.user!._id })
      .sort({ timestamp: -1 })
      .toArray();

    res.status(200).json({ success: true, data: observations });
  } catch (err) {
    res.status(500).json({ success: false, error: errorMessage(err) });
  }
});

router.get('/locations', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const locations = await db
      .collection<Observation>('observations')
      .distinct('location', { authorId: req.user!._id });

    res.status(200).json({ success: true, data: locations });
  } catch (err) {
    res.status(500).json({ success: false, error: errorMessage(err) });
  }
});

router.post('/favorites', async (req: Request, res: Response) => {
  try {
    const { location } = req.body as { location?: unknown };
    if (typeof location !== 'string' || location.trim() === '') {
      res.status(400).json({ success: false, error: 'Le champ location (chaîne non vide) est requis' });
      return;
    }

    const db = getDb();
    await db.collection<User>('users').updateOne(
      { _id: req.user!._id },
      { $addToSet: { favoriteLocations: location } },
    );

    const updated = await db.collection<User>('users').findOne({ _id: req.user!._id });
    res.status(200).json({ success: true, data: { favoriteLocations: updated?.favoriteLocations ?? [] } });
  } catch (err) {
    res.status(500).json({ success: false, error: errorMessage(err) });
  }
});

router.delete('/favorites/:location', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    await db.collection<User>('users').updateOne(
      { _id: req.user!._id },
      { $pull: { favoriteLocations: req.params.location } },
    );

    const updated = await db.collection<User>('users').findOne({ _id: req.user!._id });
    res.status(200).json({ success: true, data: { favoriteLocations: updated?.favoriteLocations ?? [] } });
  } catch (err) {
    res.status(500).json({ success: false, error: errorMessage(err) });
  }
});

export default router;
