import type { ReactNode } from 'react';
import type { AsyncState } from '../hooks/useAsync';

interface Props<T> {
  state: AsyncState<T>;
  children: (data: T) => ReactNode;
  emptyMessage?: string;
  loadingMessage?: string;
}

// Rend explicitement les trois états requis (#13) : chargement, erreur, vide —
// et ne délègue à `children` que sur succès avec données. Évite de dupliquer ce
// branchement dans chaque écran.
export function AsyncBoundary<T>({
  state,
  children,
  emptyMessage = 'Aucune donnée à afficher.',
  loadingMessage = 'Chargement…',
}: Props<T>) {
  if (state.status === 'loading') {
    return <div className="state state--loading">{loadingMessage}</div>;
  }
  if (state.status === 'error') {
    return (
      <div className="state state--error">
        <p>{state.error}</p>
        <button type="button" onClick={state.reload}>
          Réessayer
        </button>
      </div>
    );
  }
  if (state.status === 'empty' || state.data === null) {
    return <div className="state state--empty">{emptyMessage}</div>;
  }
  return <>{children(state.data)}</>;
}
