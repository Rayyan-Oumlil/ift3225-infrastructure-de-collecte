import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ContributionsCard } from '../components/account/ContributionsCard';
import { MyLocationsCard } from '../components/account/MyLocationsCard';
import { FavoritesCard } from '../components/account/FavoritesCard';
import { SubmitObservationCard } from '../components/account/SubmitObservationCard';

// L'accès anonyme est déjà bloqué par <ProtectedRoute> au niveau du routeur (App.tsx),
// donc user/token sont garantis présents ici.
export function AccountPage() {
  const { user, token, logout } = useAuth();
  // Incrémenté après une soumission réussie pour forcer le rechargement des
  // contributions et "mes lieux", qui n'écoutent pas autrement ce changement.
  const [refreshKey, setRefreshKey] = useState(0);

  if (!user || !token) return null;

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
