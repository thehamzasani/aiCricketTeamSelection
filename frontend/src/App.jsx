/**
 * App.jsx
 * Root application component.
 * Sets up React Router v6 with all page routes and wraps the app
 * in the SelectionContext provider.
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SelectionProvider } from './context/SelectionContext';

// Layout
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Pages
import HomePage       from './pages/HomePage';
import SelectTeamPage from './pages/SelectTeamPage';
import ResultPage     from './pages/ResultPage';
import HistoryPage    from './pages/HistoryPage';
import PlayersPage    from './pages/PlayersPage';
import AddPlayerPage  from './pages/AddPlayerPage';

// ── 404 Not Found ─────────────────────────────────────────────────────────────
function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0A0F1E 0%, #0D1B2A 50%, #0A1628 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '0 24px',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <p
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(80px, 20vw, 160px)',
          lineHeight: 1,
          color: '#1E293B',
          userSelect: 'none',
          margin: 0,
        }}
      >
        404
      </p>
      <p
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(24px, 5vw, 40px)',
          color: '#10B981',
          marginTop: -16,
          marginBottom: 16,
          letterSpacing: '0.05em',
        }}
      >
        PITCH NOT FOUND
      </p>
      <p style={{ color: '#9CA3AF', fontSize: 15, maxWidth: 380, marginBottom: 32 }}>
        Looks like this page was stumped. Head back to the home crease and try again.
      </p>
      <a
        href="/"
        style={{
          display: 'inline-block',
          background: '#10B981',
          color: '#fff',
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 700,
          fontSize: 14,
          padding: '12px 28px',
          borderRadius: 12,
          textDecoration: 'none',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#34D399')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#10B981')}
      >
        🏏 Back to Home
      </a>
    </div>
  );
}

// ── App Component ─────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <SelectionProvider>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navbar />
          <main style={{ flex: 1 }}>
            <Routes>
              {/* ── Core Routes ── */}
              <Route path="/"              element={<HomePage />}       />
              <Route path="/select"        element={<SelectTeamPage />} />
              <Route path="/result/:id"    element={<ResultPage />}     />
              <Route path="/history"       element={<HistoryPage />}    />
              <Route path="/players"       element={<PlayersPage />}    />
              {/* ── Task 13B: Player & Stats Management ── */}
              <Route path="/players/add"   element={<AddPlayerPage />}  />
              {/* ── 404 fallback ── */}
              <Route path="*"              element={<NotFoundPage />}   />
            </Routes>
          </main>
          <Footer />
        </div>
      </SelectionProvider>
    </BrowserRouter>
  );
}