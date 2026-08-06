import type { ObjectId } from 'mongodb';
import type { Classification, Observation, Proximity } from '../types.js';

export interface ObservationInput {
  location: string;
  proximity: Proximity;
  vibe: Classification;
  notes?: string;
  timestamp?: string;
  deviceId: ObjectId | null;
  authorId: ObjectId | null;
}

export function buildObservationDoc(input: ObservationInput, receivedAt: Date): Omit<Observation, '_id'> {
  const ts = input.timestamp ? new Date(input.timestamp) : receivedAt;

  return {
    location: input.location,
    proximity: input.proximity,
    vibe: input.vibe,
    notes: input.notes ?? null,
    hour: ts.getHours(),
    dayOfWeek: ts.getDay(),
    deviceId: input.deviceId,
    authorId: input.authorId,
    timestamp: ts,
    receivedAt,
  };
}
