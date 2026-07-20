import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { MapPage } from './pages/MapPage';
import './App.css';

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
          <Route path="/" element={<MapPage />} />
          <Route path="*" element={<p className="page">Page introuvable.</p>} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
