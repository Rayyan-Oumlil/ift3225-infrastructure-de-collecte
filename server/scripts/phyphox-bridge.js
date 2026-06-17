import 'dotenv/config';

// Set PHYPHOX_IP at runtime: PHYPHOX_IP=192.168.x.x npm run bridge
const PHYPHOX_IP = process.env.PHYPHOX_IP || '192.168.1.100';
const PHYPHOX_PORT = process.env.PHYPHOX_PORT || '8080';
const PHYPHOX_URL = `http://${PHYPHOX_IP}:${PHYPHOX_PORT}/get?dB&time`;
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY;
const LOCATION = process.env.LOCATION || 'cafe-brunch';
const INTERVAL_MS = 5000;

if (!API_KEY) {
  console.error('API_KEY manquante. Enregistrez un appareil via POST /devices puis relancez avec API_KEY=<cle>.');
  process.exit(1);
}

async function poll() {
  try {
    const response = await fetch(PHYPHOX_URL);
    const json = await response.json();

    const buffer = json.buffer?.['dB'];
    if (!buffer || buffer.buffer.length === 0) {
      console.log('Aucune donnée Phyphox disponible');
      return;
    }

    const value = buffer.buffer[buffer.buffer.length - 1];
    const timestamp = new Date().toISOString();

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      console.log(`Valeur ignorée (non numérique): ${value}`);
      return;
    }

    const envoi = await fetch(`${SERVER_URL}/measurements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({ type: 'audio', value, location: LOCATION, timestamp })
    });

    const result = await envoi.json();
    if (result.success) {
      console.log(`[${timestamp}] ${value.toFixed(1)} dB enregistré (id: ${result.data.id})`);
    } else {
      console.error(`Erreur serveur: ${result.error}`);
    }
  } catch (err) {
    console.error('Erreur bridge:', err.message);
  }
}

console.log(`Bridge démarré, Phyphox @ ${PHYPHOX_IP}:${PHYPHOX_PORT}, envoi vers ${SERVER_URL}/measurements toutes les ${INTERVAL_MS / 1000}s`);
setInterval(poll, INTERVAL_MS);
