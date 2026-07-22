import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { getHistory, getQuietHours, getSnapshot } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { AsyncBoundary } from '../components/AsyncBoundary';
import { ClassificationBadge } from '../components/ClassificationBadge';
import type { History, QuietHours, Snapshot } from '../types';

const PERIODS = ['1h', '3h', '12h', '1d', '7d', '30d'] as const;

const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });

function formatHistoryTick(iso: string, period: (typeof PERIODS)[number]): string {
  if (period === '7d' || period === '30d') {
    return new Date(iso).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
  }
  return hhmm(iso);
}

function SnapshotCard({ location }: { location: string }) {
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

function HistoryCard({ location }: { location: string }) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>('3h');
  const state = useAsync<History>(() => getHistory(location, period), [location, period], {
    isEmpty: (data) => data.history.length === 0,
  });

  return (
    <div className="card">
      <div className="card-head">
        <h2>Historique</h2>
        <div className="periods">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              className={p === period ? 'active' : ''}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <AsyncBoundary state={state} emptyMessage="Aucune mesure sur cette période.">
        {(data) => (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.history} margin={{ top: 8, right: 16, bottom: 8, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(v) => formatHistoryTick(String(v), period)}
                fontSize={12}
              />
              <YAxis unit=" dB" domain={['dataMin - 5', 'dataMax + 5']} fontSize={12} />
              <Tooltip
                labelFormatter={(v) => formatHistoryTick(String(v), period)}
                formatter={(value) => [`${value} dB`, 'Niveau moyen']}
              />
              <Line type="monotone" dataKey="avgDb" stroke="#1565c0" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </AsyncBoundary>
    </div>
  );
}

function QuietHoursCard({ location }: { location: string }) {
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
