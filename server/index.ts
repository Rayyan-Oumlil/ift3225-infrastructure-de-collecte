import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { connectDB } from './db.js';
import devicesRouter from './routes/devices.js';
import measurementsRouter from './routes/measurements.js';
import observationsRouter from './routes/observations.js';
import ambianceRouter from './routes/ambiance.js';
import authRouter from './routes/auth.js';
import meRouter from './routes/me.js';
import locationsRouter from './routes/locations.js';
import { errorMessage } from './types.js';

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:4173')
  .split(',')
  .map((origin) => origin.trim());

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use('/devices', devicesRouter);
app.use('/measurements', measurementsRouter);
app.use('/observations', observationsRouter);
app.use('/ambiance', ambianceRouter);
app.use('/auth', authRouter);
app.use('/me', meRouter);
app.use('/locations', locationsRouter);

app.get('/', (_req: Request, res: Response) => {
  res.json({ success: true, data: 'API IFT3225 — Infrastructure de collecte' });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Ressource introuvable' });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Erreur non gérée:', errorMessage(err));
  const status = typeof err === 'object' && err !== null && 'status' in err ? Number((err as { status: number }).status) : 500;
  res.status(status || 500).json({ success: false, error: 'Erreur interne du serveur' });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Serveur démarré sur le port ${PORT}`);
    });
  })
  .catch((err: unknown) => {
    console.error('Erreur de connexion MongoDB:', errorMessage(err));
    process.exit(1);
  });
