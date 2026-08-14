import { ObjectId } from 'mongodb';
import { describe, expect, it } from 'vitest';
import { buildObservationDoc } from './observations.js';

const base = {
  location: 'cafe',
  proximity: 'medium' as const,
  vibe: 'modéré' as const,
  deviceId: null,
  authorId: null,
};

describe('buildObservationDoc', () => {
  it('dérive hour et dayOfWeek du timestamp fourni', () => {
    const doc = buildObservationDoc(
      { ...base, timestamp: '2026-01-06T14:30:00Z' },
      new Date('2026-01-07T00:00:00Z'),
    );
    expect(doc.hour).toBe(new Date('2026-01-06T14:30:00Z').getHours());
    expect(doc.dayOfWeek).toBe(new Date('2026-01-06T14:30:00Z').getDay());
  });

  it('retombe sur receivedAt si aucun timestamp n\'est fourni', () => {
    const receivedAt = new Date('2026-01-07T09:00:00Z');
    const doc = buildObservationDoc({ ...base }, receivedAt);
    expect(doc.timestamp).toEqual(receivedAt);
  });

  it('met notes à null si absent', () => {
    const doc = buildObservationDoc({ ...base }, new Date());
    expect(doc.notes).toBeNull();
  });

  it('associe deviceId ou authorId selon la source, jamais les deux à la fois', () => {
    const deviceId = new ObjectId();
    const doc = buildObservationDoc({ ...base, deviceId, authorId: null }, new Date());
    expect(doc.deviceId).toBe(deviceId);
    expect(doc.authorId).toBeNull();
  });
});
