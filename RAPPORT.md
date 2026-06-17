# Rapport — Infrastructure de collecte d'ambiance

**IFT3225 — Livrable 1, Phase 1**
**Équipe :** Rayyan Oumlil, Aness Lakhdar Azzouz
**Université de Montréal — Été 2026**

---

> **Pour les correcteurs, accès base de données**
>
> ```
> MONGO_URI=mongodb+srv://correcteur:ift3225-correcteur@phase1.qdtdvpf.mongodb.net/ift3225?retryWrites=true&w=majority
> ```
>
> Remplacez la valeur de `MONGO_URI` dans votre `.env` par cette URI avant de lancer `npm start`. Cet utilisateur dispose des droits en lecture et écriture ; vous pouvez donc tester le bridge et les endpoints POST. Pour préserver les données de collecte existantes, évitez de lancer `npm run seed` ou `npm run import:phyphox` (ces scripts réinitialisent les collections).

---

Ce rapport constitue la spécification du protocole de communication avec notre système. Il décrit les ressources exposées, les conventions adoptées, le mécanisme d'authentification, la chaîne de collecte, la logique d'agrégation des endpoints sémantiques, ainsi que les limites assumées.

---

## 1. Ressources et endpoints

### 1.1 Table complète des endpoints

| Méthode | Chemin | Auth | Corps attendu | Réponse (succès) | Codes possibles |
|---------|--------|------|---------------|------------------|-----------------|
| `POST` | `/devices` | Non | `{ name, location }` | `201` + `{ id, apiKey }` | 201, 400, 500 |
| `GET` | `/devices` | Non | — | `200` + `[ { id, name, location, createdAt } ]` | 200, 500 |
| `POST` | `/measurements` | `x-api-key` | `{ type, value, location, timestamp? }` | `201` + document créé | 201, 400, 401, 403, 500 |
| `POST` | `/observations` | `x-api-key` | `{ location, proximity, vibe, notes?, timestamp? }` | `201` + document créé | 201, 400, 401, 403, 500 |
| `GET` | `/ambiance/:location/snapshot` | Non | — | `200` + portrait courant | 200, 404, 500 |
| `GET` | `/ambiance/:location/history?last=3h` | Non | — | `200` + séries temporelles | 200, 404, 500 |
| `GET` | `/ambiance/:location/quiet-hours` | Non | — | `200` + heures calmes | 200, 404, 500 |

### 1.2 Justification du découpage en ressources

Nous avons identifié quatre entités du domaine et tranché lesquelles deviennent des ressources REST :

- **`devices`** — un appareil collecteur (téléphone). Devient une ressource : il a un cycle de vie propre (enregistrement, identité, clé) et doit être créé/listé.
- **`measurements`** — une mesure sonore brute horodatée. Ressource : c'est l'unité atomique persistée, créée massivement par la collecte.
- **`observations`** — une saisie environnementale (proximité, vibe). Ressource distincte des mesures car de nature différente (qualitative, manuelle, basse fréquence) et avec un schéma propre. Les regrouper avec `measurements` aurait imposé un schéma polymorphe fragile.
- **`ambiance`** — **n'est pas une entité persistée** mais une *vue dérivée*. Nous l'exposons comme ressource de lecture car elle répond à la question métier « quelle est l'ambiance de ce lieu ? », mais elle ne possède ni `POST` ni stockage : elle agrège `measurements` + `observations` à la volée.

**Alternatives envisagées.** Nous avions considéré une ressource unique `/data` polymorphe (type = audio | observation). Rejetée : validation ambiguë, filtrage plus complexe, et couplage de deux flux aux fréquences très différentes. Le découpage actuel garde chaque ressource cohérente et validable indépendamment.

**Gestion des lieux.** Choix retenu : **création implicite**. Un `location` est une simple chaîne portée par chaque mesure/observation ; il n'existe pas d'endpoint `POST /locations`. Justification : un lieu n'a pas d'attributs propres au-delà de son identifiant dans cette phase, et la création implicite simplifie la collecte (le bridge n'a pas à pré-déclarer le lieu). Compromis : pas de validation d'existence d'un lieu (une faute de frappe crée un « nouveau » lieu) — limite assumée, voir §6.

---

## 2. Conventions

| Convention | Choix | Intention / problème résolu |
|------------|-------|------------------------------|
| Nommage des ressources | Noms au **pluriel**, en minuscules (`/measurements`, `/devices`) | Prévisibilité : une collection se lit au pluriel ; `/ambiance` au singulier signale qu'il s'agit d'une vue, pas d'une collection. |
| Horodatage | **ISO 8601** (`2026-06-12T14:00:00.000-04:00`) | Format non ambigu, fuseau explicite, trié lexicographiquement = trié chronologiquement. Évite l'ambiguïté des timestamps Unix pour un lecteur humain. |
| Double horodatage | `timestamp` (mesure) + `receivedAt` (réception serveur) | Distingue le moment de la mesure du moment de réception : essentiel quand la collecte envoie en différé/batch. |
| Enveloppe de réponse | **Objet** `{ success: boolean, data | error }` | Réponse toujours auto-descriptive ; le client teste un seul champ (`success`) plutôt que de deviner d'après le code HTTP. Évite le « tableau nu » qui empêche d'ajouter des métadonnées. |
| Structure d'erreur | `{ success: false, error: string, details? }` | `error` lisible pour l'humain ; `details` porte les erreurs de validation AJV pour le débogage côté client. |
| Codes de statut | 201 création, 400 validation, 401 auth absente, 403 auth invalide, 404 introuvable, 500 interne | Sémantique HTTP standard, comportement prévisible. |

**Filtrage et consultation.** La consultation passe par les endpoints sémantiques `/ambiance/:location/*`. Le lieu est un paramètre de chemin (`:location`) ; la période est un paramètre de requête (`?last=3h`, unités `m`/`h`/`d`). Ce découpage suit la sémantique REST : le chemin identifie *quoi* (le lieu), la query affine *comment* (fenêtre temporelle).

---

## 3. Authentification

### 3.1 Mécanisme

Clé API transmise dans l'en-tête HTTP **`x-api-key`**. Seules les routes d'**écriture** (`POST /measurements`, `POST /observations`) sont protégées ; les lectures (`GET`) sont publiques, conformément à l'énoncé.

### 3.2 Flux complet

```mermaid
sequenceDiagram
  participant C as Client / Bridge
  participant S as Serveur
  participant DB as MongoDB
  C->>S: POST /devices { name, location }
  S->>DB: insert device + apiKey généré (crypto)
  S-->>C: 201 { id, apiKey }
  Note over C: stocke la clé
  C->>S: POST /measurements (x-api-key: clé)
  S->>DB: findOne({ apiKey })
  S->>S: comparaison en temps constant
  S-->>C: 201 (clé valide) | 401 (absente) | 403 (invalide)
```

1. Le client enregistre un appareil via `POST /devices` et reçoit `{ id, apiKey }`. La clé est générée avec `crypto.randomBytes(24)` (48 caractères hex).
2. À chaque écriture, le middleware lit `x-api-key`, recherche le device et **confirme la clé en temps constant** (`crypto.timingSafeEqual`) pour limiter les attaques par analyse temporelle.

### 3.3 Comportement

- En-tête **absent** → `401 { success:false, error:'Clé API manquante' }`.
- Clé **présente mais inconnue/invalide** → `403 { success:false, error:'Clé API invalide' }`.
- Clé **valide** → la requête poursuit ; `req.device` est attaché.

### 3.4 Vulnérabilité de `POST /devices` (faille volontaire)

En Phase 1, `POST /devices` n'est pas protégé : **n'importe qui peut générer des clés API valides** et donc injecter des mesures/observations frauduleuses, polluer les données d'un lieu, ou provoquer un déni de service par création massive de devices.

**Solutions proposées :**

1. **Jeton d'enregistrement (registration secret)** : exiger un en-tête `x-admin-token` comparé à un secret côté serveur (variable d'environnement) pour appeler `POST /devices`. Simple, suffisant pour un déploiement contrôlé.
2. **Provisioning administrateur** : retirer l'auto-enregistrement public ; les devices sont créés via un back-office authentifié (compte admin + mot de passe/OAuth).
3. **Atténuations complémentaires** : rate-limiting par IP sur `POST /devices`, et stockage de la clé **hachée** (ex. SHA-256) plutôt qu'en clair, afin qu'une fuite de la base ne révèle pas les clés.

Recommandation pour la Phase 2 : option 1 (jeton d'enregistrement) + stockage haché des clés.

---

## 4. Collecte

### 4.1 Chaîne capteur → serveur

```
Téléphone (Phyphox) --GET (Wi-Fi local)--> Bridge --POST /measurements (HTTP)--> Serveur --> MongoDB
```

**Approche : bridge.** Un script Node (`server/scripts/phyphox-bridge.js`) interroge l'API d'accès distant de Phyphox (`http://<IP>:<PORT>/get?dB&time`) **toutes les 5 secondes**, extrait la dernière valeur du buffer `dB` (nom exact découvert à l'expérimentation — Phyphox nomme ses buffers selon l'expérience chargée), puis effectue un `POST /measurements` authentifié par `x-api-key`. Le port est configurable via `PHYPHOX_PORT` (défaut 8080 ; notre téléphone expose le port 80).

**Pourquoi cette approche.** Phyphox expose un serveur web local mais ne peut pas pousser vers un service externe : un intermédiaire est nécessaire. Le bridge découple le capteur (réseau local) du serveur (Internet/Atlas), centralise l'authentification et le formatage, et reste trivial à relancer.

**Fréquence.** 5 s : compromis entre granularité (suffisante pour caractériser l'ambiance) et volume de données.

**Format.** Envois unitaires JSON : `{ type:'audio', value:<dB>, location, timestamp:<ISO> }`. Le serveur ajoute `receivedAt`. Pour un envoi en batch (collecte différée), la même structure serait envoyée en tableau ; nous avons gardé l'unitaire pour la simplicité en Phase 1.

### 4.2 Import de sessions déjà enregistrées

Nos sessions ont été enregistrées hors-ligne dans Phyphox puis **exportées en CSV** (dossiers `data/raw-data/<session>/`). Chaque export Phyphox contient `Amplitudes.csv` (temps relatif + niveau sonore en notation scientifique) et `meta/time.csv` (heure système réelle du START). Le script `server/scripts/import-phyphox.js` scanne `data/raw-data/`, lit `meta/time.csv` pour extraire l'heure de début automatiquement, reconstruit les timestamps absolus (`startTime + tRelatif`), **agrège par tranches de 5 s** (moyenne du niveau sonore, aligné sur la cadence du bridge) et insère dans `measurements`. Le mapping dossier → lieu est déclaré dans `data/sessions.json`. Cela permet d'utiliser des données réelles sans avoir eu le bridge actif en continu pendant la collecte.

### 4.3 Données environnementales et fallback manuel

- **Méthode retenue : mixte à dominante manuelle.** L'heure et le jour sont **dérivés automatiquement** du `timestamp` de l'observation (`hour`, `dayOfWeek`). La proximité de la source humaine et la vibe sont **saisies manuellement** par l'observateur sur place (champs `proximity`, `vibe`, `notes`).
- **Fallback manuel (obligatoire).** En cas d'échec d'une éventuelle automatisation, deux chemins de saisie manuelle restent disponibles : `POST /observations` (en direct, ex. via Postman) et le fichier `data/observations.json` importé par `npm run import:obs`. Ce dernier garantit qu'aucune donnée environnementale n'est perdue même sans connectivité au moment de la collecte.

---

## 5. Agrégation (endpoints sémantiques)

Les endpoints `/ambiance` ne stockent rien ; ils calculent un portrait à partir des données brutes. La classification du niveau sonore repose sur des seuils en décibels :

| Plage (dB) | Classification |
|------------|----------------|
| < 45 | calme |
| 45 – 60 | modéré |
| 60 – 75 | animé |
| ≥ 75 | bruyant |

- **`GET /ambiance/:location/snapshot`** — portrait *courant*. Moyenne du niveau sonore sur les **30 dernières minutes** + dernière observation environnementale connue. `404` si aucune donnée. Donne une réponse immédiate à « comment est ce lieu en ce moment ? ».
- **`GET /ambiance/:location/history?last=3h`** — *évolution*. Découpe la période demandée en **12 tranches** (minimum 5 min chacune) ; pour chaque tranche : moyenne dB, nombre d'échantillons, classification. Visualise la dynamique de l'ambiance dans le temps.
- **`GET /ambiance/:location/quiet-hours`** — *créneaux calmes typiques*. Regroupe toutes les mesures par **heure du jour** (`$hour`), calcule la moyenne, et retient les heures dont la moyenne `< 50 dB` avec **au moins 3 échantillons** (seuil de fiabilité statistique). Répond à « quand ce lieu est-il habituellement calme ? ».

Ces choix (fenêtre de 30 min, 12 tranches, seuil 50 dB / 3 échantillons) sont des paramètres de conception ajustables selon la densité des données collectées.

---

## 6. Limites et évolution

**Vulnérabilités identifiées.**
- `POST /devices` ouvert (§3.4) — solution proposée pour la Phase 2.
- Clés API stockées **en clair** en base — devraient être hachées.
- La recherche de clé est un `findOne({ apiKey })` sans index dédié (la confirmation est en temps constant, mais l'accès DB lui-même n'est pas parfaitement constant).

**Compromis assumés.**
- **Création implicite des lieux** : pratique mais aucune validation ; une faute de frappe crée un faux lieu.
- **Seuils dB non calibrés finement** : Phyphox fournit un niveau sonore approximatif (calibration naïve, pas de pondération fréquentielle) ; nos classifications sont indicatives, pas métrologiques.
- **Collecte unitaire (pas de batch)** : plus simple mais plus de requêtes ; un mode batch réduirait la charge réseau.

**Ce qui changerait avec plus de temps.**
- Hachage des clés + jeton d'enregistrement + rate-limiting.
- Endpoint de comparaison inter-lieux et tendances jour/semaine.
- Index MongoDB explicites sur `{ location, timestamp }` pour accélérer les agrégations à grande échelle.
- Tests automatisés (validation, codes de statut, agrégations).
