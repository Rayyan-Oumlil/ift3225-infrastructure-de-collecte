import express from 'express';
import { getDb } from '../db.js';
import { requireUser } from '../middleware/auth.js';

const router = express.Router();

router.use(requireUser);

// GET /me : profil de l'usager connecté (identité + favoris)
router.get('/', async (req, res) => {
  const { _id, username, favoriteLocations, createdAt } = req.user;
  return res.status(200).json({
    success: true,
    data: { id: _id, username, favoriteLocations: favoriteLocations ?? [], createdAt }
  });
});

// GET /me/observations : récapitulatif des contributions de l'usager
router.get('/observations', async (req, res) => {
  try {
    const db = getDb();
    const observations = await db
      .collection('observations')
      .find({ authorId: req.user._id })
      .sort({ timestamp: -1 })
      .toArray();

    return res.status(200).json({ success: true, data: observations });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /me/locations : lieux distincts où l'usager a soumis une observation ("ses lieux")
router.get('/locations', async (req, res) => {
  try {
    const db = getDb();
    const locations = await db
      .collection('observations')
      .distinct('location', { authorId: req.user._id });

    return res.status(200).json({ success: true, data: locations });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /me/favorites { location } : ajoute un lieu favori
router.post('/favorites', async (req, res) => {
  try {
    const { location } = req.body;
    if (typeof location !== 'string' || location.trim() === '') {
      return res.status(400).json({ success: false, error: 'Le champ location (chaîne non vide) est requis' });
    }

    const db = getDb();
    await db.collection('users').updateOne(
      { _id: req.user._id },
      { $addToSet: { favoriteLocations: location } }
    );

    const updated = await db.collection('users').findOne({ _id: req.user._id });
    return res.status(200).json({ success: true, data: { favoriteLocations: updated.favoriteLocations ?? [] } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /me/favorites/:location : retire un lieu favori
router.delete('/favorites/:location', async (req, res) => {
  try {
    const db = getDb();
    await db.collection('users').updateOne(
      { _id: req.user._id },
      { $pull: { favoriteLocations: req.params.location } }
    );

    const updated = await db.collection('users').findOne({ _id: req.user._id });
    return res.status(200).json({ success: true, data: { favoriteLocations: updated.favoriteLocations ?? [] } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
