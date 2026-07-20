import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getMe, login as apiLogin, register as apiRegister } from '../services/api';
import type { MeProfile } from '../types';

const STORAGE_KEY = 'ift3225_token';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: MeProfile | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Justificatif conservé en localStorage (compromis assumé pour un projet scolaire :
// exposé en cas de XSS, mais simple et suffisant ici — voir le rapport, section auth).
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<MeProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));

  async function hydrate(currentToken: string) {
    try {
      const profile = await getMe(currentToken);
      setUser(profile);
      setStatus('authenticated');
    } catch {
      // Jeton expiré/invalide : on se déconnecte silencieusement plutôt que de planter l'UI.
      localStorage.removeItem(STORAGE_KEY);
      setToken(null);
      setUser(null);
      setStatus('anonymous');
    }
  }

  useEffect(() => {
    if (token) {
      hydrate(token);
    } else {
      setStatus('anonymous');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(newToken: string) {
    localStorage.setItem(STORAGE_KEY, newToken);
    setToken(newToken);
  }

  async function login(username: string, password: string) {
    const payload = await apiLogin(username, password);
    persist(payload.token);
    await hydrate(payload.token);
  }

  async function register(username: string, password: string) {
    const payload = await apiRegister(username, password);
    persist(payload.token);
    await hydrate(payload.token);
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
    setStatus('anonymous');
  }

  async function refreshUser() {
    if (token) await hydrate(token);
  }

  return (
    <AuthContext.Provider value={{ status, user, token, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé sous AuthProvider');
  return ctx;
}
