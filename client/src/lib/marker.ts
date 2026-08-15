import L from 'leaflet';
import type { Classification } from '../types';
import { classificationColor } from './classification';

// Marqueur coloré selon la classification renvoyée par l'API (gris si aucune mesure
// récente). On utilise un divIcon plutôt que l'image par défaut de Leaflet : cela
// porte l'information d'ambiance ET évite le bug classique du chemin d'icône cassé
// dans les bundlers.
export function ambianceMarker(classification: Classification | null): L.DivIcon {
  const color = classificationColor(classification);
  return L.divIcon({
    className: 'ambiance-marker',
    html: `<span style="background:${color}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11],
  });
}
