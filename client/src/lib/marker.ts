import L from 'leaflet';
import type { Classification } from '../types';

const COLORS: Record<Classification, string> = {
  calme: '#2e7d32',
  modéré: '#f9a825',
  animé: '#ef6c00',
  bruyant: '#c62828',
};

const STALE_COLOR = '#9e9e9e';

// Marqueur coloré selon la classification renvoyée par l'API (gris si aucune mesure
// récente). On utilise un divIcon plutôt que l'image par défaut de Leaflet : cela
// porte l'information d'ambiance ET évite le bug classique du chemin d'icône cassé
// dans les bundlers.
export function ambianceMarker(classification: Classification | null): L.DivIcon {
  const color = classification ? COLORS[classification] : STALE_COLOR;
  return L.divIcon({
    className: 'ambiance-marker',
    html: `<span style="background:${color}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11],
  });
}
