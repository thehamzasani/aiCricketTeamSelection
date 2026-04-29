/**
 * AddPlayerPage.jsx
 * -----------------
 * Two-section page for managing players and their stats manually.
 *
 * Section A — Add New Player
 *   Collects: name, country, role, batting style, bowling style, squad assignment.
 *   On submit → POST /api/players then POST /api/players/{id}/assign-squad
 *   On success → auto-populates Section B with the new player selected.
 *
 * Section B — Add / Edit Stats
 *   Collects: all batting + bowling stat fields per format (T20 / ODI / Test).
 *   Includes a live Scoring Preview panel that calculates the algorithm score
 *   in real time using the exact formula from the project spec.
 *   On submit → POST /api/players/{id}/stats
 *
 * Design: dark cricket dashboard theme — exact design system from project instructions.
 */

import { useState, useEffect, useCallback } from 'react';
import { playerAPI } from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES = ['batsman', 'bowler', 'allrounder', 'wicketkeeper'];
const ROLE_LABELS = {
  batsman: '🏏 Batsman',
  bowler: '⚡ Bowler',
  allrounder: '🌟 All-rounder',
  wicketkeeper: '🧤 Wicket-keeper',
};
const BATTING_STYLES = ['right-hand', 'left-hand'];
const BOWLING_STYLES = [
  'right-arm fast',
  'right-arm medium',
  'right-arm off-spin',
  'left-arm fast',
  'left-arm medium',
  'left-arm spin',
  'leg spin',
  'n/a',
];
const SQUADS = ['None', 'Pakistan', 'India'];
const FORMATS = ['T20', 'ODI', 'Test'];
const ROLE_COLORS = {
  batsman: '#10B981',
  bowler: '#F59E0B',
  allrounder: '#6366F1',
  wicketkeeper: '#EC4899',
};

// ─── Scoring Algorithm (mirrors scoring_service.py exactly) ───────────────────

function calculatePreviewScore(role, bowlingStyle, battingStyle, stats, format, pitchType) {
  let score = 0;
  const breakdown = {};

  // Batting
  const avg = parseFloat(stats.batting_avg) || 0;
  const sr = parseFloat(stats.strike_rate) || 0;
  let avgPoints = 0;
  let srPoints = 0;
  if (avg > 0) avgPoints = Math.min(avg * 0.5, 20);
  if (sr > 0) {
    if (format === 'T20') srPoints = Math.min(Math.max((sr - 100) * 0.15, 0), 15);
    if (format === 'ODI') srPoints = Math.min(Math.max((sr - 70) * 0.10, 0), 10);
  }
  breakdown.batting_avg_points = parseFloat(avgPoints.toFixed(2));
  breakdown.strike_rate_points = parseFloat(srPoints.toFixed(2));
  score += avgPoints + srPoints;

  // Bowling
  const wkts = parseFloat(stats.wickets_total) || 0;
  const eco = parseFloat(stats.bowling_economy) || 0;
  let wktsPoints = 0;
  let ecoPoints = 0;
  if (wkts > 0) wktsPoints = Math.min(wkts * 0.1, 10);
  if (eco > 0) ecoPoints = Math.min(Math.max((10 - eco) * 2, 0), 15);
  breakdown.wickets_points = parseFloat(wktsPoints.toFixed(2));
  breakdown.economy_points = parseFloat(ecoPoints.toFixed(2));
  score += wktsPoints + ecoPoints;

  // Recent form
  const recentForm = (stats.recent_form || []).filter((v) => v !== '' && v !== null).map(Number);
  const recentWkts = (stats.recent_wickets || []).filter((v) => v !== '' && v !== null).map(Number);
  const FORM_WEIGHTS = [0.35, 0.25, 0.20, 0.12, 0.08];
  let formData = [];
  if (role === 'batsman' || role === 'wicketkeeper') {
    formData = [...recentForm, ...recentWkts.map((w) => w * 10)].slice(0, 5);
  } else if (role === 'bowler') {
    formData = [...recentWkts.map((w) => w * 10), ...recentForm].slice(0, 5);
  } else {
    const interleaved = [];
    const maxLen = Math.max(recentForm.length, recentWkts.length);
    for (let i = 0; i < maxLen; i++) {
      if (recentForm[i] !== undefined) interleaved.push(recentForm[i]);
      if (recentWkts[i] !== undefined) interleaved.push(recentWkts[i] * 10);
    }
    formData = interleaved.slice(0, 5);
  }
  let formPoints = 0;
  if (formData.length > 0) {
    const w = FORM_WEIGHTS.slice(0, formData.length);
    const ws = w.reduce((a, b) => a + b, 0);
    const normW = w.map((x) => x / ws);
    const formScore = formData.reduce((acc, r, i) => acc + r * normW[i], 0);
    formPoints = Math.min(formScore / 10, 20);
  }
  breakdown.recent_form_points = parseFloat(formPoints.toFixed(2));
  score += formPoints;

  // Condition bonus
  const pitch = (pitchType || 'balanced').toLowerCase();
  const bowlingStyleLower = (bowlingStyle || '').toLowerCase();
  const battingStyleLower = (battingStyle || '').toLowerCase();
  let conditionBonus = 0;
  if (pitch === 'spin') {
    if (bowlingStyleLower.includes('spin')) conditionBonus = 15;
    else if (battingStyleLower.includes('left')) conditionBonus = 5;
  } else if (pitch === 'pace') {
    if (bowlingStyleLower.includes('fast') || (role === 'bowler' && !bowlingStyleLower.includes('spin'))) conditionBonus = 15;
    else if (role === 'batsman') conditionBonus = 3;
  } else if (pitch === 'flat') {
    if (role === 'batsman') conditionBonus = 8;
    else if (role === 'wicketkeeper') conditionBonus = 5;
  } else {
    conditionBonus = role === 'allrounder' ? 8 : 4;
  }
  breakdown.condition_bonus = conditionBonus;
  score += conditionBonus;

  // Format bonus
  let formatBonus = 0;
  if (format === 'T20' && role === 'allrounder') formatBonus = 5;
  else if (format === 'T20' && role === 'wicketkeeper') formatBonus = 3;
  else if (format === 'ODI' && (role === 'allrounder' || role === 'wicketkeeper')) formatBonus = 3;
  else if (format === 'Test' && role === 'batsman') formatBonus = 5;
  else if (format === 'Test' && role === 'bowler') formatBonus = 3;
  breakdown.format_bonus = formatBonus;
  score += formatBonus;

  return { total: Math.min(parseFloat(score.toFixed(2)), 100), breakdown };
}

// ─── Reusable UI atoms ────────────────────────────────────────────────────────

const inputStyle = {
  width: '100%',
  background: '#0A0F1E',
  border: '1px solid #1E293B',
  borderRadius: 10,
  padding: '10px 14px',
  color: '#F9FAFB',
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 12,
  fontWeight: 600,
  color: '#9CA3AF',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const cardStyle = {
  background: '#111827',
  border: '1px solid #1E293B',
  borderRadius: 20,
  padding: '28px 28px',
};

function FieldGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function SelectInput({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' }}
      onFocus={(e) => (e.target.style.borderColor = '#10B981')}
      onBlur={(e) => (e.target.style.borderColor = '#1E293B')}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
          {typeof opt === 'string' ? opt : opt.label}
        </option>
      ))}
    </select>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text', min, max, step }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      style={inputStyle}
      onFocus={(e) => (e.target.style.borderColor = '#10B981')}
      onBlur={(e) => (e.target.style.borderColor = '#1E293B')}
    />
  );
}

function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const isSuccess = type === 'success';
  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        zIndex: 9999,
        background: isSuccess ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
        border: `1px solid ${isSuccess ? '#10B981' : '#EF4444'}44`,
        borderRadius: 14,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        maxWidth: 380,
        animation: 'toastSlide 0.3s ease',
        boxShadow: `0 8px 32px ${isSuccess ? '#10B98144' : '#EF444444'}`,
      }}
    >
      <span style={{ fontSize: 18 }}>{isSuccess ? '✅' : '❌'}</span>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: isSuccess ? '#34D399' : '#FCA5A5', margin: 0, flex: 1 }}>
        {message}
      </p>
      <button
        onClick={onDismiss}
        style={{ background: 'none', border: 'none', color: '#4B5563', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}
      >
        ✕
      </button>
    </div>
  );
}

// ─── Score Meter ──────────────────────────────────────────────────────────────

function ScoreMeter({ score }) {
  const pct = Math.min(100, Math.max(0, score || 0));
  const color = pct >= 75 ? '#10B981' : pct >= 55 ? '#F59E0B' : pct >= 35 ? '#6366F1' : '#9CA3AF';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          AI Score
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color }}>
          {pct.toFixed(1)}
        </span>
      </div>
      <div style={{ height: 8, background: '#1E293B', borderRadius: 99, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            borderRadius: 99,
            transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        />
      </div>
    </div>
  );
}

// ─── Section A — Add New Player ───────────────────────────────────────────────

function AddPlayerSection({ onPlayerCreated }) {
  const [form, setForm] = useState({
    name: '',
    country: '',
    customCountry: '',
    role: '',
    batting_style: '',
    bowling_style: '',
    squad: 'None',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    const country = form.country === 'Other' ? form.customCountry.trim() : form.country;
    if (!country) e.country = 'Country is required.';
    if (!form.role) e.role = 'Role is required.';
    if (!form.batting_style) e.batting_style = 'Batting style is required.';
    if (!form.bowling_style) e.bowling_style = 'Bowling style is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const country = form.country === 'Other' ? form.customCountry.trim() : form.country;
      const newPlayer = await playerAPI.createPlayer({
        name: form.name.trim(),
        country,
        role: form.role,
        batting_style: form.batting_style,
        bowling_style: form.bowling_style,
      });

      if (form.squad !== 'None') {
        await playerAPI.assignToSquad(newPlayer.id, form.squad, 'all_format');
      }

      onPlayerCreated(newPlayer, `✅ ${newPlayer.name} added successfully!`);
      setForm({ name: '', country: '', customCountry: '', role: '', batting_style: '', bowling_style: '', squad: 'None' });
      setErrors({});
    } catch (err) {
      onPlayerCreated(null, err.friendlyMessage || 'Failed to add player.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (key) =>
    errors[key] ? (
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#EF4444', marginTop: 4 }}>
        {errors[key]}
      </p>
    ) : null;

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            ➕
          </div>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: '0.05em', color: '#F9FAFB', margin: 0 }}>
            ADD NEW PLAYER
          </h2>
        </div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#4B5563', margin: 0 }}>
          Create a player profile then add their stats in Section B below.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0 24px' }}>

        {/* Name */}
        <FieldGroup label="Player Name *">
          <TextInput value={form.name} onChange={set('name')} placeholder="e.g. Babar Azam" />
          {fieldError('name')}
        </FieldGroup>

        {/* Country */}
        <FieldGroup label="Country *">
          <SelectInput
            value={form.country}
            onChange={set('country')}
            placeholder="Select country..."
            options={['Pakistan', 'India', 'Other']}
          />
          {fieldError('country')}
        </FieldGroup>

        {/* Custom country — only shown when Other is selected */}
        {form.country === 'Other' && (
          <FieldGroup label="Specify Country *">
            <TextInput value={form.customCountry} onChange={set('customCountry')} placeholder="e.g. Australia" />
            {fieldError('country')}
          </FieldGroup>
        )}

        {/* Role */}
        <FieldGroup label="Role *">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ROLES.map((r) => {
              const isSelected = form.role === r;
              const color = ROLE_COLORS[r];
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => set('role')(r)}
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '9px 10px',
                    borderRadius: 10,
                    border: `1px solid ${isSelected ? color : '#1E293B'}`,
                    background: isSelected ? `${color}18` : 'transparent',
                    color: isSelected ? color : '#9CA3AF',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                  }}
                >
                  {ROLE_LABELS[r]}
                </button>
              );
            })}
          </div>
          {fieldError('role')}
        </FieldGroup>

        {/* Batting Style */}
        <FieldGroup label="Batting Style *">
          <div style={{ display: 'flex', gap: 8 }}>
            {BATTING_STYLES.map((s) => {
              const isSelected = form.batting_style === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('batting_style')(s)}
                  style={{
                    flex: 1,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    padding: '10px 8px',
                    borderRadius: 10,
                    border: `1px solid ${isSelected ? '#10B981' : '#1E293B'}`,
                    background: isSelected ? 'rgba(16,185,129,0.12)' : 'transparent',
                    color: isSelected ? '#10B981' : '#9CA3AF',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textTransform: 'capitalize',
                  }}
                >
                  🏏 {s}
                </button>
              );
            })}
          </div>
          {fieldError('batting_style')}
        </FieldGroup>

        {/* Bowling Style */}
        <FieldGroup label="Bowling Style *">
          <SelectInput
            value={form.bowling_style}
            onChange={set('bowling_style')}
            placeholder="Select bowling style..."
            options={BOWLING_STYLES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
          />
          {fieldError('bowling_style')}
        </FieldGroup>

        {/* Squad */}
        <FieldGroup label="Assign to Squad">
          <div style={{ display: 'flex', gap: 8 }}>
            {SQUADS.map((s) => {
              const isSelected = form.squad === s;
              const flag = s === 'Pakistan' ? '🇵🇰 ' : s === 'India' ? '🇮🇳 ' : '';
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('squad')(s)}
                  style={{
                    flex: 1,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '10px 6px',
                    borderRadius: 10,
                    border: `1px solid ${isSelected ? '#10B981' : '#1E293B'}`,
                    background: isSelected ? 'rgba(16,185,129,0.12)' : 'transparent',
                    color: isSelected ? '#10B981' : '#9CA3AF',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {flag}{s}
                </button>
              );
            })}
          </div>
        </FieldGroup>
      </div>

      {/* Submit */}
      <div style={{ marginTop: 8, paddingTop: 20, borderTop: '1px solid #1E293B' }}>
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: 14,
            padding: '13px 32px',
            borderRadius: 12,
            border: 'none',
            background: loading ? '#065F46' : '#10B981',
            color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
          onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#34D399')}
          onMouseLeave={(e) => !loading && (e.currentTarget.style.background = '#10B981')}
        >
          {loading ? (
            <>
              <span style={{ width: 16, height: 16, border: '2px solid #fff4', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
              Adding Player...
            </>
          ) : (
            '➕ Add Player'
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Section B — Stats Entry ──────────────────────────────────────────────────

const EMPTY_STATS = {
  matches: '',
  batting_avg: '',
  strike_rate: '',
  runs_total: '',
  highest_score: '',
  centuries: '',
  fifties: '',
  bowling_avg: '',
  bowling_economy: '',
  bowling_strike_rate: '',
  wickets_total: '',
  best_bowling: '',
  recent_form: ['', '', '', '', ''],
  recent_wickets: ['', '', '', '', ''],
};

const PITCH_TYPES = ['spin', 'pace', 'flat', 'balanced'];

function StatsSection({ prefillPlayer, allPlayers }) {
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [format, setFormat] = useState('T20');
  const [pitchType, setPitchType] = useState('balanced');
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // When parent sends a freshly created player → auto-select them
  useEffect(() => {
    if (prefillPlayer) {
      setSelectedPlayerId(String(prefillPlayer.id));
      setSelectedPlayer(prefillPlayer);
      setStats(EMPTY_STATS);
    }
  }, [prefillPlayer]);

  // When dropdown changes → find player object
  useEffect(() => {
    if (!selectedPlayerId) {
      setSelectedPlayer(null);
      return;
    }
    const p = allPlayers.find((pl) => String(pl.id) === selectedPlayerId);
    setSelectedPlayer(p || null);
  }, [selectedPlayerId, allPlayers]);

  const setStat = (key) => (val) =>
    setStats((s) => ({ ...s, [key]: val }));

  const setRecentItem = (listKey, idx) => (val) =>
    setStats((s) => {
      const arr = [...s[listKey]];
      arr[idx] = val;
      return { ...s, [listKey]: arr };
    });

  // Live score preview
  const preview = selectedPlayer
    ? calculatePreviewScore(
        selectedPlayer.role,
        selectedPlayer.bowling_style,
        selectedPlayer.batting_style,
        stats,
        format,
        pitchType,
      )
    : null;

  const validate = () => {
    const e = {};
    if (!selectedPlayerId) e.player = 'Please select a player.';
    const ba = parseFloat(stats.batting_avg);
    if (stats.batting_avg !== '' && (ba < 0 || ba > 100)) e.batting_avg = '0–100';
    const sr = parseFloat(stats.strike_rate);
    if (stats.strike_rate !== '' && (sr < 0 || sr > 300)) e.strike_rate = '0–300';
    const eco = parseFloat(stats.bowling_economy);
    if (stats.bowling_economy !== '' && (eco < 0 || eco > 15)) e.bowling_economy = '0–15';
    setValidationErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        format,
        matches: stats.matches !== '' ? parseInt(stats.matches) : undefined,
        batting_avg: stats.batting_avg !== '' ? parseFloat(stats.batting_avg) : undefined,
        strike_rate: stats.strike_rate !== '' ? parseFloat(stats.strike_rate) : undefined,
        runs_total: stats.runs_total !== '' ? parseInt(stats.runs_total) : undefined,
        highest_score: stats.highest_score !== '' ? parseInt(stats.highest_score) : undefined,
        centuries: stats.centuries !== '' ? parseInt(stats.centuries) : undefined,
        fifties: stats.fifties !== '' ? parseInt(stats.fifties) : undefined,
        bowling_avg: stats.bowling_avg !== '' ? parseFloat(stats.bowling_avg) : undefined,
        bowling_economy: stats.bowling_economy !== '' ? parseFloat(stats.bowling_economy) : undefined,
        bowling_strike_rate: stats.bowling_strike_rate !== '' ? parseFloat(stats.bowling_strike_rate) : undefined,
        wickets_total: stats.wickets_total !== '' ? parseInt(stats.wickets_total) : undefined,
        best_bowling: stats.best_bowling.trim() || undefined,
        recent_form: stats.recent_form.filter((v) => v !== '').map(Number),
        recent_wickets: stats.recent_wickets.filter((v) => v !== '').map(Number),
      };

      await playerAPI.upsertPlayerStats(selectedPlayerId, payload);
      setToast({ message: `✅ ${format} stats saved for ${selectedPlayer?.name}!`, type: 'success' });
      setStats(EMPTY_STATS);
    } catch (err) {
      setToast({ message: err.friendlyMessage || 'Failed to save stats.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = preview
    ? preview.total >= 75
      ? '#10B981'
      : preview.total >= 55
      ? '#F59E0B'
      : preview.total >= 35
      ? '#6366F1'
      : '#9CA3AF'
    : '#4B5563';

  return (
    <>
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              📊
            </div>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: '0.05em', color: '#F9FAFB', margin: 0 }}>
              ADD / EDIT PLAYER STATS
            </h2>
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#4B5563', margin: 0 }}>
            Select a player, choose a format, enter their career statistics.
          </p>
        </div>

        {/* Player + Format + Pitch selectors */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 24px', marginBottom: 8 }}>

          <FieldGroup label="Select Player *">
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
              onFocus={(e) => (e.target.style.borderColor = '#10B981')}
              onBlur={(e) => (e.target.style.borderColor = '#1E293B')}
            >
              <option value="">Choose a player...</option>
              {allPlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.country} · {p.role})
                </option>
              ))}
            </select>
            {validationErrors.player && (
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#EF4444', marginTop: 4 }}>{validationErrors.player}</p>
            )}
          </FieldGroup>

          <FieldGroup label="Format">
            <div style={{ display: 'flex', gap: 8 }}>
              {FORMATS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  style={{
                    flex: 1,
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 16,
                    letterSpacing: '0.05em',
                    padding: '10px 4px',
                    borderRadius: 10,
                    border: `1px solid ${format === f ? '#10B981' : '#1E293B'}`,
                    background: format === f ? 'rgba(16,185,129,0.12)' : 'transparent',
                    color: format === f ? '#10B981' : '#9CA3AF',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </FieldGroup>

          <FieldGroup label="Pitch Type (for score preview)">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {PITCH_TYPES.map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => setPitchType(pt)}
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '7px 6px',
                    borderRadius: 8,
                    border: `1px solid ${pitchType === pt ? '#F59E0B' : '#1E293B'}`,
                    background: pitchType === pt ? 'rgba(245,158,11,0.1)' : 'transparent',
                    color: pitchType === pt ? '#F59E0B' : '#9CA3AF',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textTransform: 'capitalize',
                  }}
                >
                  {pt === 'spin' ? '🌀' : pt === 'pace' ? '⚡' : pt === 'flat' ? '🏏' : '⚖️'} {pt}
                </button>
              ))}
            </div>
          </FieldGroup>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#1E293B', margin: '16px 0 24px' }} />

        {/* Stats + Preview layout */}
        <div style={{ display: 'grid', gridTemplateColumns: preview ? '1fr 300px' : '1fr', gap: 24, alignItems: 'start' }}>

          {/* Stats columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 32px' }}>

            {/* ── Batting Stats ── */}
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                🏏 Batting Stats
              </p>

              <FieldGroup label="Matches Played">
                <TextInput type="number" min="0" value={stats.matches} onChange={setStat('matches')} placeholder="e.g. 45" />
              </FieldGroup>

              <FieldGroup label="Batting Average">
                <TextInput type="number" min="0" max="100" step="0.01" value={stats.batting_avg} onChange={setStat('batting_avg')} placeholder="e.g. 43.50" />
                {validationErrors.batting_avg && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#EF4444', marginTop: 4 }}>Must be {validationErrors.batting_avg}</p>}
              </FieldGroup>

              <FieldGroup label="Strike Rate">
                <TextInput type="number" min="0" max="300" step="0.01" value={stats.strike_rate} onChange={setStat('strike_rate')} placeholder="e.g. 138.20" />
                {validationErrors.strike_rate && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#EF4444', marginTop: 4 }}>Must be {validationErrors.strike_rate}</p>}
              </FieldGroup>

              <FieldGroup label="Total Runs">
                <TextInput type="number" min="0" value={stats.runs_total} onChange={setStat('runs_total')} placeholder="e.g. 2850" />
              </FieldGroup>

              <FieldGroup label="Highest Score">
                <TextInput type="number" min="0" value={stats.highest_score} onChange={setStat('highest_score')} placeholder="e.g. 122" />
              </FieldGroup>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FieldGroup label="Centuries">
                  <TextInput type="number" min="0" value={stats.centuries} onChange={setStat('centuries')} placeholder="0" />
                </FieldGroup>
                <FieldGroup label="Fifties">
                  <TextInput type="number" min="0" value={stats.fifties} onChange={setStat('fifties')} placeholder="0" />
                </FieldGroup>
              </div>

              <FieldGroup label="Recent Form — Last 5 Innings Scores">
                <div style={{ display: 'flex', gap: 6 }}>
                  {stats.recent_form.map((v, i) => (
                    <input
                      key={i}
                      type="number"
                      min="0"
                      value={v}
                      onChange={(e) => setRecentItem('recent_form', i)(e.target.value)}
                      placeholder={String(i + 1)}
                      style={{
                        ...inputStyle,
                        width: 48,
                        height: 48,
                        textAlign: 'center',
                        padding: '4px',
                        fontSize: 13,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 700,
                        flex: 1,
                      }}
                      onFocus={(e) => (e.target.style.borderColor = '#10B981')}
                      onBlur={(e) => (e.target.style.borderColor = '#1E293B')}
                    />
                  ))}
                </div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#4B5563', marginTop: 6 }}>
                  Most recent innings first. Leave blank if unavailable.
                </p>
              </FieldGroup>
            </div>

            {/* ── Bowling Stats ── */}
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                ⚡ Bowling Stats
              </p>

              <FieldGroup label="Bowling Average">
                <TextInput type="number" min="0" max="200" step="0.01" value={stats.bowling_avg} onChange={setStat('bowling_avg')} placeholder="e.g. 24.10" />
              </FieldGroup>

              <FieldGroup label="Economy Rate">
                <TextInput type="number" min="0" max="15" step="0.01" value={stats.bowling_economy} onChange={setStat('bowling_economy')} placeholder="e.g. 7.45" />
                {validationErrors.bowling_economy && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#EF4444', marginTop: 4 }}>Must be {validationErrors.bowling_economy}</p>}
              </FieldGroup>

              <FieldGroup label="Bowling Strike Rate">
                <TextInput type="number" min="0" max="300" step="0.01" value={stats.bowling_strike_rate} onChange={setStat('bowling_strike_rate')} placeholder="e.g. 19.40" />
              </FieldGroup>

              <FieldGroup label="Total Wickets">
                <TextInput type="number" min="0" value={stats.wickets_total} onChange={setStat('wickets_total')} placeholder="e.g. 87" />
              </FieldGroup>

              <FieldGroup label="Best Bowling (e.g. 5/23)">
                <TextInput value={stats.best_bowling} onChange={setStat('best_bowling')} placeholder="e.g. 4/18" />
              </FieldGroup>

              {/* Spacer to align with batting cols */}
              <div style={{ height: 18 }} />

              <FieldGroup label="Recent Wickets — Last 5 Matches">
                <div style={{ display: 'flex', gap: 6 }}>
                  {stats.recent_wickets.map((v, i) => (
                    <input
                      key={i}
                      type="number"
                      min="0"
                      max="10"
                      value={v}
                      onChange={(e) => setRecentItem('recent_wickets', i)(e.target.value)}
                      placeholder={String(i + 1)}
                      style={{
                        ...inputStyle,
                        width: 48,
                        height: 48,
                        textAlign: 'center',
                        padding: '4px',
                        fontSize: 13,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 700,
                        flex: 1,
                      }}
                      onFocus={(e) => (e.target.style.borderColor = '#F59E0B')}
                      onBlur={(e) => (e.target.style.borderColor = '#1E293B')}
                    />
                  ))}
                </div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#4B5563', marginTop: 6 }}>
                  Most recent match first. Leave blank if unavailable.
                </p>
              </FieldGroup>
            </div>
          </div>

          {/* ── Live Scoring Preview ── */}
          {preview && (
            <div style={{ position: 'sticky', top: 100 }}>
              <div style={{ background: '#0A0F1E', border: `1px solid ${scoreColor}33`, borderRadius: 18, padding: '22px 20px' }}>
                <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: '0.05em', color: '#F9FAFB', margin: '0 0 6px 0' }}>
                  SCORE PREVIEW
                </p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#4B5563', margin: '0 0 18px 0' }}>
                  {format} · {pitchType} pitch · {selectedPlayer?.name}
                </p>

                <ScoreMeter score={preview.total} />

                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Batting Avg', value: preview.breakdown.batting_avg_points, max: 20, color: '#10B981' },
                    { label: 'Strike Rate', value: preview.breakdown.strike_rate_points, max: 15, color: '#10B981' },
                    { label: 'Wickets', value: preview.breakdown.wickets_points, max: 10, color: '#F59E0B' },
                    { label: 'Economy', value: preview.breakdown.economy_points, max: 15, color: '#F59E0B' },
                    { label: 'Recent Form', value: preview.breakdown.recent_form_points, max: 20, color: '#6366F1' },
                    { label: 'Conditions', value: preview.breakdown.condition_bonus, max: 15, color: '#EC4899' },
                    { label: 'Format Bonus', value: preview.breakdown.format_bonus, max: 5, color: '#9CA3AF' },
                  ].map(({ label, value, max, color }) => (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9CA3AF' }}>{label}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color, fontWeight: 700 }}>
                          {value.toFixed(1)} <span style={{ color: '#4B5563', fontWeight: 400 }}>/ {max}</span>
                        </span>
                      </div>
                      <div style={{ height: 3, background: '#1E293B', borderRadius: 99, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${(value / max) * 100}%`,
                            background: color,
                            borderRadius: 99,
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 16, padding: '10px 12px', background: '#111827', border: '1px solid #1E293B', borderRadius: 10 }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#4B5563', margin: '0 0 4px 0' }}>
                    SELECTION LIKELIHOOD
                  </p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: scoreColor, margin: 0, fontWeight: 600 }}>
                    {preview.total >= 75
                      ? '🟢 Very likely to be selected'
                      : preview.total >= 55
                      ? '🟡 Competitive — likely picked'
                      : preview.total >= 35
                      ? '🟠 Borderline — depends on squad depth'
                      : '🔴 Unlikely to make the XI'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #1E293B', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#4B5563', margin: 0 }}>
            Saving {format} stats{selectedPlayer ? ` for ${selectedPlayer.name}` : ''}.
          </p>
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedPlayerId}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              padding: '13px 32px',
              borderRadius: 12,
              border: 'none',
              background: !selectedPlayerId ? '#1E293B' : loading ? '#065F46' : '#10B981',
              color: !selectedPlayerId ? '#4B5563' : '#fff',
              cursor: loading || !selectedPlayerId ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
            onMouseEnter={(e) => selectedPlayerId && !loading && (e.currentTarget.style.background = '#34D399')}
            onMouseLeave={(e) => selectedPlayerId && !loading && (e.currentTarget.style.background = '#10B981')}
          >
            {loading ? (
              <>
                <span style={{ width: 16, height: 16, border: '2px solid #fff4', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                Saving...
              </>
            ) : (
              '💾 Save Stats'
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AddPlayerPage() {
  const [allPlayers, setAllPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [prefillPlayer, setPrefillPlayer] = useState(null);
  const [sectionAToast, setSectionAToast] = useState(null);

  const loadPlayers = useCallback(async () => {
    try {
      setPlayersLoading(true);
      const data = await playerAPI.getPlayers();
      setAllPlayers(data);
    } catch (err) {
      console.error('Failed to load players:', err);
    } finally {
      setPlayersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  // Called by Section A after successful player creation
  const handlePlayerCreated = useCallback(
    (newPlayer, message, type = 'success') => {
      setSectionAToast({ message, type });
      if (newPlayer && type === 'success') {
        // Add to local list immediately (no re-fetch needed)
        setAllPlayers((prev) => [newPlayer, ...prev]);
        // Auto-populate Section B
        setPrefillPlayer(newPlayer);
        // Scroll to Section B smoothly
        setTimeout(() => {
          document.getElementById('stats-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      }
    },
    [],
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes toastSlide { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: #4B5563; }
        select option { background: #111827; color: #F9FAFB; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0A0F1E; }
        ::-webkit-scrollbar-thumb { background: #1E293B; border-radius: 3px; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { opacity: 0.4; }
      `}</style>

      {sectionAToast && (
        <Toast
          message={sectionAToast.message}
          type={sectionAToast.type}
          onDismiss={() => setSectionAToast(null)}
        />
      )}

      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0A0F1E 0%, #0D1B2A 50%, #0A1628 100%)',
          paddingBottom: 80,
          animation: 'fadeSlideUp 0.4s ease',
        }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 24px 0' }}>

          {/* Page Header */}
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#4B5563', marginBottom: 12, letterSpacing: '0.05em' }}>
            <a href="/" style={{ color: '#10B981', textDecoration: 'none' }}>Home</a>
            {' › '}
            <a href="/players" style={{ color: '#10B981', textDecoration: 'none' }}>Players</a>
            {' › '}
            <span style={{ color: '#9CA3AF' }}>Add Player</span>
          </p>

          <div style={{ marginBottom: 40 }}>
            <h1
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 'clamp(36px, 6vw, 60px)',
                letterSpacing: '0.05em',
                color: '#F9FAFB',
                lineHeight: 0.95,
                marginBottom: 12,
              }}
            >
              PLAYER{' '}
              <span style={{ color: '#10B981' }}>MANAGEMENT</span>
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#9CA3AF', maxWidth: 560 }}>
              Add new players to the database and enter their career statistics.
              Stats are used by the AI scoring algorithm to rank and select the best XI.
            </p>
          </div>

          {/* Info banner */}
          <div
            style={{
              background: 'rgba(16,185,129,0.06)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 14,
              padding: '14px 20px',
              marginBottom: 32,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9CA3AF', margin: 0, lineHeight: 1.6 }}>
              <strong style={{ color: '#10B981' }}>Workflow: </strong>
              First add the player in Section A (their profile). Then in Section B, select them and enter their stats for each format.
              The live Score Preview shows you how the AI algorithm rates them before you save.
            </p>
          </div>

          {/* ── Section A ── */}
          <div style={{ marginBottom: 32 }}>
            <AddPlayerSection onPlayerCreated={handlePlayerCreated} />
          </div>

          {/* ── Section B ── */}
          <div id="stats-section">
            {playersLoading ? (
              <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '40px 28px' }}>
                <span style={{ width: 20, height: 20, border: '2px solid #1E293B', borderTopColor: '#10B981', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#9CA3AF' }}>Loading player list...</span>
              </div>
            ) : (
              <StatsSection prefillPlayer={prefillPlayer} allPlayers={allPlayers} />
            )}
          </div>

          {/* Quick nav back */}
          <div style={{ marginTop: 40, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a
              href="/players"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                padding: '10px 20px',
                borderRadius: 10,
                border: '1px solid #1E293B',
                color: '#9CA3AF',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                transition: 'border-color 0.2s, color 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.color = '#10B981'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E293B'; e.currentTarget.style.color = '#9CA3AF'; }}
            >
              ← Browse All Players
            </a>
            <a
              href="/select"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                padding: '10px 20px',
                borderRadius: 10,
                border: '1px solid rgba(16,185,129,0.4)',
                color: '#10B981',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(16,185,129,0.06)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(16,185,129,0.12)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(16,185,129,0.06)')}
            >
              🏏 Generate Team XI →
            </a>
          </div>
        </div>
      </div>
    </>
  );
}