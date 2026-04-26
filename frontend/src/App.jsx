/**
 * App.jsx
 * Root application component.
 * Sets up React Router v6 with all page routes and wraps the app
 * in the SelectionContext provider.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SelectionProvider } from './context/SelectionContext';

// Layout
import Navbar  from './components/layout/Navbar';
import Footer  from './components/layout/Footer';

// Pages
import HomePage       from './pages/HomePage';
import SelectTeamPage from './pages/SelectTeamPage';
import ResultPage     from './pages/ResultPage';
import HistoryPage    from './pages/HistoryPage';
import PlayersPage    from './pages/PlayersPage';

// ── 404 Not Found ────────────────────────────────────────────────────────────
function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      {/* Large 404 heading */}
      <h1 className="font-display text-[12rem] leading-none text-[#1E293B] select-none">
        404
      </h1>
      <p className="font-display text-4xl text-emerald-400 mb-4 -mt-8">
        PITCH NOT FOUND
      </p>
      <p className="text-text-secondary mb-8 max-w-md">
        Looks like this page was stumped. Head back to the home crease and try again.
      </p>
      <a
        href="/"
        className="btn-primary"
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
      {/* Global state provider */}
      <SelectionProvider>
        {/*
          Page layout:
          - Navbar sticks to top
          - Main content fills remaining height
          - Footer at bottom
        */}
        <div className="flex flex-col min-h-screen">
          <Navbar />

          <main className="flex-1">
            <Routes>
              {/* ── Core Routes ── */}
              <Route path="/"           element={<HomePage />}       />
              <Route path="/select"     element={<SelectTeamPage />} />
              <Route path="/result/:id" element={<ResultPage />}     />
              <Route path="/history"    element={<HistoryPage />}    />
              <Route path="/players"    element={<PlayersPage />}    />

              {/* ── Redirects ── */}
              {/* Any unknown path → 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </SelectionProvider>
    </BrowserRouter>
  );
}
