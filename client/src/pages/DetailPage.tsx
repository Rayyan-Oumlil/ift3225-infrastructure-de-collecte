import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SnapshotCard } from '../components/ambiance/SnapshotCard';
import { HistoryCard } from '../components/ambiance/HistoryCard';
import { QuietHoursCard } from '../components/ambiance/QuietHoursCard';
import { useAmbianceStore } from '../store/ambianceStore';

export function DetailPage() {
  const { name = '' } = useParams();
  const location = decodeURIComponent(name);
  const invalidateLocation = useAmbianceStore((s) => s.invalidateLocation);
  // Incrémenté par le bouton « Actualiser » : force les cartes à ignorer le cache
  // et à refaire leur appel, en plus de la purge explicite ci-dessous.
  const [refreshKey, setRefreshKey] = useState(0);

  function refresh() {
    invalidateLocation(location);
    setRefreshKey((k) => k + 1);
  }

  return (
    <section className="page">
      <Link to="/" className="back">
        ← Carte
      </Link>
      <div className="card-head">
        <h1>{location}</h1>
        <button type="button" onClick={refresh}>
          Actualiser
        </button>
      </div>
      <div className="cards">
        <SnapshotCard location={location} refreshKey={refreshKey} />
        <HistoryCard location={location} refreshKey={refreshKey} />
        <QuietHoursCard location={location} refreshKey={refreshKey} />
      </div>
    </section>
  );
}
