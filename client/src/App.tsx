import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import './App.css';

// Page d'accueil temporaire : la carte (#9) et le portrait détaillé (#10) branchent
// leurs propres routes par-dessus ce scaffold.
function Home() {
  return <p className="page">Ambiance IFT3225 — carte et portrait de lieu à venir.</p>;
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
          <Route path="*" element={<p className="page">Page introuvable.</p>} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
