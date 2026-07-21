# IFT3225 — Infrastructure de collecte d'ambiance

Système de collecte, persistance et consultation de données d'ambiance en quasi temps réel. Un téléphone instrumenté avec Phyphox capte le niveau sonore ambiant ; un bridge transmet ces mesures vers une API REST (Express + MongoDB Atlas) qui les rend interrogeables via des endpoints sémantiques.

## Prérequis

- Node.js v20+
- Compte MongoDB Atlas (cluster gratuit M0 suffit)
- Application Phyphox installée sur un téléphone Android ou iOS
- Postman (pour tester les endpoints)

## Installation et lancement

```bash
# 1. Cloner le dépôt
git clone <url-du-depot>
cd <nom-du-depot>

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs (MONGO_URI, PORT)

# 4. Peupler la base avec des données de démonstration
npm run seed

# 5. Lancer le serveur
npm start
```

Le serveur écoute sur `http://localhost:3000` par défaut.

## Variables d'environnement
| Variable | Description | Utilisé par |
|----------|-------------|-------------|
| `MONGO_URI` | URI de connexion MongoDB Atlas | serveur, seed, import |
| `PORT` | Port d'écoute du serveur (défaut : 3000) | serveur |
| `PHYPHOX_IP` | IP du téléphone exécutant Phyphox (accès distant) | bridge |
| `PHYPHOX_PORT` | Port du serveur Phyphox (défaut : 8080, souvent 80) | bridge |
| `API_KEY` | Clé API d'un device enregistré (`POST /devices`) | bridge |
| `SERVER_URL` | URL de l'API ciblée par le bridge (défaut : `http://localhost:3000`) | bridge |
| `LOCATION` | Identifiant du lieu attaché à chaque mesure (défaut si absent : `cafe-brunch`). Préférer `LOCATION=<lieu> npm run bridge` plutôt que le `.env` | bridge |

## Données de collecte

Trois façons de peupler la base :

- **Temps réel (bridge Phyphox)** — avec le téléphone sur le même réseau Wi-Fi et « Autoriser l'accès distant » activé dans Phyphox :

```bash
# 1. Enregistrer le lieu (coordonnées pour la carte client)
curl -X POST http://localhost:3000/locations \
  -H "Content-Type: application/json" \
  -d '{"name":"mon-lieu","lat":45.49,"lng":-73.56}'

# 2. Configurer PHYPHOX_IP et API_KEY dans .env, puis collecter (2–3 min)
LOCATION=mon-lieu npm run bridge
```

Si `LOCATION` est absent, le bridge utilise `cafe-brunch` par défaut. Le lieu indiqué sur `POST /devices` n'est pas repris automatiquement.

**Important :** `POST /locations` (carte) et `LOCATION` au bridge (mesures) sont deux étapes distinctes. Sans `POST /locations`, les mesures sont bien enregistrées et `/ambiance/:location` fonctionne, mais le lieu n'apparaît pas sur la carte client.

- **Import CSV (sessions enregistrées)** — déposez vos exports dans `data/raw-data/<nom-session>/`, décrivez chaque session dans `data/sessions.json`, puis :

```bash
npm run import:phyphox   # importe les mesures sonores
npm run import:obs       # importe les observations environnementales
```

- **Données de démonstration** — `npm run seed` peuple rapidement la base pour tester les endpoints `/ambiance` sans collecte réelle.

## Endpoints

### Gestion des lieux

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/locations` | Enregistrer (ou mettre à jour) un lieu avec coordonnées `{ name, lat, lng }` |
| `GET` | `/locations` | Lister les lieux connus (consommée par la carte client) |

### Gestion des appareils

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/devices` | Enregistrer un appareil, obtenir une clé API |
| `GET` | `/devices` | Lister les appareils enregistrés |

### Collecte (authentification requise — `x-api-key`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/measurements` | Envoyer une mesure sonore (Phyphox) |
| `POST` | `/observations` | Envoyer une observation environnementale |

### Consultation sémantique

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/ambiance/:location/history` | Évolution du niveau sonore sur une période |
| `GET` | `/ambiance/:location/quiet-hours` | Créneaux typiquement calmes |
| `GET` | `/ambiance/:location/snapshot` | Portrait actuel du lieu |

## Authentification

Les endpoints d'écriture exigent une clé API dans l'en-tête HTTP :

```
x-api-key: <votre-cle>
```

- `401` — en-tête absent
- `403` — clé invalide ou appareil inconnu

Obtenir une clé : `POST /devices` avec `{ "name": "mon-telephone", "location": "cafe-brunch" }`.

## Tests avec Postman

Importer la collection `postman_collection.json` (à la racine du dépôt) pour avoir tous les exemples de requêtes préconfigurés.

## Bridge Phyphox

Le script de collecte automatique en temps réel se trouve dans `server/scripts/phyphox-bridge.js`.

```bash
# Depuis le même réseau Wi-Fi que le téléphone, avec « Autoriser l'accès distant » activé dans Phyphox
# Configurer PHYPHOX_IP et API_KEY dans .env

# Recommandé : passer le lieu en ligne de commande
LOCATION=bureau-autodesk npm run bridge
```

Il interroge Phyphox toutes les 5 secondes et POST les mesures vers `/measurements` avec le `location` indiqué.

Ordre recommandé : `POST /locations` → `POST /devices` → `LOCATION=<lieu> npm run bridge` (2–3 minutes).

## Équipe

- Rayyan Oumlil
- Aness Lakhdar Azzouz

Université de Montréal — IFT3225, session Été 2026
