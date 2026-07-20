// Types partagés — miroir du contrat exposé par l'API de la phase 1.
// L'interprétation (classification) est faite côté serveur ; le client ne fait qu'afficher.

export type Classification = 'calme' | 'modéré' | 'animé' | 'bruyant';
export type Proximity = 'low' | 'medium' | 'high';

// Enveloppe de réponse standard de l'API : { success, data } | { success:false, error }.
export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

export interface Location {
  _id: string;
  name: string;
  lat: number;
  lng: number;
  createdAt?: string;
}

export interface AudioPortrait {
  avgDb: number;
  sampleCount: number;
  classification: Classification;
}

export interface ObservationPortrait {
  proximity: Proximity;
  vibe: Classification;
  notes: string | null;
  recordedAt: string;
}

// GET /ambiance/:location/snapshot
export interface Snapshot {
  location: string;
  generatedAt: string;
  audio: AudioPortrait | null;
  observation: ObservationPortrait | null;
}

// GET /ambiance/:location/history
export interface HistoryBucket {
  timestamp: string;
  avgDb: number;
  sampleCount: number;
  classification: Classification;
}

export interface History {
  location: string;
  period: string;
  history: HistoryBucket[];
}

// GET /ambiance/:location/quiet-hours
export interface QuietHour {
  hour: number;
  avgDb: number;
  sampleCount: number;
}

export interface QuietHours {
  location: string;
  quietThresholdDb: number;
  quietHours: QuietHour[];
}

// Vue enrichie utilisée par la carte : un lieu + son portrait courant + sa fraîcheur.
export interface LocationAmbiance {
  location: Location;
  snapshot: Snapshot | null; // null => 404, aucune donnée pour ce lieu
  fresh: boolean; // true si une mesure existe dans la fenêtre de fraîcheur
}
