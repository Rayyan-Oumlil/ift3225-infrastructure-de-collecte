import { useAsync } from '../../hooks/useAsync';
import { AsyncBoundary } from '../AsyncBoundary';
import { getMyLocations } from '../../services/api';

export function MyLocationsCard({ token, refreshKey }: { token: string; refreshKey: number }) {
  const state = useAsync<string[]>(() => getMyLocations(token), [token, refreshKey], {
    isEmpty: (d) => d.length === 0,
  });
  return (
    <div className="card">
      <h2>Mes lieux</h2>
      <p className="muted">Lieux où vous avez soumis au moins une observation.</p>
      <AsyncBoundary state={state} emptyMessage="Aucun lieu pour l'instant.">
        {(locations) => (
          <ul className="tag-list">
            {locations.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        )}
      </AsyncBoundary>
    </div>
  );
}
