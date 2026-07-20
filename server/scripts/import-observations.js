import 'dotenv/config';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, getDb } from '../db.js';
import validate from '../schemas/observation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OBSERVATIONS_FILE = path.resolve(__dirname, '../../data/observations.json');

function buildDoc(obs) {
  const ts = obs.timestamp ? new Date(obs.timestamp) : new Date();
  if (!Number.isFinite(ts.getTime())) {
    throw new Error(`timestamp invalide: ${obs.timestamp}`);
  }
  return {
    location: obs.location,
    proximity: obs.proximity,
    vibe: obs.vibe,
    notes: obs.notes ?? null,
    hour: ts.getHours(),
    dayOfWeek: ts.getDay(),
    deviceId: null,
    authorId: null,
    timestamp: ts,
    receivedAt: ts,
    source: 'manual-import'
  };
}

async function run() {
  const raw = JSON.parse(readFileSync(OBSERVATIONS_FILE, 'utf-8'));
  const observations = raw.observations ?? [];

  if (observations.length === 0) {
    console.log('Aucune observation dans data/observations.json.');
    process.exit(0);
  }

  const docs = [];
  for (const obs of observations) {
    if (!validate(obs)) {
      console.error(`Observation ignorée (invalide):`, validate.errors);
      continue;
    }
    docs.push(buildDoc(obs));
  }

  if (docs.length === 0) {
    console.log('Aucune observation valide à importer.');
    process.exit(0);
  }

  await connectDB();
  const db = getDb();

  if (process.env.IMPORT_RESET === '1') {
    const { deletedCount } = await db
      .collection('observations')
      .deleteMany({ source: 'manual-import' });
    console.log(`Réinitialisation : ${deletedCount} observations importées précédemment supprimées.`);
  }

  const result = await db.collection('observations').insertMany(docs);
  console.log(`Import terminé : ${result.insertedCount} observations insérées.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Erreur import-observations:', err.message);
  process.exit(1);
});
