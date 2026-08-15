import { useAsync } from '../../hooks/useAsync';
import { AsyncBoundary } from '../AsyncBoundary';
import { ClassificationBadge } from '../ClassificationBadge';
import { getSnapshot } from '../../services/api';
import type { Snapshot } from '../../types';

export function SnapshotCard({ location }: { location: string }) {
  const state = useAsync<Snapshot>(() => getSnapshot(location), [location]);
  return (
    <AsyncBoundary state={state} emptyMessage="Aucune mesure récente pour ce lieu.">
      {(snap) => (
        <div className="card">
          <h2>Portrait courant</h2>
          {snap.audio ? (
            <div className="portrait">
              <ClassificationBadge classification={snap.audio.classification} />
              <span className="metric">{snap.audio.avgDb} dB</span>
              <span className="muted">
                moyenne sur 30 min · {snap.audio.sampleCount} mesures
              </span>
            </div>
          ) : (
            <p className="muted">Pas de mesure sonore dans les 30 dernières minutes.</p>
          )}
          {snap.observation && (
            <p className="observation">
              Dernière observation : proximité <b>{snap.observation.proximity}</b>, vibe{' '}
              <b>{snap.observation.vibe}</b>
              {snap.observation.notes ? ` — « ${snap.observation.notes} »` : ''}
            </p>
          )}
        </div>
      )}
    </AsyncBoundary>
  );
}
