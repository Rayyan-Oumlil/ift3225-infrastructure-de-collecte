import { Db, MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGO_URI ?? '');
let db: Db | undefined;

export async function connectDB(): Promise<void> {
  await client.connect();
  db = client.db('ift3225');
  console.log('Connecté à MongoDB Atlas');
}

export function getDb(): Db {
  if (!db) {
    throw new Error('Base de données non initialisée. Appelez connectDB() d\'abord.');
  }
  return db;
}
