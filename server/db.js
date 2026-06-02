import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGO_URI);
let db;

async function connectDB() {
  await client.connect();
  db = client.db('ift3225');
  console.log('Connecté à MongoDB Atlas');
}

function getDb() {
  return db;
}

export { connectDB, getDb };
