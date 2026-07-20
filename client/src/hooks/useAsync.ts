import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api';

export type AsyncStatus = 'loading' | 'error' | 'empty' | 'success';

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: string | null;
  notFound: boolean;
  reload: () => void;
}

interface Options<T> {
  // Décide si un résultat « réussi » est en réalité vide (ex. tableau vide).
  isEmpty?: (data: T) => boolean;
}

// Exécute une promesse et expose un état explicite : loading | error | empty | success.
// Centralise le traitement des trois états exigés (#13) pour tout l'écran.
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[], options: Options<T> = {}): AsyncState<T> {
  const [status, setStatus] = useState<AsyncStatus>('loading');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);
    setNotFound(false);

    fn()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setStatus(options.isEmpty?.(result) ? 'empty' : 'success');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const is404 = err instanceof ApiError && err.notFound;
        setNotFound(is404);
        // Un 404 signifie « pas de données » : on le traite comme état vide, pas comme panne.
        if (is404) {
          setStatus('empty');
        } else {
          setError(err instanceof Error ? err.message : 'Erreur inattendue');
          setStatus('error');
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { status, data, error, notFound, reload };
}
