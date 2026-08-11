import { ObjectId } from 'mongodb';
import { describe, expect, it } from 'vitest';
import type { Measurement, Observation } from '../types.js';
import { buildHistory, buildSnapshot, classifyDb, computeQuietHours, getScale, parseDuration } from './ambiance.js';

function measurement(value: number, timestamp: Date): Measurement {
  return { type: 'audio', value, location: 'cafe', deviceId: new ObjectId(), timestamp, receivedAt: timestamp };
}

function observation(overrides: Partial<Observation> = {}): Observation {
  return {
    location: 'cafe',
    proximity: 'medium',
    vibe: 'modéré',
    notes: null,
    hour: 10,
    dayOfWeek: 2,
    deviceId: null,
    authorId: null,
    timestamp: new Date('2026-01-01T10:00:00Z'),
    receivedAt: new Date('2026-01-01T10:00:00Z'),
    ...overrides,
  };
}

describe('parseDuration', () => {
  it('retourne 3h par défaut si aucune chaîne fournie', () => {
    expect(parseDuration(undefined)).toBe(3 * 3600000);
  });

  it('parse les minutes, heures et jours', () => {
    expect(parseDuration('30m')).toBe(30 * 60000);
    expect(parseDuration('2h')).toBe(2 * 3600000);
    expect(parseDuration('1d')).toBe(86400000);
  });

  it('retourne 3h par défaut sur une chaîne invalide', () => {
    expect(parseDuration('abc')).toBe(3 * 3600000);
  });
});

describe('classifyDb', () => {
  it('classe en dessous de 45 comme calme', () => {
    expect(classifyDb(30)).toBe('calme');
  });

  it('classe entre 45 et 60 comme modéré', () => {
    expect(classifyDb(50)).toBe('modéré');
  });

  it('classe entre 60 et 75 comme animé', () => {
    expect(classifyDb(65)).toBe('animé');
  });

  it('classe 75 et plus comme bruyant', () => {
    expect(classifyDb(80)).toBe('bruyant');
  });
});

describe('getScale', () => {
  it('retourne les 4 paliers dans l\'ordre', () => {
    expect(getScale().map((s) => s.label)).toEqual(['calme', 'modéré', 'animé', 'bruyant']);
  });
});

describe('buildSnapshot', () => {
  it('retourne null sans mesure ni observation', () => {
    expect(buildSnapshot('cafe', [], null)).toBeNull();
  });

  it('calcule la moyenne et la classification à partir des mesures', () => {
    const now = new Date();
    const snapshot = buildSnapshot('cafe', [measurement(40, now), measurement(50, now)], null);
    expect(snapshot?.audio).toEqual({ avgDb: 45, sampleCount: 2, classification: 'modéré' });
    expect(snapshot?.observation).toBeNull();
  });

  it('inclut la dernière observation même sans mesure récente', () => {
    const snapshot = buildSnapshot('cafe', [], observation({ vibe: 'animé' }));
    expect(snapshot?.audio).toBeNull();
    expect(snapshot?.observation?.vibe).toBe('animé');
  });
});

describe('buildHistory', () => {
  it('regroupe les mesures par intervalle et calcule une moyenne par intervalle', () => {
    const base = new Date('2026-01-01T00:00:00Z').getTime();
    const measurements = [
      measurement(40, new Date(base)),
      measurement(60, new Date(base + 60000)),
    ];
    const history = buildHistory(measurements, 3600000);
    expect(history).toHaveLength(1);
    expect(history[0].avgDb).toBe(50);
    expect(history[0].sampleCount).toBe(2);
  });

  it('retourne un tableau vide sans mesure', () => {
    expect(buildHistory([], 3600000)).toEqual([]);
  });
});

describe('computeQuietHours', () => {
  it('garde les heures sous le seuil avec assez d\'échantillons', () => {
    const result = computeQuietHours([{ _id: 3, avgDb: 40, sampleCount: 5 }]);
    expect(result).toEqual([{ hour: 3, avgDb: 40, sampleCount: 5 }]);
  });

  it('exclut les heures au-dessus du seuil', () => {
    expect(computeQuietHours([{ _id: 14, avgDb: 70, sampleCount: 5 }])).toEqual([]);
  });

  it('exclut les heures sous le seuil mais sans assez d\'échantillons', () => {
    expect(computeQuietHours([{ _id: 3, avgDb: 40, sampleCount: 1 }])).toEqual([]);
  });
});
