/**
 * AddPlayerPage.jsx
 * Section A: Add player + upload photo
 * Section B: Add/edit stats with live score preview
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { playerAPI } from '../services/api';

const ROLES = ['batsman', 'bowler', 'allrounder', 'wicketkeeper'];
const ROLE_LABELS = { batsman: '🏏 Batsman', bowler: '⚡ Bowler', allrounder: '🌟 All-rounder', wicketkeeper: '🧤 Wicket-keeper' };
const BATTING_STYLES = ['right-hand', 'left-hand'];
const BOWLING_STYLES = ['right-arm fast','right-arm medium','right-arm off-spin','left-arm fast','left-arm medium','left-arm spin','leg spin','n/a'];
const SQUADS = ['None', 'Pakistan', 'India'];
const FORMATS = ['T20', 'ODI', 'Test'];
const PITCH_TYPES = ['spin', 'pace', 'flat', 'balanced'];
const ROLE_COLORS = { batsman: '#10B981', bowler: '#F59E0B', allrounder: '#6366F1', wicketkeeper: '#EC4899' };

// ── Scoring algorithm (mirrors scoring_service.py exactly) ────────────────────
function calculatePreviewScore(role, bowlingStyle, battingStyle, stats, format, pitchType) {
  let score = 0;
  const breakdown = {};
  const avg = parseFloat(stats.batting_avg) || 0;
  const sr = parseFloat(stats.strike_rate) || 0;
  let avgPoints = avg > 0 ? Math.min(avg * 0.5, 20) : 0;
  let srPoints = 0;
  if (sr > 0) {
    if (format === 'T20') srPoints = Math.min(Math.max((sr - 100) * 0.15, 0), 15);
    if (format === 'ODI') srPoints = Math.min(Math.max((sr - 70) * 0.10, 0), 10);
  }
  breakdown.batting_avg_points = parseFloat(avgPoints.toFixed(2));
  breakdown.strike_rate_points = parseFloat(srPoints.toFixed(2));
  score += avgPoints + srPoints;
  const wkts = parseFloat(stats.wickets_total) || 0;
  const eco = parseFloat(stats.bowling_economy) || 0;
  let wktsPoints = wkts > 0 ? Math.min(wkts * 0.1, 10) : 0;
  let ecoPoints = eco > 0 ? Math.min(Math.max((10 - eco) * 2, 0), 15) : 0;
  breakdown.wickets_points = parseFloat(wktsPoints.toFixed(2));
  breakdown.economy_points = parseFloat(ecoPoints.toFixed(2));
  score += wktsPoints + ecoPoints;
  const rf = (stats.recent_form || []).filter(v => v !== '').map(Number);
  const rw = (stats.recent_wickets || []).filter(v => v !== '').map(Number);
  const FW = [0.35, 0.25, 0.20, 0.12, 0.08];
  let fd = [];
  if (role === 'batsman' || role === 'wicketkeeper') fd = [...rf, ...rw.map(w => w * 10)].slice(0, 5);
  else if (role === 'bowler') fd = [...rw.map(w => w * 10), ...rf].slice(0, 5);
  else { const il = []; for (let i = 0; i < Math.max(rf.length, rw.length); i++) { if (rf[i] !== undefined) il.push(rf[i]); if (rw[i] !== undefined) il.push(rw[i] * 10); } fd = il.slice(0, 5); }
  let formPoints = 0;
  if (fd.length > 0) { const w = FW.slice(0, fd.length); const ws = w.reduce((a, b) => a + b, 0); formPoints = Math.min(fd.reduce((acc, r, i) => acc + r * (w[i] / ws), 0) / 10, 20); }
  breakdown.recent_form_points = parseFloat(formPoints.toFixed(2));
  score += formPoints;
  const pitch = (pitchType || 'balanced').toLowerCase();
  const bsl = (bowlingStyle || '').toLowerCase();
  const batsl = (battingStyle || '').toLowerCase();
  let cond = 0;
  if (pitch === 'spin') { if (bsl.includes('spin')) cond = 15; else if (batsl.includes('left')) cond = 5; }
  else if (pitch === 'pace') { if (bsl.includes('fast') || (role === 'bowler' && !bsl.includes('spin'))) cond = 15; else if (role === 'batsman') cond = 3; }
  else if (pitch === 'flat') { if (role === 'batsman') cond = 8; else if (role === 'wicketkeeper') cond = 5; }
  else { cond = role === 'allrounder' ? 8 : 4; }
  breakdown.condition_bonus = cond;
  score += cond;
  let fb = 0;
  if (format === 'T20' && role === 'allrounder') fb = 5;
  else if (format === 'T20' && role === 'wicketkeeper') fb = 3;
  else if (format === 'ODI' && (role === 'allrounder' || role === 'wicketkeeper')) fb = 3;
  else if (format === 'Test' && role === 'batsman') fb = 5;
  else if (format === 'Test' && role === 'bowler') fb = 3;
  breakdown.format_bonus = fb;
  score += fb;
  return { total: Math.min(parseFloat(score.toFixed(2)), 100), breakdown };
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const IS = { width: '100%', background: '#0A0F1E', border: '1px solid #1E293B', borderRadius: 10, padding: '10px 14px', color: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' };
const LS = { display: 'block', fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: '#9CA3AF', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' };
const CS = { background: '#111827', border: '1px solid #1E293B', borderRadius: 20, padding: '28px 28px' };

function FG({ label, children }) {
  return <div style={{ marginBottom: 18 }}><label style={LS}>{label}</label>{children}</div>;
}
function TI({ value, onChange, placeholder, type = 'text', min, max, step }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} min={min} max={max} step={step} style={IS} onFocus={e => (e.target.style.borderColor = '#10B981')} onBlur={e => (e.target.style.borderColor = '#1E293B')} />;
}
function SI({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ ...IS, cursor: 'pointer' }} onFocus={e => (e.target.style.borderColor = '#10B981')} onBlur={e => (e.target.style.borderColor = '#1E293B')}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>{typeof o === 'string' ? o : o.label}</option>)}
    </select>
  );
}
function Toast({ message, type, onDismiss }) {
  useEffect(() => { const t = setTimeout(onDismiss, 4500); return () => clearTimeout(t); }, [onDismiss]);
  const ok = type === 'success';
  return (
    <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${ok ? '#10B981' : '#EF4444'}44`, borderRadius: 14, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, maxWidth: 380, animation: 'toastSlide 0.3s ease', boxShadow: `0 8px 32px ${ok ? '#10B98144' : '#EF444444'}` }}>
      <span style={{ fontSize: 18 }}>{ok ? '✅' : '❌'}</span>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: ok ? '#34D399' : '#FCA5A5', margin: 0, flex: 1 }}>{message}</p>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: '#4B5563', cursor: 'pointer', fontSize: 16, padding: 0 }}>✕</button>
    </div>
  );
}
function ScoreMeter({ score }) {
  const pct = Math.min(100, Math.max(0, score || 0));
  const color = pct >= 75 ? '#10B981' : pct >= 55 ? '#F59E0B' : pct >= 35 ? '#6366F1' : '#9CA3AF';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Score</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color }}>{pct.toFixed(1)}</span>
      </div>
      <div style={{ height: 8, background: '#1E293B', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: 99, transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)' }} />
      </div>
    </div>
  );
}

// ── Image Uploader ────────────────────────────────────────────────────────────
function ImageUploader({ playerId, currentImageUrl, playerName, onUploaded }) {
  const [preview, setPreview] = useState(currentImageUrl ? playerAPI.resolveImageUrl(currentImageUrl) : null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG, and WebP images are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) { setError('File too large. Max 5 MB.'); return; }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !playerId) return;
    setUploading(true);
    setError('');
    try {
      const result = await playerAPI.uploadImage(playerId, selectedFile);
      setPreview(playerAPI.resolveImageUrl(result.image_url));
      setSelectedFile(null);
      onUploaded(result.image_url);
    } catch (err) {
      setError(err.friendlyMessage || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreview(currentImageUrl ? playerAPI.resolveImageUrl(currentImageUrl) : null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        style={{ width: '100%', height: 190, borderRadius: 14, border: `2px dashed ${selectedFile ? '#10B981' : '#1E293B'}`, background: '#0A0F1E', cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', transition: 'border-color 0.2s' }}
        onMouseEnter={e => !uploading && (e.currentTarget.style.borderColor = '#10B981')}
        onMouseLeave={e => !selectedFile && (e.currentTarget.style.borderColor = '#1E293B')}
      >
        {preview ? (
          <>
            <img src={preview} alt={playerName || 'Player'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = 1)}
              onMouseLeave={e => (e.currentTarget.style.opacity = 0)}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#fff' }}>📷 Change Photo</p>
            </div>
          </>
        ) : (
          <>
            <span style={{ fontSize: 36, marginBottom: 10 }}>📷</span>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9CA3AF', margin: 0, textAlign: 'center', padding: '0 16px' }}>Click to upload player photo</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#4B5563', margin: '6px 0 0 0' }}>JPEG, PNG, WebP — max 5 MB</p>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} style={{ display: 'none' }} />
      {error && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#EF4444', marginTop: 6 }}>{error}</p>}
      {selectedFile && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button onClick={handleUpload} disabled={uploading || !playerId}
            style={{ flex: 1, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, padding: '9px 16px', borderRadius: 10, border: 'none', background: !playerId ? '#1E293B' : uploading ? '#065F46' : '#10B981', color: !playerId ? '#4B5563' : '#fff', cursor: uploading || !playerId ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {uploading
              ? <><span style={{ width: 14, height: 14, border: '2px solid #fff4', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />Uploading...</>
              : !playerId ? '⚠️ Save player first' : '💾 Save Photo'}
          </button>
          <button onClick={handleCancel} style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, padding: '9px 14px', borderRadius: 10, border: '1px solid #1E293B', background: 'transparent', color: '#9CA3AF', cursor: 'pointer' }}>Cancel</button>
        </div>
      )}
      {!playerId && selectedFile && (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#F59E0B', marginTop: 6 }}>
          ⚠️ Click "Add Player" first, then the photo upload will activate.
        </p>
      )}
    </div>
  );
}

// ── Section A — Add New Player ────────────────────────────────────────────────
function AddPlayerSection({ onPlayerCreated }) {
  const [form, setForm] = useState({ name: '', country: '', customCountry: '', role: '', batting_style: '', bowling_style: '', squad: 'None' });
  const [createdPlayer, setCreatedPlayer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const set = key => val => setForm(f => ({ ...f, [key]: val }));

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
      const newPlayer = await playerAPI.createPlayer({ name: form.name.trim(), country, role: form.role, batting_style: form.batting_style, bowling_style: form.bowling_style });
      if (form.squad !== 'None') await playerAPI.assignToSquad(newPlayer.id, form.squad, 'all_format');
      setCreatedPlayer(newPlayer);
      onPlayerCreated(newPlayer, `✅ ${newPlayer.name} added! Upload a photo below, then add stats.`);
    } catch (err) {
      onPlayerCreated(null, err.friendlyMessage || 'Failed to add player.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fe = key => errors[key] ? <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#EF4444', marginTop: 4 }}>{errors[key]}</p> : null;

  return (
    <div style={CS}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>➕</div>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: '0.05em', color: '#F9FAFB', margin: 0 }}>ADD NEW PLAYER</h2>
        </div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#4B5563', margin: 0 }}>Fill in player details then upload a photo. Add stats in Section B.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 32, alignItems: 'start' }}>
        {/* Left — form fields */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 24px' }}>
          <FG label="Player Name *"><TI value={form.name} onChange={set('name')} placeholder="e.g. Babar Azam" />{fe('name')}</FG>
          <FG label="Country *">
            <SI value={form.country} onChange={set('country')} placeholder="Select country..." options={['Pakistan', 'India', 'Other']} />
            {fe('country')}
          </FG>
          {form.country === 'Other' && <FG label="Specify Country *"><TI value={form.customCountry} onChange={set('customCountry')} placeholder="e.g. Australia" /></FG>}
          <FG label="Role *">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {ROLES.map(r => {
                const sel = form.role === r; const c = ROLE_COLORS[r];
                return <button key={r} type="button" onClick={() => set('role')(r)} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, padding: '9px 10px', borderRadius: 10, border: `1px solid ${sel ? c : '#1E293B'}`, background: sel ? `${c}18` : 'transparent', color: sel ? c : '#9CA3AF', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}>{ROLE_LABELS[r]}</button>;
              })}
            </div>
            {fe('role')}
          </FG>
          <FG label="Batting Style *">
            <div style={{ display: 'flex', gap: 8 }}>
              {BATTING_STYLES.map(s => {
                const sel = form.batting_style === s;
                return <button key={s} type="button" onClick={() => set('batting_style')(s)} style={{ flex: 1, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, padding: '10px 8px', borderRadius: 10, border: `1px solid ${sel ? '#10B981' : '#1E293B'}`, background: sel ? 'rgba(16,185,129,0.12)' : 'transparent', color: sel ? '#10B981' : '#9CA3AF', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'capitalize' }}>🏏 {s}</button>;
              })}
            </div>
            {fe('batting_style')}
          </FG>
          <FG label="Bowling Style *">
            <SI value={form.bowling_style} onChange={set('bowling_style')} placeholder="Select bowling style..." options={BOWLING_STYLES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} />
            {fe('bowling_style')}
          </FG>
          <FG label="Assign to Squad">
            <div style={{ display: 'flex', gap: 8 }}>
              {SQUADS.map(s => {
                const sel = form.squad === s; const flag = s === 'Pakistan' ? '🇵🇰 ' : s === 'India' ? '🇮🇳 ' : '';
                return <button key={s} type="button" onClick={() => set('squad')(s)} style={{ flex: 1, fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, padding: '10px 6px', borderRadius: 10, border: `1px solid ${sel ? '#10B981' : '#1E293B'}`, background: sel ? 'rgba(16,185,129,0.12)' : 'transparent', color: sel ? '#10B981' : '#9CA3AF', cursor: 'pointer', transition: 'all 0.2s' }}>{flag}{s}</button>;
              })}
            </div>
          </FG>
        </div>

        {/* Right — Image uploader */}
        <div>
          <label style={LS}>Player Photo</label>
          <ImageUploader playerId={createdPlayer?.id || null} currentImageUrl={createdPlayer?.image_url || null} playerName={form.name} onUploaded={(url) => setCreatedPlayer(p => ({ ...p, image_url: url }))} />
        </div>
      </div>

      <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #1E293B', display: 'flex', alignItems: 'center', gap: 16 }}>
        {!createdPlayer ? (
          <button onClick={handleSubmit} disabled={loading}
            style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, padding: '13px 32px', borderRadius: 12, border: 'none', background: loading ? '#065F46' : '#10B981', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: 10 }}
            onMouseEnter={e => !loading && (e.currentTarget.style.background = '#34D399')}
            onMouseLeave={e => !loading && (e.currentTarget.style.background = '#10B981')}>
            {loading ? <><span style={{ width: 16, height: 16, border: '2px solid #fff4', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />Adding...</> : '➕ Add Player'}
          </button>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12 }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#10B981', margin: 0, fontWeight: 600 }}>{createdPlayer.name} saved (ID: {createdPlayer.id})</p>
            </div>
            <button onClick={() => { setForm({ name: '', country: '', customCountry: '', role: '', batting_style: '', bowling_style: '', squad: 'None' }); setCreatedPlayer(null); setErrors({}); }}
              style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, padding: '13px 24px', borderRadius: 12, border: '1px solid #1E293B', background: 'transparent', color: '#9CA3AF', cursor: 'pointer' }}>
              + Add Another
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Section B — Stats Entry ───────────────────────────────────────────────────
const EMPTY_STATS = { matches: '', batting_avg: '', strike_rate: '', runs_total: '', highest_score: '', centuries: '', fifties: '', bowling_avg: '', bowling_economy: '', bowling_strike_rate: '', wickets_total: '', best_bowling: '', recent_form: ['', '', '', '', ''], recent_wickets: ['', '', '', '', ''] };

function StatsSection({ prefillPlayer, allPlayers }) {
  const [selId, setSelId] = useState('');
  const [selPlayer, setSelPlayer] = useState(null);
  const [format, setFormat] = useState('T20');
  const [pitch, setPitch] = useState('balanced');
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [ve, setVe] = useState({});

  useEffect(() => { if (prefillPlayer) { setSelId(String(prefillPlayer.id)); setSelPlayer(prefillPlayer); setStats(EMPTY_STATS); } }, [prefillPlayer]);
  useEffect(() => { if (!selId) { setSelPlayer(null); return; } setSelPlayer(allPlayers.find(p => String(p.id) === selId) || null); }, [selId, allPlayers]);

  const ss = key => val => setStats(s => ({ ...s, [key]: val }));
  const sri = (lk, i) => val => setStats(s => { const a = [...s[lk]]; a[i] = val; return { ...s, [lk]: a }; });

  const preview = selPlayer ? calculatePreviewScore(selPlayer.role, selPlayer.bowling_style, selPlayer.batting_style, stats, format, pitch) : null;

  const validate = () => {
    const e = {};
    if (!selId) e.player = 'Please select a player.';
    const ba = parseFloat(stats.batting_avg); if (stats.batting_avg !== '' && (ba < 0 || ba > 100)) e.batting_avg = '0–100';
    const sr = parseFloat(stats.strike_rate); if (stats.strike_rate !== '' && (sr < 0 || sr > 300)) e.strike_rate = '0–300';
    const eco = parseFloat(stats.bowling_economy); if (stats.bowling_economy !== '' && (eco < 0 || eco > 15)) e.bowling_economy = '0–15';
    setVe(e); return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = { format, matches: stats.matches !== '' ? parseInt(stats.matches) : undefined, batting_avg: stats.batting_avg !== '' ? parseFloat(stats.batting_avg) : undefined, strike_rate: stats.strike_rate !== '' ? parseFloat(stats.strike_rate) : undefined, runs_total: stats.runs_total !== '' ? parseInt(stats.runs_total) : undefined, highest_score: stats.highest_score !== '' ? parseInt(stats.highest_score) : undefined, centuries: stats.centuries !== '' ? parseInt(stats.centuries) : undefined, fifties: stats.fifties !== '' ? parseInt(stats.fifties) : undefined, bowling_avg: stats.bowling_avg !== '' ? parseFloat(stats.bowling_avg) : undefined, bowling_economy: stats.bowling_economy !== '' ? parseFloat(stats.bowling_economy) : undefined, bowling_strike_rate: stats.bowling_strike_rate !== '' ? parseFloat(stats.bowling_strike_rate) : undefined, wickets_total: stats.wickets_total !== '' ? parseInt(stats.wickets_total) : undefined, best_bowling: stats.best_bowling.trim() || undefined, recent_form: stats.recent_form.filter(v => v !== '').map(Number), recent_wickets: stats.recent_wickets.filter(v => v !== '').map(Number) };
      await playerAPI.upsertPlayerStats(selId, payload);
      setToast({ message: `✅ ${format} stats saved for ${selPlayer?.name}!`, type: 'success' });
      setStats(EMPTY_STATS);
    } catch (err) {
      setToast({ message: err.friendlyMessage || 'Failed to save stats.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const sc = preview ? preview.total >= 75 ? '#10B981' : preview.total >= 55 ? '#F59E0B' : preview.total >= 35 ? '#6366F1' : '#9CA3AF' : '#4B5563';
  const mi = (v, onChange, accent = '#10B981') => <input type="number" min="0" value={v} onChange={e => onChange(e.target.value)} style={{ ...IS, width: 48, height: 48, textAlign: 'center', padding: '4px', fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, flex: 1 }} onFocus={e => (e.target.style.borderColor = accent)} onBlur={e => (e.target.style.borderColor = '#1E293B')} />;

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
      <div style={CS}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📊</div>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: '0.05em', color: '#F9FAFB', margin: 0 }}>ADD / EDIT PLAYER STATS</h2>
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#4B5563', margin: 0 }}>Select a player, choose a format, enter career statistics.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 24px', marginBottom: 8 }}>
          <FG label="Select Player *">
            <select value={selId} onChange={e => setSelId(e.target.value)} style={{ ...IS, cursor: 'pointer' }} onFocus={e => (e.target.style.borderColor = '#10B981')} onBlur={e => (e.target.style.borderColor = '#1E293B')}>
              <option value="">Choose a player...</option>
              {allPlayers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.country} · {p.role})</option>)}
            </select>
            {ve.player && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#EF4444', marginTop: 4 }}>{ve.player}</p>}
          </FG>
          <FG label="Format">
            <div style={{ display: 'flex', gap: 8 }}>
              {FORMATS.map(f => <button key={f} type="button" onClick={() => setFormat(f)} style={{ flex: 1, fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: '0.05em', padding: '10px 4px', borderRadius: 10, border: `1px solid ${format === f ? '#10B981' : '#1E293B'}`, background: format === f ? 'rgba(16,185,129,0.12)' : 'transparent', color: format === f ? '#10B981' : '#9CA3AF', cursor: 'pointer', transition: 'all 0.2s' }}>{f}</button>)}
            </div>
          </FG>
          <FG label="Pitch Type (preview)">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {PITCH_TYPES.map(pt => <button key={pt} type="button" onClick={() => setPitch(pt)} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, padding: '7px 6px', borderRadius: 8, border: `1px solid ${pitch === pt ? '#F59E0B' : '#1E293B'}`, background: pitch === pt ? 'rgba(245,158,11,0.1)' : 'transparent', color: pitch === pt ? '#F59E0B' : '#9CA3AF', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'capitalize' }}>{pt === 'spin' ? '🌀' : pt === 'pace' ? '⚡' : pt === 'flat' ? '🏏' : '⚖️'} {pt}</button>)}
            </div>
          </FG>
        </div>

        <div style={{ height: 1, background: '#1E293B', margin: '16px 0 24px' }} />

        <div style={{ display: 'grid', gridTemplateColumns: preview ? '1fr 300px' : '1fr', gap: 24, alignItems: 'start' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 32px' }}>
            {/* Batting */}
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>🏏 Batting Stats</p>
              <FG label="Matches Played"><TI type="number" min="0" value={stats.matches} onChange={ss('matches')} placeholder="e.g. 45" /></FG>
              <FG label="Batting Average"><TI type="number" min="0" max="100" step="0.01" value={stats.batting_avg} onChange={ss('batting_avg')} placeholder="e.g. 43.50" />{ve.batting_avg && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#EF4444', marginTop: 4 }}>Must be {ve.batting_avg}</p>}</FG>
              <FG label="Strike Rate"><TI type="number" min="0" max="300" step="0.01" value={stats.strike_rate} onChange={ss('strike_rate')} placeholder="e.g. 138.20" />{ve.strike_rate && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#EF4444', marginTop: 4 }}>Must be {ve.strike_rate}</p>}</FG>
              <FG label="Total Runs"><TI type="number" min="0" value={stats.runs_total} onChange={ss('runs_total')} placeholder="e.g. 2850" /></FG>
              <FG label="Highest Score"><TI type="number" min="0" value={stats.highest_score} onChange={ss('highest_score')} placeholder="e.g. 122" /></FG>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FG label="Centuries"><TI type="number" min="0" value={stats.centuries} onChange={ss('centuries')} placeholder="0" /></FG>
                <FG label="Fifties"><TI type="number" min="0" value={stats.fifties} onChange={ss('fifties')} placeholder="0" /></FG>
              </div>
              <FG label="Recent Form — Last 5 Scores">
                <div style={{ display: 'flex', gap: 6 }}>{stats.recent_form.map((v, i) => mi(v, sri('recent_form', i)))}</div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#4B5563', marginTop: 6 }}>Most recent first.</p>
              </FG>
            </div>
            {/* Bowling */}
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>⚡ Bowling Stats</p>
              <FG label="Bowling Average"><TI type="number" min="0" max="200" step="0.01" value={stats.bowling_avg} onChange={ss('bowling_avg')} placeholder="e.g. 24.10" /></FG>
              <FG label="Economy Rate"><TI type="number" min="0" max="15" step="0.01" value={stats.bowling_economy} onChange={ss('bowling_economy')} placeholder="e.g. 7.45" />{ve.bowling_economy && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#EF4444', marginTop: 4 }}>Must be {ve.bowling_economy}</p>}</FG>
              <FG label="Bowling Strike Rate"><TI type="number" min="0" max="300" step="0.01" value={stats.bowling_strike_rate} onChange={ss('bowling_strike_rate')} placeholder="e.g. 19.40" /></FG>
              <FG label="Total Wickets"><TI type="number" min="0" value={stats.wickets_total} onChange={ss('wickets_total')} placeholder="e.g. 87" /></FG>
              <FG label="Best Bowling (e.g. 5/23)"><TI value={stats.best_bowling} onChange={ss('best_bowling')} placeholder="e.g. 4/18" /></FG>
              <div style={{ height: 18 }} />
              <FG label="Recent Wickets — Last 5 Matches">
                <div style={{ display: 'flex', gap: 6 }}>{stats.recent_wickets.map((v, i) => mi(v, sri('recent_wickets', i), '#F59E0B'))}</div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#4B5563', marginTop: 6 }}>Most recent first.</p>
              </FG>
            </div>
          </div>

          {/* Score Preview */}
          {preview && (
            <div style={{ position: 'sticky', top: 100 }}>
              <div style={{ background: '#0A0F1E', border: `1px solid ${sc}33`, borderRadius: 18, padding: '22px 20px' }}>
                <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: '0.05em', color: '#F9FAFB', margin: '0 0 6px 0' }}>SCORE PREVIEW</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#4B5563', margin: '0 0 18px 0' }}>{format} · {pitch} pitch · {selPlayer?.name}</p>
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
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color, fontWeight: 700 }}>{value.toFixed(1)} <span style={{ color: '#4B5563', fontWeight: 400 }}>/ {max}</span></span>
                      </div>
                      <div style={{ height: 3, background: '#1E293B', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min((value / max) * 100, 100)}%`, background: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, padding: '10px 12px', background: '#111827', border: '1px solid #1E293B', borderRadius: 10 }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#4B5563', margin: '0 0 4px 0' }}>SELECTION LIKELIHOOD</p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: sc, margin: 0, fontWeight: 600 }}>
                    {preview.total >= 75 ? '🟢 Very likely to be selected' : preview.total >= 55 ? '🟡 Competitive — likely picked' : preview.total >= 35 ? '🟠 Borderline — depends on squad depth' : '🔴 Unlikely to make the XI'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #1E293B', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#4B5563', margin: 0 }}>Saving {format} stats{selPlayer ? ` for ${selPlayer.name}` : ''}.</p>
          <button onClick={handleSubmit} disabled={loading || !selId}
            style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, padding: '13px 32px', borderRadius: 12, border: 'none', background: !selId ? '#1E293B' : loading ? '#065F46' : '#10B981', color: !selId ? '#4B5563' : '#fff', cursor: loading || !selId ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
            onMouseEnter={e => selId && !loading && (e.currentTarget.style.background = '#34D399')}
            onMouseLeave={e => selId && !loading && (e.currentTarget.style.background = '#10B981')}>
            {loading ? <><span style={{ width: 16, height: 16, border: '2px solid #fff4', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />Saving...</> : '💾 Save Stats'}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AddPlayerPage() {
  const [allPlayers, setAllPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [prefillPlayer, setPrefillPlayer] = useState(null);
  const [toast, setToast] = useState(null);

  const loadPlayers = useCallback(async () => {
    try { setPlayersLoading(true); const data = await playerAPI.getPlayers(); setAllPlayers(data); }
    catch (err) { console.error('Failed to load players:', err); }
    finally { setPlayersLoading(false); }
  }, []);

  useEffect(() => {
    loadPlayers();
    const stored = sessionStorage.getItem('editStatsPlayer');
    if (stored) { try { setPrefillPlayer(JSON.parse(stored)); } catch (_) {} sessionStorage.removeItem('editStatsPlayer'); }
  }, [loadPlayers]);

  const handlePlayerCreated = useCallback((newPlayer, message, type = 'success') => {
    setToast({ message, type });
    if (newPlayer && type === 'success') {
      setAllPlayers(prev => [newPlayer, ...prev]);
      setPrefillPlayer(newPlayer);
      setTimeout(() => document.getElementById('stats-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
    }
  }, []);

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
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0A0F1E; } ::-webkit-scrollbar-thumb { background: #1E293B; border-radius: 3px; }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.4; }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0A0F1E 0%, #0D1B2A 50%, #0A1628 100%)', paddingBottom: 80, animation: 'fadeSlideUp 0.4s ease' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 24px 0' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#4B5563', marginBottom: 12 }}>
            <a href="/" style={{ color: '#10B981', textDecoration: 'none' }}>Home</a> › <a href="/players" style={{ color: '#10B981', textDecoration: 'none' }}>Players</a> › <span style={{ color: '#9CA3AF' }}>Add Player</span>
          </p>
          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(36px, 6vw, 60px)', letterSpacing: '0.05em', color: '#F9FAFB', lineHeight: 0.95, marginBottom: 12 }}>
              PLAYER <span style={{ color: '#10B981' }}>MANAGEMENT</span>
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#9CA3AF', maxWidth: 560 }}>Add players, upload their photos, and enter career statistics. The AI uses these to select the optimal XI.</p>
          </div>
          <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14, padding: '14px 20px', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9CA3AF', margin: 0, lineHeight: 1.6 }}>
              <strong style={{ color: '#10B981' }}>Workflow: </strong>1) Add player in Section A → 2) Upload photo → 3) Add stats in Section B for each format.
            </p>
          </div>
          <div style={{ marginBottom: 32 }}><AddPlayerSection onPlayerCreated={handlePlayerCreated} /></div>
          <div id="stats-section">
            {playersLoading
              ? <div style={{ ...CS, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '40px 28px' }}><span style={{ width: 20, height: 20, border: '2px solid #1E293B', borderTopColor: '#10B981', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /><span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#9CA3AF' }}>Loading...</span></div>
              : <StatsSection prefillPlayer={prefillPlayer} allPlayers={allPlayers} />}
          </div>
          <div style={{ marginTop: 40, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="/players" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, padding: '10px 20px', borderRadius: 10, border: '1px solid #1E293B', color: '#9CA3AF', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.color = '#10B981'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E293B'; e.currentTarget.style.color = '#9CA3AF'; }}>← Browse Players</a>
            <a href="/select" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(16,185,129,0.4)', color: '#10B981', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(16,185,129,0.06)', transition: 'background 0.2s' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.12)')} onMouseLeave={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.06)')}>🏏 Generate Team XI →</a>
          </div>
        </div>
      </div>
    </>
  );
}