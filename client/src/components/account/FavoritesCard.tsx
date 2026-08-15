import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { AsyncBoundary } from '../AsyncBoundary';
import { ClassificationBadge } from '../ClassificationBadge';
import { addFavorite, getQuietFavorites, removeFavorite } from '../../services/api';
import { useAmbianceStore } from '../../store/ambianceStore';
import type { Location } from '../../types';

export function FavoritesCard({ token }: { token: string }) {
  const { user, refreshUser } = useAuth();
  const getLocations = useAmbianceStore((s) => s.getLocations);
  // Même cache partagé que SubmitObservationCard : la liste de lieux n'est
  // récupérée qu'une fois toutes les 30s, pas une fois par carte.
  const locationsState = useAsync<Location[]>(getLocations, []);
  // Parmi les favoris, lesquels sont calmes maintenant (#39) — rafraîchi avec la liste de favoris.
  const quietState = useAsync<string[]>(() => getQuietFavorites(token), [token, user?.favoriteLocations.join(',')]);
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
              const isQuietNow = quietState.data?.includes(loc.name) ?? false;
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
                  {isFavorite && isQuietNow && <ClassificationBadge classification="calme" />}
                </li>
              );
            })}
          </ul>
        )}
      </AsyncBoundary>
    </div>
  );
}
