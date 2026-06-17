import 'dotenv/config';
import { connectDB, getDb } from '../db.js';

function hoursAgo(h) {
  return new Date(Date.now() - h * 3600000);
}

const devices = [
  { name: 'phone-android', location: 'cafe-brunch', apiKey: 'demo-key-00000001', createdAt: hoursAgo(24) },
  { name: 'phone-ios', location: 'cafe-brunch', apiKey: 'demo-key-00000002', createdAt: hoursAgo(24) }
];

// Spread measurements across the last 6 hours to make history + quiet-hours endpoints useful
const measurements = [
  { type: 'audio', value: 38.4, location: 'cafe-brunch', timestamp: hoursAgo(6.0), receivedAt: hoursAgo(6.0) },
  { type: 'audio', value: 41.2, location: 'cafe-brunch', timestamp: hoursAgo(5.8), receivedAt: hoursAgo(5.8) },
  { type: 'audio', value: 40.7, location: 'cafe-brunch', timestamp: hoursAgo(5.5), receivedAt: hoursAgo(5.5) },
  { type: 'audio', value: 43.9, location: 'cafe-brunch', timestamp: hoursAgo(5.0), receivedAt: hoursAgo(5.0) },
  { type: 'audio', value: 58.1, location: 'cafe-brunch', timestamp: hoursAgo(4.0), receivedAt: hoursAgo(4.0) },
  { type: 'audio', value: 63.4, location: 'cafe-brunch', timestamp: hoursAgo(3.8), receivedAt: hoursAgo(3.8) },
  { type: 'audio', value: 71.2, location: 'cafe-brunch', timestamp: hoursAgo(3.5), receivedAt: hoursAgo(3.5) },
  { type: 'audio', value: 68.9, location: 'cafe-brunch', timestamp: hoursAgo(3.0), receivedAt: hoursAgo(3.0) },
  { type: 'audio', value: 55.3, location: 'cafe-brunch', timestamp: hoursAgo(2.0), receivedAt: hoursAgo(2.0) },
  { type: 'audio', value: 52.7, location: 'cafe-brunch', timestamp: hoursAgo(1.5), receivedAt: hoursAgo(1.5) },
  { type: 'audio', value: 47.8, location: 'cafe-brunch', timestamp: hoursAgo(0.5), receivedAt: hoursAgo(0.5) },
  { type: 'audio', value: 45.1, location: 'cafe-brunch', timestamp: hoursAgo(0.2), receivedAt: hoursAgo(0.2) }
];

const observations = [
  {
    location: 'cafe-brunch',
    proximity: 'low',
    vibe: 'calme',
    notes: 'Matinée tranquille, peu de clients',
    hour: 8,
    dayOfWeek: 1,
    timestamp: hoursAgo(6),
    receivedAt: hoursAgo(6)
  },
  {
    location: 'cafe-brunch',
    proximity: 'high',
    vibe: 'animé',
    notes: 'Heure du lunch, tables presque toutes occupées',
    hour: 12,
    dayOfWeek: 1,
    timestamp: hoursAgo(3.5),
    receivedAt: hoursAgo(3.5)
  },
  {
    location: 'cafe-brunch',
    proximity: 'medium',
    vibe: 'modéré',
    notes: 'Début de soirée, ambiance studieuse',
    hour: 17,
    dayOfWeek: 1,
    timestamp: hoursAgo(0.5),
    receivedAt: hoursAgo(0.5)
  }
];

async function seed() {
  await connectDB();
  const db = getDb();

  await Promise.all([
    db.collection('devices').deleteMany({}),
    db.collection('measurements').deleteMany({}),
    db.collection('observations').deleteMany({})
  ]);

  await db.collection('devices').insertMany(devices);
  await db.collection('measurements').insertMany(measurements);
  await db.collection('observations').insertMany(observations);

  console.log(`Seed terminé : ${devices.length} appareils, ${measurements.length} mesures, ${observations.length} observations.`);
  console.log('Clés API de démo : demo-key-00000001 / demo-key-00000002');
  process.exit(0);
}

seed().catch(err => {
  console.error('Erreur seed:', err.message);
  process.exit(1);
});
