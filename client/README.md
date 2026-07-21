# Ambiance IFT3225 — Client (Phase 2)

Application cliente React qui consomme l'API de collecte d'ambiance de la phase 1 :
carte des lieux avec leur classification sonore courante, portrait détaillé par lieu
(historique et créneaux calmes), et — à venir — soumission d'observations authentifiée.

## Prérequis

- Node.js ≥ 20
- L'**API de la phase 1** démarrée et accessible (par défaut `http://localhost:3000`).
  Voir le README à la racine du dépôt pour la lancer (`npm start`).

## Installation et lancement

```bash
cd client
npm install
cp .env.example .env   # ajuster si besoin
npm run dev            # http://localhost:5173
```

En développement, les appels API partent en chemin relatif et sont redirigés vers
l'API locale par le proxy Vite (`vite.config.ts`) — aucune configuration CORS requise.

## Configuration

| Variable | Rôle | Dév | Prod |
|----------|------|-----|------|
| `VITE_API_URL` | URL de l'API de la phase 1 | vide (proxy Vite) | URL publique de l'API |

## Scripts

| Commande | Effet |
|----------|-------|
| `npm run dev` | Serveur de développement (HMR) |
| `npm run build` | Build de production dans `dist/` |
| `npm run preview` | Sert le build de production localement |

## Structure

```
src/
├─ services/api.ts     Couche client isolée (seul point d'appel à l'API)
├─ types.ts            Types miroir du contrat de l'API
├─ config.ts           Base URL + seuil de fraîcheur
├─ hooks/useAsync.ts   États chargement / erreur / vide
├─ components/         Badge de classification, frontière d'état async
├─ lib/marker.ts       Marqueur Leaflet coloré selon la classification
└─ pages/              MapPage (carte), DetailPage (portrait d'un lieu)
```

## Actions protégées (à venir)

La connexion / inscription et la soumission d'observations seront branchées sur les
endpoints d'authentification JWT dès leur fusion sur `master` (PR backend #18/#19).
La couche `services/api.ts` expose déjà `postObservation` prête à recevoir le justificatif.
