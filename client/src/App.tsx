import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { AccountPage } from './pages/AccountPage';
import './App.css';

// Page d'accueil temporaire : la carte (#9) branche sa propre route sur "/".
function Home() {
  return <p className="page">Ambiance IFT3225 — carte à venir (voir #9).</p>;
}

function AuthStatus() {
  const { status, user } = useAuth();
  if (status === 'loading') return null;
  if (status === 'authenticated' && user) {
    return (
      <Link to="/compte" className="auth-status">
        {user.username}
      </Link>
    );
  }
  return (
    <Link to="/connexion" className="auth-status">
      Se connecter
    </Link>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <header className="topbar">
          <Link to="/" className="brand">
            Ambiance <span>IFT3225</span>
          </Link>
          <AuthStatus />
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/connexion" element={<LoginPage />} />
            <Route path="/compte" element={<AccountPage />} />
            <Route path="*" element={<p className="page">Page introuvable.</p>} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}
