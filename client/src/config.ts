// Configuration centralisée du client.
// En dev, VITE_API_URL est vide : les appels partent en chemin relatif et le proxy
// Vite (voir vite.config.ts) les redirige vers l'API locale (port 3000), ce qui évite
// tout problème de CORS tant que l'endpoint dédié (#6) n'est pas livré.
// En production, définir VITE_API_URL = URL publique de l'API de la phase 1.
export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? '';

// Seuil de fraîcheur choisi par l'équipe : une mesure au-delà de 30 min n'est plus
// « récente ». Aligné sur la fenêtre du snapshot côté serveur (moyenne des 30 dernières
// minutes) : si l'API ne renvoie pas de bloc `audio`, c'est qu'aucune mesure n'est
// tombée dans cette fenêtre, donc le lieu est considéré « sans mesure récente ».
export const FRESHNESS_MINUTES = 30;
