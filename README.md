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

Voir `.env.example` pour la liste complète. Les variables obligatoires sont :

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | URI de connexion MongoDB Atlas |
| `PORT` | Port d'écoute du serveur (défaut : 3000) |

## Endpoints

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

Obtenir une clé : `POST /devices` avec `{ "name": "mon-telephone", "location": "bibliotheque" }`.

## Tests avec Postman

Importer la collection `postman_collection.json` (à la racine du dépôt) pour avoir tous les exemples de requêtes préconfigurés.

## Bridge Phyphox

Le script de collecte automatique se trouve dans `bridge/`:

```bash
# Depuis le même réseau Wi-Fi que le téléphone
PHYPHOX_IP=192.168.x.x API_KEY=<votre-cle> npm run bridge
```

Il interroge Phyphox toutes les 5 secondes et POST les mesures vers `/measurements`.

## Équipe

- Rayyan Oumlil
- [Partenaire]

Université de Montréal — IFT3225, session Été 2026
