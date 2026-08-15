import { ApiError } from '../services/api';

// Factorise la conversion d'une erreur attrapée en message affichable, dupliquée
// jusqu'ici dans LoginPage et SubmitObservationCard.
export function formatApiError(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Erreur inattendue';
}
