import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Garde de route réutilisable : affiche un état de chargement pendant l'hydratation
// du jeton, redirige vers /connexion si l'usager est anonyme, sinon rend les enfants.
// Extrait de la garde jusqu'ici recopiée en tête de AccountPage.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <section className="page">
        <div className="state state--loading">Chargement…</div>
      </section>
    );
  }

  if (status === 'anonymous') {
    return <Navigate to="/connexion" replace />;
  }

  return <>{children}</>;
}
