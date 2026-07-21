# IFT3225 — Infrastructure de collecte d'ambiance

Système de collecte, persistance et consultation de données d'ambiance en quasi temps réel. Un téléphone instrumenté avec Phyphox capte le niveau sonore ambiant ; un bridge transmet ces mesures vers une API REST (Express + MongoDB Atlas) qui les rend interrogeables via des endpoints sémantiques. Un client React (dossier `client/`, Phase 2) consomme cette API : carte des lieux, portrait détaillé, authentification et espace compte.

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

### Lancer le client (Phase 2)

Dans un second terminal, avec le serveur ci-dessus déjà démarré :

```bash
cd client
npm install
cp .env.example .env   # laisser VITE_API_URL vide en dev (proxy Vite vers l'API locale)
npm run dev
```

Le client écoute sur `http://localhost:5173` par défaut. Voir [`client/README.md`](client/README.md) pour le détail (structure, configuration, comment tester les actions protégées).

## Variables d'environnement

### Serveur (`.env` à la racine)

| Variable | Description | Utilisé par |
|----------|-------------|-------------|
| `MONGO_URI` | URI de connexion MongoDB Atlas | serveur, seed, import |
| `PORT` | Port d'écoute du serveur (défaut : 3000) | serveur |
| `JWT_SECRET` | Secret de signature des JWT usagers (chaîne aléatoire, jamais commitée) | `/auth`, `/me`, `/observations` (JWT) |
| `PHYPHOX_IP` | IP du téléphone exécutant Phyphox (accès distant) | bridge |
| `PHYPHOX_PORT` | Port du serveur Phyphox (défaut : 8080, souvent 80) | bridge |
| `API_KEY` | Clé API d'un device enregistré (`POST /devices`) | bridge |
| `SERVER_URL` | URL de l'API ciblée par le bridge (défaut : `http://localhost:3000`) | bridge |
| `LOCATION` | **Obligatoire.** Identifiant du lieu attaché à chaque mesure (`LOCATION=<lieu> npm run bridge` ou dans `.env`) | bridge |

### Client (`client/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | URL de l'API. Vide en dev (proxy Vite) ; URL publique en production |

## Données de collecte

Trois façons de peupler la base :

- **Temps réel (bridge Phyphox)** — avec le téléphone sur le même réseau Wi-Fi et « Autoriser l'accès distant » activé dans Phyphox :

```bash
# 1. Enregistrer le lieu (coordonnées pour la carte client)
curl -X POST http://localhost:3000/locations \
  -H "Content-Type: application/json" \
  -d '{"name":"mon-lieu","lat":45.49,"lng":-73.56}'

# 2. Configurer PHYPHOX_IP, API_KEY et LOCATION dans .env (ou en ligne de commande), puis collecter (2–3 min)
LOCATION=mon-lieu npm run bridge
```

`LOCATION` est **obligatoire** : sans elle, le bridge refuse de démarrer. Le lieu indiqué sur `POST /devices` n'est pas repris automatiquement.

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

### Lieux

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/locations` | Créer ou mettre à jour un lieu (`name`, `lat`, `lng`) |
| `GET` | `/locations` | Lister les lieux (utilisé par la vue carte) |

### Comptes usagers (Phase 2)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `POST` | `/auth/register` | — | Créer un compte, recevoir un JWT |
| `POST` | `/auth/login` | — | S'authentifier, recevoir un JWT |
| `GET` | `/me` | JWT | Profil de l'usager connecté |
| `GET` | `/me/observations` | JWT | Contributions de l'usager |
| `GET` | `/me/locations` | JWT | Lieux où l'usager a soumis une observation |
| `POST` | `/me/favorites` | JWT | Ajouter un lieu favori |
| `DELETE` | `/me/favorites/:location` | JWT | Retirer un lieu favori |

### Collecte (authentification requise)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `POST` | `/measurements` | `x-api-key` (device) | Envoyer une mesure sonore (Phyphox) |
| `POST` | `/observations` | `x-api-key` **ou** `Authorization: Bearer <JWT>` | Envoyer une observation environnementale (device automatisé ou usager connecté — l'observation est liée à l'auteur si soumise via JWT) |

### Consultation sémantique

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/ambiance/:location/history` | Évolution du niveau sonore sur une période |
| `GET` | `/ambiance/:location/quiet-hours` | Créneaux typiquement calmes |
| `GET` | `/ambiance/:location/snapshot` | Portrait actuel du lieu |

## Authentification

Deux mécanismes coexistent, pour deux usages différents :

**Appareils de collecte** — clé API dans l'en-tête HTTP, sur `/measurements` et (en alternative au JWT) `/observations` :

```
x-api-key: <votre-cle>
```

- `401` — en-tête absent
- `403` — clé invalide ou appareil inconnu

Obtenir une clé : `POST /devices` avec `{ "name": "mon-telephone", "location": "cafe-brunch" }`.

**Usagers (client Phase 2)** — jeton JWT dans l'en-tête HTTP, sur `/me/*` et (en alternative à la clé API) `/observations` :

```
Authorization: Bearer <jeton>
```

- `401` — en-tête absent ou mal formé
- `403` — jeton invalide/expiré, ou usager introuvable

Obtenir un jeton : `POST /auth/register` ou `POST /auth/login` avec `{ "username": "...", "password": "..." }` (mot de passe ≥ 8 caractères).

## Tests avec Postman

Importer la collection `postman_collection.json` (à la racine du dépôt) pour avoir tous les exemples de requêtes préconfigurés.

## Bridge Phyphox

Le script de collecte automatique en temps réel se trouve dans `server/scripts/phyphox-bridge.js`.

```bash
# Depuis le même réseau Wi-Fi que le téléphone, avec « Autoriser l'accès distant » activé dans Phyphox
# Configurer PHYPHOX_IP, API_KEY et LOCATION dans .env

# Ou passer LOCATION en ligne de commande :
LOCATION=bureau-autodesk npm run bridge
```

Il interroge Phyphox toutes les 5 secondes et POST les mesures vers `/measurements` avec le `location` indiqué.

Ordre recommandé : `POST /locations` → `POST /devices` → `LOCATION=<lieu> npm run bridge` (2–3 minutes).

## Équipe

- Rayyan Oumlil
- Aness Lakhdar Azzouz

Université de Montréal — IFT3225, session Été 2026
