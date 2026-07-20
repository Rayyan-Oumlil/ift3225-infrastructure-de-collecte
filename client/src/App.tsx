import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { DetailPage } from './pages/DetailPage';
import './App.css';

// Page d'accueil temporaire : la carte (#9) branche sa propre route sur "/".
function Home() {
  return <p className="page">Ambiance IFT3225 — carte à venir (voir #9).</p>;
}

export default function App() {
  return (
    <BrowserRouter>
      <header className="topbar">
        <Link to="/" className="brand">
          Ambiance <span>IFT3225</span>
        </Link>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lieux/:name" element={<DetailPage />} />
          <Route path="*" element={<p className="page">Page introuvable.</p>} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
