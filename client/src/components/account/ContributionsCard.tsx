import { useAsync } from '../../hooks/useAsync';
import { AsyncBoundary } from '../AsyncBoundary';
import { getMyObservations } from '../../services/api';
import type { ObservationRecord } from '../../types';

export function ContributionsCard({ token, refreshKey }: { token: string; refreshKey: number }) {
  const state = useAsync<ObservationRecord[]>(() => getMyObservations(token), [token, refreshKey], {
    isEmpty: (d) => d.length === 0,
  });
  return (
    <div className="card">
      <h2>Mes contributions</h2>
      <AsyncBoundary state={state} emptyMessage="Aucune observation soumise pour l'instant.">
        {(observations) => (
          <ul className="contributions">
            {observations.map((o) => (
              <li key={o._id}>
                <strong>{o.location}</strong> — proximité {o.proximity}, vibe {o.vibe}
                <span className="muted"> · {new Date(o.timestamp).toLocaleString('fr-CA')}</span>
              </li>
            ))}
          </ul>
        )}
      </AsyncBoundary>
    </div>
  );
}
