import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { AsyncBoundary } from '../components/AsyncBoundary';
import {
  addFavorite,
  ApiError,
  getLocations,
  getMyLocations,
  getMyObservations,
  postObservation,
  removeFavorite,
} from '../services/api';
import type { Classification, Location, ObservationRecord, Proximity } from '../types';

const PROXIMITIES: Proximity[] = ['low', 'medium', 'high'];
const VIBES: Classification[] = ['calme', 'modéré', 'animé', 'bruyant'];

function ContributionsCard({ token, refreshKey }: { token: string; refreshKey: number }) {
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

function MyLocationsCard({ token, refreshKey }: { token: string; refreshKey: number }) {
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

function FavoritesCard({ token }: { token: string }) {
  const { user, refreshUser } = useAuth();
  const locationsState = useAsync<Location[]>(getLocations, []);
  const [pending, setPending] = useState<string | null>(null);

  async function toggle(name: string, isFavorite: boolean) {
    setPending(name);
    try {
      if (isFavorite) await removeFavorite(name, token);
      else await addFavorite(name, token);
      await refreshUser();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="card">
      <h2>Lieux favoris</h2>
      <AsyncBoundary state={locationsState} emptyMessage="Aucun lieu enregistré.">
        {(locations) => (
          <ul className="tag-list">
            {locations.map((loc) => {
              const isFavorite = user?.favoriteLocations.includes(loc.name) ?? false;
              return (
                <li key={loc._id}>
                  <button
                    type="button"
                    className={isFavorite ? 'favorite active' : 'favorite'}
                    disabled={pending === loc.name}
                    onClick={() => toggle(loc.name, isFavorite)}
                  >
                    {isFavorite ? '★' : '☆'} {loc.name}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </AsyncBoundary>
    </div>
  );
}

function SubmitObservationCard({ token, onSubmitted }: { token: string; onSubmitted: () => void }) {
  const locationsState = useAsync<Location[]>(getLocations, []);
  const [location, setLocation] = useState('');
  const [proximity, setProximity] = useState<Proximity>('medium');
  const [vibe, setVibe] = useState<Classification>('modéré');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await postObservation({ location, proximity, vibe, notes: notes || undefined }, token);
      setSuccess(true);
      setNotes('');
      onSubmitted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <h2>Soumettre une observation</h2>
      <AsyncBoundary state={locationsState} emptyMessage="Aucun lieu disponible pour le moment.">
        {(locations) => (
          <form className="observation-form" onSubmit={handleSubmit}>
            <label>
              Lieu
              <select value={location} onChange={(e) => setLocation(e.target.value)} required>
                <option value="" disabled>
                  Choisir un lieu
                </option>
                {locations.map((loc) => (
                  <option key={loc._id} value={loc.name}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Proximité de la source sonore
              <select value={proximity} onChange={(e) => setProximity(e.target.value as Proximity)}>
                {PROXIMITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Vibe
              <select value={vibe} onChange={(e) => setVibe(e.target.value as Classification)}>
                {VIBES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Notes (optionnel)
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </label>

            {error && <p className="form-error">{error}</p>}
            {success && <p className="form-success">Observation enregistrée.</p>}

            <button type="submit" disabled={submitting || !location}>
              {submitting ? 'Envoi…' : 'Envoyer'}
            </button>
          </form>
        )}
      </AsyncBoundary>
    </div>
  );
}

export function AccountPage() {
  const { status, user, token, logout } = useAuth();
  // Incrémenté après une soumission réussie pour forcer le rechargement des
  // contributions et "mes lieux", qui n'écoutent pas autrement ce changement.
  const [refreshKey, setRefreshKey] = useState(0);

  if (status === 'loading') {
    return (
      <section className="page">
        <div className="state state--loading">Chargement…</div>
      </section>
    );
  }
  if (status === 'anonymous' || !user || !token) {
    return <Navigate to="/connexion" replace />;
  }

  return (
    <section className="page">
      <div className="account-head">
        <div>
          <h1>{user.username}</h1>
          <p className="muted">
            Membre depuis le {new Date(user.createdAt).toLocaleDateString('fr-CA')}
          </p>
        </div>
        <button type="button" onClick={logout}>
          Déconnexion
        </button>
      </div>

      <div className="cards">
        <SubmitObservationCard token={token} onSubmitted={() => setRefreshKey((k) => k + 1)} />
        <ContributionsCard token={token} refreshKey={refreshKey} />
        <MyLocationsCard token={token} refreshKey={refreshKey} />
        <FavoritesCard token={token} />
      </div>
    </section>
  );
}
