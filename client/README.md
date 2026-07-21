# Ambiance IFT3225 — Client (Phase 2)

Application cliente React qui consomme l'API de collecte d'ambiance : carte des lieux
avec leur classification sonore courante, portrait détaillé par lieu (historique et
créneaux calmes), authentification et espace compte, et soumission d'observations.

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
├─ services/api.ts       Couche client isolée (seul point d'appel à l'API)
├─ types.ts              Types miroir du contrat de l'API
├─ config.ts             Base URL + seuil de fraîcheur
├─ context/AuthContext   Jeton JWT, hydratation via GET /me, login/register/logout
├─ hooks/useAsync.ts     États chargement / erreur / vide
├─ components/           Badge de classification, frontière d'état async
├─ lib/marker.ts         Marqueur Leaflet coloré selon la classification
└─ pages/
   ├─ MapPage            Carte (lieux, marqueurs colorés)
   ├─ DetailPage          Portrait d'un lieu (badge, historique, créneaux calmes)
   ├─ LoginPage           Connexion / inscription
   └─ AccountPage         Espace compte (profil, contributions, mes lieux, favoris)
```

## Comment se connecter et tester les actions protégées

1. Aller sur `/connexion` — créer un compte (nom d'utilisateur ≥ 3 caractères, mot de
   passe ≥ 8 caractères) ou se connecter si vous en avez déjà un.
2. Une fois connecté, le justificatif (JWT) est conservé en `localStorage` et envoyé
   automatiquement (`Authorization: Bearer <token>`) sur les écritures protégées.
   La topbar reflète l'état connecté (nom d'utilisateur, lien vers `/compte`) ou
   déconnecté (lien « Se connecter »).
3. `/compte` — l'espace compte : profil, formulaire de soumission d'observation,
   récapitulatif des contributions, « mes lieux » (lieux où une observation a été
   soumise), et gestion des lieux favoris (ajout/retrait).
4. Se déconnecter efface le jeton et redirige vers l'état public.
5. Un accès direct à `/compte` sans être connecté redirige vers `/connexion`
   (route protégée côté client).

Les lectures (`/`, `/lieux/:name`) restent publiques, sans connexion requise.
