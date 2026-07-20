import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En développement, on proxifie les chemins de l'API de la phase 1 vers le serveur
// local (port 3000). Cela évite les erreurs CORS tant que l'endpoint dédié (#6) n'est
// pas livré : côté client les appels restent en chemin relatif (VITE_API_URL vide).
const API_TARGET = 'http://localhost:3000'
const apiPaths = ['/locations', '/ambiance', '/observations', '/devices', '/measurements', '/auth', '/me']

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: Object.fromEntries(
      apiPaths.map((path) => [path, { target: API_TARGET, changeOrigin: true }]),
    ),
  },
})
