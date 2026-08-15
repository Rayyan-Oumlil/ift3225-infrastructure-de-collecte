import type { Classification } from '../types';
import { classificationColor } from '../lib/classification';

interface Props {
  classification: Classification;
  stale?: boolean; // mesure au-delà du seuil de fraîcheur
}

// Couleur = sémantique du niveau sonore. Échelle exposée par l'API (seuils dB) ;
// ici on ne fait que mapper la classification reçue vers un rendu.
export function ClassificationBadge({ classification, stale = false }: Props) {
  return (
    <span
      className="badge"
      style={{ backgroundColor: classificationColor(classification, stale) }}
      title={stale ? 'Aucune mesure récente' : `Ambiance : ${classification}`}
    >
      {classification}
      {stale && ' · ancien'}
    </span>
  );
}
