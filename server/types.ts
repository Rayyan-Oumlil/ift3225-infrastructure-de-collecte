import type { ObjectId } from 'mongodb';

export type Classification = 'calme' | 'modéré' | 'animé' | 'bruyant';
export type Proximity = 'low' | 'medium' | 'high';

export interface Device {
  _id: ObjectId;
  name: string;
  location: string;
  apiKey: string;
  createdAt: Date;
}

export interface User {
  _id: ObjectId;
  username: string;
  passwordHash: string;
  favoriteLocations: string[];
  createdAt: Date;
}

export interface Measurement {
  _id?: ObjectId;
  type: 'audio';
  value: number;
  location: string;
  deviceId: ObjectId;
  timestamp: Date;
  receivedAt: Date;
}

export interface Observation {
  _id?: ObjectId;
  location: string;
  proximity: Proximity;
  vibe: Classification;
  notes: string | null;
  hour: number;
  dayOfWeek: number;
  deviceId: ObjectId | null;
  authorId: ObjectId | null;
  timestamp: Date;
  receivedAt: Date;
  source?: string;
}

export interface LocationDoc {
  _id?: ObjectId;
  name: string;
  lat: number;
  lng: number;
  createdAt?: Date;
}

export interface ScaleEntry {
  label: Classification;
  minDb: number;
  maxDb: number | null;
}

export interface JwtPayload {
  sub: string;
  username: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      device?: Device;
      user?: User;
    }
  }
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Erreur inconnue';
}
