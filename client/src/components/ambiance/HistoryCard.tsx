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

import { useAsync } from '../../hooks/useAsync';
import { AsyncBoundary } from '../AsyncBoundary';
import { getHistory } from '../../services/api';
import { PERIODS, formatHistoryTick, type Period } from '../../lib/historyPeriods';
import type { History } from '../../types';

export function HistoryCard({ location }: { location: string }) {
  const [period, setPeriod] = useState<Period>('3h');
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
