// Couche client isolée : SEUL point de contact avec l'API.
// L'interface ne fait jamais de fetch directement — elle passe par ces fonctions.
// Toute la classification/interprétation vient du serveur ; ici on transporte et on type.

import { API_BASE_URL } from '../config';
import type {
  ApiEnvelope,
  History,
  Location,
  LocationAmbiance,
  Proximity,
  QuietHours,
  Snapshot,
  Classification,
} from '../types';

// Erreur applicative unifiée. `notFound` distingue le cas « vide » (404) d'une vraie panne.
export class ApiError extends Error {
  readonly status: number;
  readonly notFound: boolean;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.notFound = status === 404;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  apiKey?: string; // écritures protégées (x-api-key). JWT branché plus tard (#18).
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.apiKey) headers['x-api-key'] = opts.apiKey;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    // Panne réseau / API injoignable — pas de réponse HTTP du tout.
    throw new ApiError("Impossible de joindre l'API. Vérifiez qu'elle est démarrée.", 0);
  }

  let envelope: ApiEnvelope<T> | null = null;
  try {
    envelope = (await res.json()) as ApiEnvelope<T>;
  } catch {
    envelope = null;
  }

  if (!res.ok || !envelope?.success) {
    const message = envelope?.error ?? `Erreur ${res.status}`;
    throw new ApiError(message, res.status);
  }
  return envelope.data as T;
}

// Encode le nom de lieu pour l'insérer dans le chemin (:location).
const seg = (location: string) => encodeURIComponent(location);

// ---- Lectures publiques ----

export const getLocations = () => request<Location[]>('/locations');

export const getSnapshot = (location: string) =>
  request<Snapshot>(`/ambiance/${seg(location)}/snapshot`);

export const getHistory = (location: string, last = '3h') =>
  request<History>(`/ambiance/${seg(location)}/history?last=${encodeURIComponent(last)}`);

export const getQuietHours = (location: string) =>
  request<QuietHours>(`/ambiance/${seg(location)}/quiet-hours`);

// Portrait courant + fraîcheur de TOUS les lieux, pour la carte.
// Tant que l'API n'expose pas d'endpoint agrégé (#5), on interroge chaque lieu ;
// un 404 (aucune donnée) devient un portrait `null` plutôt qu'une erreur bloquante.
export async function getLocationsWithAmbiance(): Promise<LocationAmbiance[]> {
  const locations = await getLocations();
  return Promise.all(
    locations.map(async (location): Promise<LocationAmbiance> => {
      try {
        const snapshot = await getSnapshot(location.name);
        return { location, snapshot, fresh: snapshot.audio !== null };
      } catch (err) {
        if (err instanceof ApiError && err.notFound) {
          return { location, snapshot: null, fresh: false };
        }
        throw err;
      }
    }),
  );
}

// ---- Écriture protégée (contrat live : x-api-key). Migrera vers JWT à la fusion de #18. ----

export interface ObservationInput {
  location: string;
  proximity: Proximity;
  vibe: Classification;
  notes?: string;
  timestamp?: string;
}

export const postObservation = (input: ObservationInput, apiKey: string) =>
  request<unknown>('/observations', { method: 'POST', body: input, apiKey });
