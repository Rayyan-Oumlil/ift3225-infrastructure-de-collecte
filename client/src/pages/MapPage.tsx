import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';

import { useAsync } from '../hooks/useAsync';
import { AsyncBoundary } from '../components/AsyncBoundary';
import { ClassificationBadge } from '../components/ClassificationBadge';
import { ambianceMarker } from '../lib/marker';
import { CLASSIFICATION_COLORS, STALE_COLOR } from '../lib/classification';
import { useAmbianceStore } from '../store/ambianceStore';
import type { LocationAmbiance } from '../types';

// Légende des couleurs de la carte — dérivée de la même source que les marqueurs
// et le badge (lib/classification.ts), pour ne jamais désynchroniser les deux.
function MapLegend() {
  return (
    <div className="map-legend">
      {Object.entries(CLASSIFICATION_COLORS).map(([label, color]) => (
        <span key={label} className="map-legend__item">
          <span className="map-legend__dot" style={{ backgroundColor: color }} />
          {label}
        </span>
      ))}
      <span className="map-legend__item">
        <span className="map-legend__dot" style={{ backgroundColor: STALE_COLOR }} />
        pas de mesure récente
      </span>
    </div>
  );
}

// Centre par défaut : Montréal, si aucun lieu n'est encore positionné.
const MONTREAL: [number, number] = [45.5019, -73.5674];

function centerOf(items: LocationAmbiance[]): [number, number] {
  if (items.length === 0) return MONTREAL;
  const lat = items.reduce((s, i) => s + i.location.lat, 0) / items.length;
  const lng = items.reduce((s, i) => s + i.location.lng, 0) / items.length;
  return [lat, lng];
}

export function MapPage() {
  const getLocationsWithAmbiance = useAmbianceStore((s) => s.getLocationsWithAmbiance);
  const invalidateLocationsWithAmbiance = useAmbianceStore((s) => s.invalidateLocationsWithAmbiance);
  const state = useAsync<LocationAmbiance[]>(getLocationsWithAmbiance, [], {
    isEmpty: (data) => data.length === 0,
  });

  function refresh() {
    invalidateLocationsWithAmbiance();
    state.reload();
  }

  return (
    <section className="page">
      <div className="card-head">
        <h1>Carte des ambiances</h1>
        <button type="button" onClick={refresh} disabled={state.status === 'loading'}>
          Actualiser
        </button>
      </div>
      <p className="subtitle">
        Chaque marqueur porte la classification courante du lieu. Les marqueurs gris
        n'ont pas de mesure dans les 30 dernières minutes.
      </p>

      <AsyncBoundary
        state={state}
        loadingMessage="Chargement de la carte…"
        emptyMessage="Aucun lieu enregistré pour le moment."
      >
        {(items) => (
          <>
            <div className="map-toolbar">
              <span className="muted">
                {items.length} lieu{items.length > 1 ? 'x' : ''} enregistré{items.length > 1 ? 's' : ''}
              </span>
              <MapLegend />
            </div>
            <MapContainer center={centerOf(items)} zoom={13} className="map">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {items.map(({ location, snapshot, fresh }) => {
              const classification = snapshot?.audio?.classification ?? null;
              return (
                <Marker
                  key={location._id}
                  position={[location.lat, location.lng]}
                  icon={ambianceMarker(fresh ? classification : null)}
                >
                  <Popup>
                    <strong>{location.name}</strong>
                    <div className="popup-badge">
                      {classification ? (
                        <ClassificationBadge classification={classification} stale={!fresh} />
                      ) : (
                        <span className="muted">Aucune donnée</span>
                      )}
                    </div>
                    <Link to={`/lieux/${encodeURIComponent(location.name)}`}>
                      Voir le portrait →
                    </Link>
                  </Popup>
                </Marker>
              );
            })}
            </MapContainer>
          </>
        )}
      </AsyncBoundary>
    </section>
  );
}
