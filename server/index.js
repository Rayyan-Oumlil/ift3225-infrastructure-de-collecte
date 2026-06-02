import 'dotenv/config';
import express from 'express';
import { connectDB } from './db.js';
import devicesRouter from './routes/devices.js';
import measurementsRouter from './routes/measurements.js';
import observationsRouter from './routes/observations.js';
import ambianceRouter from './routes/ambiance.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/devices', devicesRouter);
app.use('/measurements', measurementsRouter);
app.use('/observations', observationsRouter);
app.use('/ambiance', ambianceRouter);

app.get('/', (req, res) => {
  res.json({ success: true, data: 'API IFT3225 — Infrastructure de collecte' });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Serveur démarré sur le port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Erreur de connexion MongoDB:', err.message);
    process.exit(1);
  });
