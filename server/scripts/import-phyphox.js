import 'dotenv/config';
import { readFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, getDb } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_DATA_DIR = path.resolve(__dirname, '../../data/raw-data');
const SESSIONS_MAP_FILE = path.resolve(__dirname, '../../data/sessions.json');

// Agrégation en tranches de N secondes (aligné sur la cadence du bridge)
const INTERVAL_SECONDS = Number(process.env.IMPORT_INTERVAL_SECONDS) || 5;

// Parse une cellule en notation scientifique ou décimale classique
function parseNum(cell) {
  if (cell == null) return NaN;
  return Number(String(cell).trim().replace(/"/g, ''));
}

// Parse le CSV Phyphox (Amplitudes.csv) : colonnes "Time (s)" + "Sound pressure level (dB)"
function parseAmplitudesCsv(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) throw new Error('CSV vide');

  // Détecte le séparateur (virgule ou point-virgule)
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map((h) => h.trim().replace(/"/g, ''));

  const timeIdx = headers.findIndex((h) => /time/i.test(h));
  const valueIdx = headers.findIndex((h) => /sound|pressure|db|niveau|amplitude/i.test(h));

  if (timeIdx === -1 || valueIdx === -1) {
    throw new Error(`Colonnes introuvables dans le CSV. En-têtes: ${headers.join(', ')}`);
  }

  // Agrégation par tranches de INTERVAL_SECONDS : moyenne dB
  const buckets = new Map();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep);
    const tRel = parseNum(cols[timeIdx]);
    const value = parseNum(cols[valueIdx]);
    if (!Number.isFinite(tRel) || !Number.isFinite(value)) continue;

    const bucket = Math.floor(tRel / INTERVAL_SECONDS);
    if (!buckets.has(bucket)) buckets.set(bucket, { sum: 0, count: 0 });
    const b = buckets.get(bucket);
    b.sum += value;
    b.count += 1;
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([bucket, { sum, count }]) => ({
      tRel: bucket * INTERVAL_SECONDS,
      value: Math.round((sum / count) * 10) / 10
    }));
}

// Extrait le timestamp de début depuis meta/time.csv (colonne "system time text" ou "system time")
function parseStartTime(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) throw new Error('meta/time.csv vide');

  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map((h) => h.trim().replace(/"/g, ''));

  // Cherche la ligne START
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map((c) => c.trim().replace(/"/g, ''));
    const event = cols[0];
    if (!/start/i.test(event)) continue;

    // Priorité : "system time text" (lisible ISO)
    const textIdx = headers.findIndex((h) => /system.time.text/i.test(h));
    if (textIdx !== -1 && cols[textIdx]) {
      const t = new Date(cols[textIdx]);
      if (Number.isFinite(t.getTime())) return t;
    }

    // Fallback : "system time" (timestamp Unix en secondes)
    const numIdx = headers.findIndex((h) => /^system.time$/i.test(h));
    if (numIdx !== -1) {
      const ts = parseNum(cols[numIdx]) * 1000;
      if (Number.isFinite(ts)) return new Date(ts);
    }
  }
  throw new Error('Événement START introuvable dans meta/time.csv');
}

// Charge le mapping optionnel dossier → { location, label } depuis sessions.json
function loadSessionsMap() {
  if (!existsSync(SESSIONS_MAP_FILE)) return {};
  const raw = JSON.parse(readFileSync(SESSIONS_MAP_FILE, 'utf-8'));
  const map = {};
  for (const s of raw.sessions ?? []) {
    if (s.folder) map[s.folder] = { location: s.location, label: s.label };
  }
  return map;
}

async function run() {
  if (!existsSync(RAW_DATA_DIR)) {
    console.error(`Dossier introuvable : ${RAW_DATA_DIR}`);
    process.exit(1);
  }

  const sessionsMap = loadSessionsMap();
  const folders = readdirSync(RAW_DATA_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  if (folders.length === 0) {
    console.log('Aucun sous-dossier dans data/raw-data/. Déposez vos exports Phyphox dedans.');
    process.exit(0);
  }

  let allDocs = [];

  for (const folder of folders) {
    const folderPath = path.join(RAW_DATA_DIR, folder);
    const amplitudesFile = path.join(folderPath, 'Amplitudes.csv');
    const timeFile = path.join(folderPath, 'meta', 'time.csv');

    if (!existsSync(amplitudesFile)) {
      console.warn(`${folder} : Amplitudes.csv introuvable, ignoré.`);
      continue;
    }
    if (!existsSync(timeFile)) {
      console.warn(`${folder} : meta/time.csv introuvable, ignoré.`);
      continue;
    }

    try {
      const startTime = parseStartTime(readFileSync(timeFile, 'utf-8'));
      const samples = parseAmplitudesCsv(readFileSync(amplitudesFile, 'utf-8'));

      const info = sessionsMap[folder] ?? {};
      const location = info.location ?? 'cafe-brunch';
      const label = info.label ?? folder;

      const docs = samples.map(({ tRel, value }) => {
        const timestamp = new Date(startTime.getTime() + tRel * 1000);
        return {
          type: 'audio',
          value,
          location,
          session: label,
          timestamp,
          receivedAt: timestamp,
          source: 'phyphox-import'
        };
      });

      console.log(`${folder} → ${docs.length} mesures | début : ${startTime.toISOString()} | lieu : ${location}`);
      allDocs = allDocs.concat(docs);
    } catch (err) {
      console.error(`${folder} : erreur — ${err.message}`);
    }
  }

  if (allDocs.length === 0) {
    console.log('Aucune mesure valide à importer.');
    process.exit(0);
  }

  await connectDB();
  const db = getDb();

  if (process.env.IMPORT_RESET === '1') {
    const { deletedCount } = await db
      .collection('measurements')
      .deleteMany({ source: 'phyphox-import' });
    console.log(`Réinitialisation : ${deletedCount} mesures supprimées.`);
  }

  const result = await db.collection('measurements').insertMany(allDocs);
  console.log(`\nImport terminé : ${result.insertedCount} mesures insérées.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Erreur import-phyphox:', err.message);
  process.exit(1);
});
