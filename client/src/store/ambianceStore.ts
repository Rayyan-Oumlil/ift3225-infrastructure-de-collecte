// Store partagé (Zustand) : point d'accès unique aux lieux et à leur ambiance.
// Sert deux rôles à la fois :
//  - état partagé : évite que plusieurs composants (carte, favoris, formulaire)
//    refassent chacun le même appel `getLocations()` ;
//  - cache à durée de vie (TTL) : une requête en cours ou récente est réutilisée
//    au lieu d'être refaite, jusqu'à expiration ou invalidation explicite.
import { create } from 'zustand';
import {
  getHistory as apiGetHistory,
  getLocations as apiGetLocations,
  getLocationsWithAmbiance as apiGetLocationsWithAmbiance,
  getQuietHours as apiGetQuietHours,
  getSnapshot as apiGetSnapshot,
} from '../services/api';
import type { History, Location, LocationAmbiance, QuietHours, Snapshot } from '../types';

interface CacheEntry<T> {
  promise: Promise<T>;
  expiresAt: number;
}

// TTL par ressource : plus la donnée est volatile (mesure sonore en direct), plus
// la durée de vie est courte. Les heures calmes agrègent plusieurs jours d'historique
// et varient peu d'une minute à l'autre.
const TTL_LOCATIONS_MS = 30_000;
const TTL_SNAPSHOT_MS = 30_000;
const TTL_HISTORY_MS = 60_000;
const TTL_QUIET_HOURS_MS = 5 * 60_000;

function isFresh<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  return !!entry && entry.expiresAt > Date.now();
}

interface AmbianceState {
  locations: CacheEntry<Location[]> | undefined;
  locationsWithAmbiance: CacheEntry<LocationAmbiance[]> | undefined;
  snapshots: Record<string, CacheEntry<Snapshot>>;
  histories: Record<string, CacheEntry<History>>;
  quietHours: Record<string, CacheEntry<QuietHours>>;

  getLocations: () => Promise<Location[]>;
  getLocationsWithAmbiance: () => Promise<LocationAmbiance[]>;
  getSnapshot: (location: string) => Promise<Snapshot>;
  getHistory: (location: string, period: string) => Promise<History>;
  getQuietHours: (location: string) => Promise<QuietHours>;

  // À appeler après une écriture (nouvelle observation) : purge tout ce qui concerne
  // ce lieu, y compris la vue agrégée de la carte.
  invalidateLocation: (location: string) => void;
  invalidateLocationsWithAmbiance: () => void;
}

export const useAmbianceStore = create<AmbianceState>((set, get) => ({
  locations: undefined,
  locationsWithAmbiance: undefined,
  snapshots: {},
  histories: {},
  quietHours: {},

  getLocations() {
    const cached = get().locations;
    if (isFresh(cached)) return cached.promise;
    const promise = apiGetLocations();
    set({ locations: { promise, expiresAt: Date.now() + TTL_LOCATIONS_MS } });
    promise.catch(() => set({ locations: undefined }));
    return promise;
  },

  getLocationsWithAmbiance() {
    const cached = get().locationsWithAmbiance;
    if (isFresh(cached)) return cached.promise;
    const promise = apiGetLocationsWithAmbiance();
    set({ locationsWithAmbiance: { promise, expiresAt: Date.now() + TTL_LOCATIONS_MS } });
    promise.catch(() => set({ locationsWithAmbiance: undefined }));
    return promise;
  },

  getSnapshot(location) {
    const cached = get().snapshots[location];
    if (isFresh(cached)) return cached.promise;
    const promise = apiGetSnapshot(location);
    set((s) => ({
      snapshots: { ...s.snapshots, [location]: { promise, expiresAt: Date.now() + TTL_SNAPSHOT_MS } },
    }));
    promise.catch(() =>
      set((s) => {
        const next = { ...s.snapshots };
        delete next[location];
        return { snapshots: next };
      }),
    );
    return promise;
  },

  getHistory(location, period) {
    const key = `${location}::${period}`;
    const cached = get().histories[key];
    if (isFresh(cached)) return cached.promise;
    const promise = apiGetHistory(location, period);
    set((s) => ({
      histories: { ...s.histories, [key]: { promise, expiresAt: Date.now() + TTL_HISTORY_MS } },
    }));
    promise.catch(() =>
      set((s) => {
        const next = { ...s.histories };
        delete next[key];
        return { histories: next };
      }),
    );
    return promise;
  },

  getQuietHours(location) {
    const cached = get().quietHours[location];
    if (isFresh(cached)) return cached.promise;
    const promise = apiGetQuietHours(location);
    set((s) => ({
      quietHours: { ...s.quietHours, [location]: { promise, expiresAt: Date.now() + TTL_QUIET_HOURS_MS } },
    }));
    promise.catch(() =>
      set((s) => {
        const next = { ...s.quietHours };
        delete next[location];
        return { quietHours: next };
      }),
    );
    return promise;
  },

  invalidateLocation(location) {
    set((s) => {
      const histories = { ...s.histories };
      for (const key of Object.keys(histories)) {
        if (key.startsWith(`${location}::`)) delete histories[key];
      }
      const snapshots = { ...s.snapshots };
      delete snapshots[location];
      const quietHours = { ...s.quietHours };
      delete quietHours[location];
      return { snapshots, histories, quietHours, locationsWithAmbiance: undefined };
    });
  },

  invalidateLocationsWithAmbiance() {
    set({ locationsWithAmbiance: undefined });
  },
}));
