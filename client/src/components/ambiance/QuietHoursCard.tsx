import { useAsync } from '../../hooks/useAsync';
import { AsyncBoundary } from '../AsyncBoundary';
import { getQuietHours } from '../../services/api';
import type { QuietHours } from '../../types';

export function QuietHoursCard({ location }: { location: string }) {
  const state = useAsync<QuietHours>(() => getQuietHours(location), [location], {
    isEmpty: (data) => data.quietHours.length === 0,
  });
  return (
    <div className="card">
      <h2>Créneaux calmes</h2>
      <AsyncBoundary
        state={state}
        emptyMessage="Pas encore assez de mesures pour dégager des heures calmes."
      >
        {(data) => (
          <>
            <p className="muted">Heures où la moyenne reste sous {data.quietThresholdDb} dB.</p>
            <ul className="quiet-hours">
              {data.quietHours.map((q) => (
                <li key={q.hour}>
                  <span className="hour">{String(q.hour).padStart(2, '0')}h</span>
                  <span className="metric">{q.avgDb} dB</span>
                  <span className="muted">{q.sampleCount} mesures</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </AsyncBoundary>
    </div>
  );
}
