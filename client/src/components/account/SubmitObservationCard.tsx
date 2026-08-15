import { useState, type FormEvent } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { AsyncBoundary } from '../AsyncBoundary';
import { getLocations, postObservation } from '../../services/api';
import { formatApiError } from '../../lib/errors';
import type { Classification, Location, Proximity } from '../../types';

const PROXIMITIES: Proximity[] = ['low', 'medium', 'high'];
const VIBES: Classification[] = ['calme', 'modéré', 'animé', 'bruyant'];

export function SubmitObservationCard({ token, onSubmitted }: { token: string; onSubmitted: () => void }) {
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
      setError(formatApiError(err));
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
