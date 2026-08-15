import { useParams, Link } from 'react-router-dom';
import { SnapshotCard } from '../components/ambiance/SnapshotCard';
import { HistoryCard } from '../components/ambiance/HistoryCard';
import { QuietHoursCard } from '../components/ambiance/QuietHoursCard';

export function DetailPage() {
  const { name = '' } = useParams();
  const location = decodeURIComponent(name);

  return (
    <section className="page">
      <Link to="/" className="back">
        ← Carte
      </Link>
      <h1>{location}</h1>
      <div className="cards">
        <SnapshotCard location={location} />
        <HistoryCard location={location} />
        <QuietHoursCard location={location} />
      </div>
    </section>
  );
}
