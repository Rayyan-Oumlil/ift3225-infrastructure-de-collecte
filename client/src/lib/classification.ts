import type { Classification } from '../types';

// Source unique couleur <-> classification, utilisée par le badge (ClassificationBadge)
// et par les marqueurs de la carte (lib/marker.ts). Évite la dérive entre les deux
// rendus si une couleur change.
export const CLASSIFICATION_COLORS: Record<Classification, string> = {
  calme: '#2e7d32',
  modéré: '#f9a825',
  animé: '#ef6c00',
  bruyant: '#c62828',
};

export const STALE_COLOR = '#9e9e9e';

export function classificationColor(classification: Classification | null, stale = false): string {
  if (stale || !classification) return STALE_COLOR;
  return CLASSIFICATION_COLORS[classification];
}
