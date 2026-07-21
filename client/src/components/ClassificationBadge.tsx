import type { Classification } from '../types';

interface Props {
  classification: Classification;
  stale?: boolean; // mesure au-delà du seuil de fraîcheur
}

// Couleur = sémantique du niveau sonore. Échelle exposée par l'API (seuils dB) ;
// ici on ne fait que mapper la classification reçue vers un rendu.
const COLORS: Record<Classification, string> = {
  calme: '#2e7d32',
  modéré: '#f9a825',
  animé: '#ef6c00',
  bruyant: '#c62828',
};

export function ClassificationBadge({ classification, stale = false }: Props) {
  return (
    <span
      className="badge"
      style={{ backgroundColor: stale ? '#9e9e9e' : COLORS[classification] }}
      title={stale ? 'Aucune mesure récente' : `Ambiance : ${classification}`}
    >
      {classification}
      {stale && ' · ancien'}
    </span>
  );
}
