import { describe, expect, it } from 'vitest';
import { errorMessage } from './types.js';

describe('outillage Vitest', () => {
  it('résout les imports TypeScript/ESM du projet (npm test fonctionne)', () => {
    expect(errorMessage(new Error('test'))).toBe('test');
  });
});
