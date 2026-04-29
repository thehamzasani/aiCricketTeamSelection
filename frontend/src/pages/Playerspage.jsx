/**
 * PlayersPage.jsx
 * ---------------
 * Browse all players with filtering and sorting.
 * Updated (Task 13B) to include:
 *   - "Add New Player" button linking to /players/add
 *   - "Edit Stats" button on each player card that navigates to /players/add
 *     with the player pre-selected in Section B (via sessionStorage handoff)
 *   - Stats coverage badges: T20 / ODI / Test — green if stats exist, muted if not
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { playerAPI } from '../services/api';

// ─── Role Configuration ────────────────────────────────────────────────────
const ROLE_CONFIG = {
  batsman:     { label: 'Batsman',       color: '#10B981', bg: 'rgba(16,185,129,0.12)',  icon: '🏏' },
  bowler:      { label: 'Bowler',        color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  icon: '⚡' },
  allrounder:  { label: 'All-rounder',   color: '#6366F1', bg: 'rgba(99,102,241,0.12)',  icon: '🌟' },
  wicketkeeper:{ label: 'Wicket-keeper', color: '#EC4899', bg: 'rgba(236,72,153,0.12)',  icon: '🧤' },
};

const COUNTRY_CONFIG = {
  Pakistan: { flag: '🇵🇰', color: '#10B981' },
  India:    { flag: '🇮🇳', color: '#F59E0B' },
};

// ─── Score Meter ───────────────────────────────────────────────────────────
function ScoreMeter({ score, size = 'normal' }) {
  const pct   = Math.min(100, Math.max(0, score || 0));
  const color = pct >= 80 ? '#10B981' : pct >= 60 ? '#F59E0B' : pct >= 40 ? '#6366F1' : '#9CA3AF';
  const isSmall = size === 'small';
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isSmall ? 4 : 6 }}>
        <span style={{ fontSize: isSmall ? 10 : 11, color: '#9CA3AF', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          AI Score
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: isSmall ? 12 : 14, fontWeight: 700, color }}>
          {pct.toFixed(1)}
        </span>
      </div>
      <div style={{ height: isSmall ? 4 : 6, background: '#1E293B', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})`, borderRadius: 99, transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)' }} />
      </div>
    </div>
  );
}

// ─── Stat Pill ─────────────────────────────────────────────────────────────
function StatPill({ label, value }) {
  return (
    <div style={{ background: '#0A0F1E', border: '1px solid #1E293B', borderRadius: 10, padding: '6px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 52 }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: '#F9FAFB', lineHeight: 1 }}>{value ?? '—'}</span>
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: '#4B5563', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}

// ─── Stats Coverage Badges ─────────────────────────────────────────────────
/**
 * Shows T20 / ODI / Test badges.
 * Green = stats exist for that format. Muted gray = no stats yet.
 */
function StatsCoverageBadges({ stats }) {
  const formats = ['T20', 'ODI', 'Test'];
  const existing = new Set((stats || []).map((s) => s.format));
  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
      {formats.map((fmt) => {
        const has = existing.has(fmt);
        return (
          <span
            key={fmt}
            title={has ? `${fmt} stats available` : `No ${fmt} stats yet`}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 6,
              border: `1px solid ${has ? '#10B98166' : '#1E293B'}`,
              background: has ? 'rgba(16,185,129,0.1)' : 'transparent',
              color: has ? '#10B981' : '#4B5563',
              letterSpacing: '0.04em',
              cursor: 'default',
            }}
          >
            {fmt}
          </span>
        );
      })}
    </div>
  );
}

// ─── Stat Block (modal) ────────────────────────────────────────────────────
function StatBlock({ label, value, accent }) {
  return (
    <div style={{ background: '#0A0F1E', border: '1px solid #1E293B', borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: accent || '#F9FAFB', margin: '0 0 4px 0', lineHeight: 1 }}>{value}</p>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#4B5563', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
    </div>
  );
}

// ─── Player Card ───────────────────────────────────────────────────────────
function PlayerCard({ player, onClick, onEditStats, index }) {
  const role    = ROLE_CONFIG[player.role] || ROLE_CONFIG.batsman;
  const country = COUNTRY_CONFIG[player.country] || { flag: '🌍', color: '#9CA3AF' };
  const stats   = (player.stats || [])[0] || {};         // primary stats (first format)
  const isBowler     = player.role === 'bowler';
  const isAllrounder = player.role === 'allrounder';

  return (
    <div
      style={{
        background: '#111827',
        border: '1px solid #1E293B',
        borderRadius: 20,
        padding: '22px 20px',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        animation: 'fadeSlideUp 0.4s ease both',
        animationDelay: `${Math.min(index * 40, 400)}ms`,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = role.color + '55';
        e.currentTarget.style.transform   = 'translateY(-3px)';
        e.currentTarget.style.boxShadow   = `0 12px 40px ${role.color}18`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#1E293B';
        e.currentTarget.style.transform   = 'translateY(0)';
        e.currentTarget.style.boxShadow   = 'none';
      }}
      onClick={() => onClick(player)}
    >
      {/* Top gradient line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${role.color}66, transparent)` }} />

      {/* Avatar + Country */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ width: 46, height: 46, borderRadius: '50%', background: role.bg, border: `1.5px solid ${role.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
          {role.icon}
        </div>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, background: '#0A0F1E', border: '1px solid #1E293B', borderRadius: 8, padding: '3px 8px', color: country.color, display: 'flex', alignItems: 'center', gap: 4 }}>
          {country.flag} {player.country}
        </span>
      </div>

      {/* Name */}
      <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: '0.04em', color: '#F9FAFB', margin: '0 0 4px 0', lineHeight: 1.1 }}>
        {player.name}
      </p>

      {/* Role tag */}
      <span style={{ display: 'inline-block', fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, background: role.bg, color: role.color, borderRadius: 6, padding: '2px 8px', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {role.label}
      </span>

      {/* Stats coverage badges */}
      <div style={{ marginBottom: 12 }}>
        <StatsCoverageBadges stats={player.stats} />
      </div>

      {/* Key stats */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {(!isBowler || isAllrounder) && (
          <>
            <StatPill label="Avg"  value={stats.batting_avg  ? Number(stats.batting_avg).toFixed(1)  : null} />
            <StatPill label="SR"   value={stats.strike_rate  ? Number(stats.strike_rate).toFixed(1)  : null} />
            <StatPill label="Runs" value={stats.runs_total ?? null} />
          </>
        )}
        {(isBowler || isAllrounder) && (
          <>
            <StatPill label="Wkts" value={stats.wickets_total ?? null} />
            <StatPill label="Eco"  value={stats.bowling_economy ? Number(stats.bowling_economy).toFixed(2) : null} />
          </>
        )}
      </div>

      {/* Score meter */}
      <ScoreMeter score={player.overall_score} size="small" />

      {/* Batting / bowling style */}
      {(player.batting_style || player.bowling_style) && (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#4B5563', marginTop: 10, marginBottom: 12 }}>
          {[player.batting_style, player.bowling_style].filter(Boolean).join(' · ')}
        </p>
      )}

      {/* Edit Stats button — stops propagation so the card's onClick (modal) doesn't fire */}
      <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #1E293B' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEditStats(player);
          }}
          style={{
            width: '100%',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            fontSize: 12,
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid rgba(245,158,11,0.35)',
            background: 'rgba(245,158,11,0.06)',
            color: '#F59E0B',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.14)'; e.currentTarget.style.borderColor = '#F59E0B'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.06)'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.35)'; }}
        >
          📊 Edit Stats
        </button>
      </div>
    </div>
  );
}

// ─── Player Modal ──────────────────────────────────────────────────────────
function PlayerModal({ player, onClose, onEditStats }) {
  const overlayRef = useRef(null);
  const role    = ROLE_CONFIG[player.role] || ROLE_CONFIG.batsman;
  const country = COUNTRY_CONFIG[player.country] || { flag: '🌍', color: '#9CA3AF' };
  const stats   = (player.stats || [])[0] || {};
  const isBowler     = player.role === 'bowler';
  const isAllrounder = player.role === 'allrounder';

  useEffect(() => {
    const handleKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', animation: 'fadeIn 0.2s ease' }}
    >
      <div style={{ background: '#111827', border: `1px solid ${role.color}33`, borderRadius: 24, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', position: 'relative', animation: 'modalSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: `0 40px 80px ${role.color}18` }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${role.color}, transparent)`, borderRadius: '24px 24px 0 0' }} />

        <div style={{ padding: '28px 28px 32px' }}>
          {/* Close */}
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: 20, right: 20, background: '#1E293B', border: 'none', color: '#9CA3AF', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#374151'; e.currentTarget.style.color = '#F9FAFB'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#1E293B'; e.currentTarget.style.color = '#9CA3AF'; }}
          >✕</button>

          {/* Header */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: role.bg, border: `2px solid ${role.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
              {role.icon}
            </div>
            <div>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: '0.05em', color: '#F9FAFB', margin: 0, lineHeight: 1 }}>{player.name}</h2>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: country.color }}>{country.flag} {player.country}</span>
                <span style={{ color: '#1E293B' }}>·</span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, background: role.bg, color: role.color, padding: '2px 8px', borderRadius: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{role.label}</span>
              </div>
            </div>
          </div>

          {/* Stats coverage */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Stats Coverage</p>
            <StatsCoverageBadges stats={player.stats} />
          </div>

          {/* Score meter */}
          <div style={{ background: '#0A0F1E', border: '1px solid #1E293B', borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
            <ScoreMeter score={player.overall_score} />
          </div>

          {/* Batting */}
          {(!isBowler || isAllrounder) && (
            <div style={{ marginBottom: 18 }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>🏏 Batting Stats</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <StatBlock label="Average"     value={stats.batting_avg  ? Number(stats.batting_avg).toFixed(2)  : '—'} accent={role.color} />
                <StatBlock label="Strike Rate" value={stats.strike_rate  ? Number(stats.strike_rate).toFixed(2)  : '—'} accent={role.color} />
                <StatBlock label="Total Runs"  value={stats.runs_total   ?? '—'}                                          accent={role.color} />
                <StatBlock label="Highest"     value={stats.highest_score ?? '—'}                                          accent={role.color} />
                <StatBlock label="50s"         value={stats.fifties       ?? '—'}                                          accent={role.color} />
                <StatBlock label="100s"        value={stats.centuries     ?? '—'}                                          accent={role.color} />
              </div>
            </div>
          )}

          {/* Bowling */}
          {(isBowler || isAllrounder) && (
            <div style={{ marginBottom: 18 }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>⚡ Bowling Stats</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <StatBlock label="Wickets" value={stats.wickets_total     ?? '—'}                                                      accent="#F59E0B" />
                <StatBlock label="Economy" value={stats.bowling_economy   ? Number(stats.bowling_economy).toFixed(2)   : '—'}          accent="#F59E0B" />
                <StatBlock label="Avg"     value={stats.bowling_avg       ? Number(stats.bowling_avg).toFixed(2)       : '—'}          accent="#F59E0B" />
                <StatBlock label="SR"      value={stats.bowling_strike_rate ? Number(stats.bowling_strike_rate).toFixed(2) : '—'}      accent="#F59E0B" />
                <StatBlock label="Best"    value={stats.best_bowling      ?? '—'}                                                      accent="#F59E0B" />
              </div>
            </div>
          )}

          {/* Recent form */}
          {stats.recent_form && stats.recent_form.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>📊 Recent Form</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {stats.recent_form.map((score, i) => (
                  <div key={i} style={{ background: score >= 50 ? 'rgba(16,185,129,0.15)' : score >= 20 ? 'rgba(245,158,11,0.12)' : '#0A0F1E', border: `1px solid ${score >= 50 ? '#10B981' : score >= 20 ? '#F59E0B' : '#1E293B'}44`, borderRadius: 10, padding: '8px 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: score >= 50 ? '#10B981' : score >= 20 ? '#F59E0B' : '#9CA3AF' }}>
                    {score}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Styles */}
          <div style={{ paddingTop: 14, borderTop: '1px solid #1E293B' }}>
            {player.batting_style && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9CA3AF', margin: '0 0 4px 0' }}><span style={{ color: '#4B5563' }}>Batting: </span>{player.batting_style}</p>}
            {player.bowling_style && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9CA3AF', margin: 0 }}><span style={{ color: '#4B5563' }}>Bowling: </span>{player.bowling_style}</p>}
          </div>

          {/* Edit Stats button in modal */}
          <button
            onClick={() => { onClose(); onEditStats(player); }}
            style={{
              width: '100%',
              marginTop: 20,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: 13,
              padding: '11px 16px',
              borderRadius: 12,
              border: '1px solid rgba(245,158,11,0.4)',
              background: 'rgba(245,158,11,0.08)',
              color: '#F59E0B',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(245,158,11,0.16)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(245,158,11,0.08)')}
          >
            📊 Edit Stats for {player.name}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Card ─────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background: '#111827', border: '1px solid #1E293B', borderRadius: 20, padding: '22px 20px' }}>
      {[46, 20, 12, 8, 6].map((h, i) => (
        <div key={i} style={{ height: h, background: 'linear-gradient(90deg, #1E293B 25%, #263548 50%, #1E293B 75%)', backgroundSize: '200% 100%', borderRadius: h > 20 ? '50%' : 8, marginBottom: 12, width: i === 0 ? 46 : i === 1 ? '70%' : i === 2 ? '45%' : '100%', animation: 'shimmer 1.5s infinite' }} />
      ))}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function PlayersPage() {
  const navigate = useNavigate();
  const [players, setPlayers]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [search, setSearch]               = useState('');
  const [country, setCountry]             = useState('All');
  const [role, setRole]                   = useState('All');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [sortBy, setSortBy]               = useState('score');

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await playerAPI.getPlayers();
        setPlayers(data);
      } catch (err) {
        console.error('Failed to fetch players:', err);
        setError(err.friendlyMessage || 'Could not load players. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchPlayers();
  }, []);

  /**
   * Navigate to /players/add and hand-off the selected player so
   * Section B can auto-populate. We use sessionStorage as a lightweight
   * cross-page signal (cleared by AddPlayerPage after reading).
   */
  const handleEditStats = (player) => {
    sessionStorage.setItem('editStatsPlayer', JSON.stringify(player));
    navigate('/players/add');
  };

  const filtered = players
    .filter((p) => {
      const matchSearch  = p.name.toLowerCase().includes(search.toLowerCase());
      const matchCountry = country === 'All' || p.country === country;
      const matchRole    = role === 'All'    || p.role    === role;
      return matchSearch && matchCountry && matchRole;
    })
    .sort((a, b) => {
      if (sortBy === 'score') return (b.overall_score || 0) - (a.overall_score || 0);
      if (sortBy === 'name')  return a.name.localeCompare(b.name);
      return 0;
    });

  const countries  = ['All', 'Pakistan', 'India'];
  const roles      = ['All', 'batsman', 'bowler', 'allrounder', 'wicketkeeper'];
  const roleLabels = { All: 'All', batsman: 'Batsman', bowler: 'Bowler', allrounder: 'All-rounder', wicketkeeper: 'Wicket-keeper' };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modalSlideUp {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: #4B5563; }
        input:focus { outline: none; border-color: #10B981 !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0A0F1E; }
        ::-webkit-scrollbar-thumb { background: #1E293B; border-radius: 3px; }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0A0F1E 0%, #0D1B2A 50%, #0A1628 100%)', fontFamily: "'DM Sans', sans-serif", paddingBottom: 60 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 24px 0', animation: 'fadeSlideUp 0.5s ease' }}>

          {/* Breadcrumb */}
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#4B5563', marginBottom: 12, letterSpacing: '0.05em' }}>
            <a href="/" style={{ color: '#10B981', textDecoration: 'none' }}>Home</a> › <span style={{ color: '#9CA3AF' }}>Players</span>
          </p>

          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 36 }}>
            <div>
              <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(36px, 6vw, 56px)', letterSpacing: '0.05em', color: '#F9FAFB', lineHeight: 0.95 }}>
                PLAYER <span style={{ color: '#10B981' }}>BROWSER</span>
              </h1>
              <p style={{ color: '#9CA3AF', fontSize: 14, marginTop: 8 }}>
                {loading ? 'Loading players...' : `${filtered.length} player${filtered.length !== 1 ? 's' : ''} found`}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {/* Sort */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#4B5563' }}>Sort</span>
                {['score', 'name'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSortBy(s)}
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8, border: '1px solid', borderColor: sortBy === s ? '#10B981' : '#1E293B', background: sortBy === s ? 'rgba(16,185,129,0.12)' : 'transparent', color: sortBy === s ? '#10B981' : '#9CA3AF', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'capitalize' }}
                  >
                    {s === 'score' ? 'AI Score' : 'Name'}
                  </button>
                ))}
              </div>

              {/* ── Add New Player button (Task 13B) ── */}
              <a
                href="/players/add"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  padding: '9px 20px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#10B981',
                  color: '#fff',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'background 0.2s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#34D399')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#10B981')}
              >
                ➕ Add New Player
              </a>
            </div>
          </div>

          {/* Filter bar */}
          <div style={{ background: '#111827', border: '1px solid #1E293B', borderRadius: 20, padding: '20px 24px', marginBottom: 32, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#4B5563', pointerEvents: 'none' }}>🔍</span>
              <input
                type="text"
                placeholder="Search player..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', background: '#0A0F1E', border: '1px solid #1E293B', borderRadius: 12, padding: '10px 14px 10px 40px', color: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", fontSize: 14, transition: 'border-color 0.2s', outline: 'none', boxSizing: 'border-box' }}
                onFocus={(e)  => (e.target.style.borderColor = '#10B981')}
                onBlur={(e)   => (e.target.style.borderColor = '#1E293B')}
              />
            </div>

            {/* Country */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {countries.map((c) => (
                <button key={c} onClick={() => setCountry(c)} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, padding: '8px 16px', borderRadius: 10, border: '1px solid', borderColor: country === c ? '#10B981' : '#1E293B', background: country === c ? 'rgba(16,185,129,0.12)' : 'transparent', color: country === c ? '#10B981' : '#9CA3AF', cursor: 'pointer', transition: 'all 0.2s' }}>
                  {c === 'Pakistan' ? '🇵🇰 ' : c === 'India' ? '🇮🇳 ' : '🌍 '}{c}
                </button>
              ))}
            </div>

            <div style={{ width: 1, height: 28, background: '#1E293B', flexShrink: 0 }} />

            {/* Role */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {roles.map((r) => {
                const cfg      = ROLE_CONFIG[r];
                const isActive = role === r;
                return (
                  <button key={r} onClick={() => setRole(r)} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, padding: '8px 14px', borderRadius: 10, border: '1px solid', borderColor: isActive ? (cfg?.color || '#10B981') : '#1E293B', background: isActive ? (cfg ? cfg.bg : 'rgba(16,185,129,0.12)') : 'transparent', color: isActive ? (cfg?.color || '#10B981') : '#9CA3AF', cursor: 'pointer', transition: 'all 0.2s' }}>
                    {cfg ? `${cfg.icon} ` : ''}{roleLabels[r]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <p style={{ color: '#FCA5A5', fontFamily: "'DM Sans', sans-serif", fontSize: 14, margin: 0 }}>{error}</p>
              <button onClick={() => window.location.reload()} style={{ marginLeft: 'auto', fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.5)', background: 'transparent', color: '#EF4444', cursor: 'pointer' }}>Retry</button>
            </div>
          )}

          {/* Player grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(264px, 1fr))', gap: 16 }}>
            {loading
              ? Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)
              : filtered.length === 0
              ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '80px 20px' }}>
                  <p style={{ fontSize: 48, marginBottom: 16 }}>🏏</p>
                  <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: '0.05em', color: '#F9FAFB', marginBottom: 8 }}>No Players Found</p>
                  <p style={{ color: '#4B5563', fontSize: 14, marginBottom: 24 }}>Try adjusting your filters or add a new player.</p>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => { setSearch(''); setCountry('All'); setRole('All'); }} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, padding: '10px 24px', borderRadius: 10, border: '1px solid #1E293B', background: 'transparent', color: '#9CA3AF', cursor: 'pointer' }}>
                      Clear Filters
                    </button>
                    <a href="/players/add" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, padding: '10px 24px', borderRadius: 10, border: 'none', background: '#10B981', color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      ➕ Add Player
                    </a>
                  </div>
                </div>
              )
              : filtered.map((p, i) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  onClick={setSelectedPlayer}
                  onEditStats={handleEditStats}
                  index={i}
                />
              ))}
          </div>

          {/* Footer stats */}
          {!loading && !error && players.length > 0 && (
            <div style={{ marginTop: 40, padding: '18px 24px', background: '#111827', border: '1px solid #1E293B', borderRadius: 16, display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
              {[
                { label: 'Total Players',  value: players.length },
                { label: 'Pakistan',       value: players.filter((p) => p.country === 'Pakistan').length },
                { label: 'India',          value: players.filter((p) => p.country === 'India').length },
                { label: 'Batsmen',        value: players.filter((p) => p.role === 'batsman').length },
                { label: 'Bowlers',        value: players.filter((p) => p.role === 'bowler').length },
                { label: 'All-rounders',   value: players.filter((p) => p.role === 'allrounder').length },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: '#10B981', lineHeight: 1 }}>{value}</p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#4B5563', marginTop: 4 }}>{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          onEditStats={handleEditStats}
        />
      )}
    </>
  );
}