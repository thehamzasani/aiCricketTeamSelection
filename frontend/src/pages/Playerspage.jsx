import { useState, useEffect, useRef } from "react";
import { playerAPI } from "../services/api";

// ─── Role Configuration ────────────────────────────────────────────────────
const ROLE_CONFIG = {
  batsman: { label: "Batsman", color: "#10B981", bg: "rgba(16,185,129,0.12)", icon: "🏏" },
  bowler: { label: "Bowler", color: "#F59E0B", bg: "rgba(245,158,11,0.12)", icon: "⚡" },
  allrounder: { label: "All-rounder", color: "#6366F1", bg: "rgba(99,102,241,0.12)", icon: "🌟" },
  wicketkeeper: { label: "Wicket-keeper", color: "#EC4899", bg: "rgba(236,72,153,0.12)", icon: "🧤" },
};

const COUNTRY_CONFIG = {
  Pakistan: { flag: "🇵🇰", color: "#10B981" },
  India: { flag: "🇮🇳", color: "#F59E0B" },
};

// ─── Score Meter ───────────────────────────────────────────────────────────
function ScoreMeter({ score, size = "normal" }) {
  const pct = Math.min(100, Math.max(0, score || 0));
  const color = pct >= 80 ? "#10B981" : pct >= 60 ? "#F59E0B" : pct >= 40 ? "#6366F1" : "#9CA3AF";
  const isSmall = size === "small";

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isSmall ? 4 : 6 }}>
        <span style={{ fontSize: isSmall ? 10 : 11, color: "#9CA3AF", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          AI Score
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: isSmall ? 12 : 14, fontWeight: 700, color }}>
          {pct.toFixed(1)}
        </span>
      </div>
      <div style={{ height: isSmall ? 4 : 6, background: "#1E293B", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})`, borderRadius: 99, transition: "width 0.8s cubic-bezier(0.34,1.56,0.64,1)" }} />
      </div>
    </div>
  );
}

// ─── Stat Pill ─────────────────────────────────────────────────────────────
function StatPill({ label, value }) {
  return (
    <div style={{ background: "#0A0F1E", border: "1px solid #1E293B", borderRadius: 10, padding: "6px 10px", display: "flex", flexDirection: "column", alignItems: "center", minWidth: 56 }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: "#F9FAFB", lineHeight: 1 }}>{value ?? "—"}</span>
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: "#4B5563", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{label}</span>
    </div>
  );
}

// ─── Stat Block (for modal) ────────────────────────────────────────────────
function StatBlock({ label, value, accent }) {
  return (
    <div style={{ background: "#0A0F1E", border: "1px solid #1E293B", borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: accent || "#F9FAFB", margin: "0 0 4px 0", lineHeight: 1 }}>{value}</p>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "#4B5563", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
    </div>
  );
}

// ─── Player Card ───────────────────────────────────────────────────────────
function PlayerCard({ player, onClick, index }) {
  const role = ROLE_CONFIG[player.role] || ROLE_CONFIG.batsman;
  const country = COUNTRY_CONFIG[player.country] || { flag: "🌍", color: "#9CA3AF" };
  const stats = player.stats || {};
  const isBowler = player.role === "bowler";
  const isAllrounder = player.role === "allrounder";

  return (
    <div
      onClick={() => onClick(player)}
      style={{ background: "#111827", border: "1px solid #1E293B", borderRadius: 20, padding: "22px 20px", cursor: "pointer", transition: "all 0.25s ease", animation: "fadeSlideUp 0.4s ease both", animationDelay: `${Math.min(index * 40, 400)}ms`, position: "relative", overflow: "hidden" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = role.color + "55"; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 12px 40px ${role.color}18`; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1E293B"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${role.color}66, transparent)` }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ width: 46, height: 46, borderRadius: "50%", background: role.bg, border: `1.5px solid ${role.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
          {role.icon}
        </div>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, background: "#0A0F1E", border: "1px solid #1E293B", borderRadius: 8, padding: "3px 8px", color: country.color, display: "flex", alignItems: "center", gap: 4 }}>
          {country.flag} {player.country}
        </span>
      </div>

      <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: "0.04em", color: "#F9FAFB", margin: "0 0 4px 0", lineHeight: 1.1 }}>{player.name}</p>

      <span style={{ display: "inline-block", fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, background: role.bg, color: role.color, borderRadius: 6, padding: "2px 8px", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {role.label}
      </span>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {(!isBowler || isAllrounder) && (
          <>
            <StatPill label="Avg" value={stats.batting_avg ? Number(stats.batting_avg).toFixed(1) : null} />
            <StatPill label="SR" value={stats.strike_rate ? Number(stats.strike_rate).toFixed(1) : null} />
            <StatPill label="Runs" value={stats.runs_total ?? null} />
          </>
        )}
        {(isBowler || isAllrounder) && (
          <>
            <StatPill label="Wkts" value={stats.wickets_total ?? null} />
            <StatPill label="Eco" value={stats.bowling_economy ? Number(stats.bowling_economy).toFixed(2) : null} />
          </>
        )}
      </div>

      <ScoreMeter score={player.overall_score} size="small" />

      {(player.batting_style || player.bowling_style) && (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "#4B5563", marginTop: 10, marginBottom: 0 }}>
          {[player.batting_style, player.bowling_style].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );
}

// ─── Player Modal ──────────────────────────────────────────────────────────
function PlayerModal({ player, onClose }) {
  const overlayRef = useRef(null);
  const role = ROLE_CONFIG[player.role] || ROLE_CONFIG.batsman;
  const country = COUNTRY_CONFIG[player.country] || { flag: "🌍", color: "#9CA3AF" };
  const stats = player.stats || {};
  const isBowler = player.role === "bowler";
  const isAllrounder = player.role === "allrounder";

  useEffect(() => {
    const handleKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px", animation: "fadeIn 0.2s ease" }}
    >
      <div style={{ background: "#111827", border: `1px solid ${role.color}33`, borderRadius: 24, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", position: "relative", animation: "modalSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)", boxShadow: `0 40px 80px ${role.color}18` }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${role.color}, transparent)`, borderRadius: "24px 24px 0 0" }} />

        <div style={{ padding: "28px 28px 32px" }}>
          <button
            onClick={onClose}
            style={{ position: "absolute", top: 20, right: 20, background: "#1E293B", border: "none", color: "#9CA3AF", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#374151"; e.currentTarget.style.color = "#F9FAFB"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#1E293B"; e.currentTarget.style.color = "#9CA3AF"; }}
          >✕</button>

          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: role.bg, border: `2px solid ${role.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>
              {role.icon}
            </div>
            <div>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: "0.05em", color: "#F9FAFB", margin: 0, lineHeight: 1 }}>{player.name}</h2>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: country.color }}>{country.flag} {player.country}</span>
                <span style={{ color: "#1E293B" }}>·</span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, background: role.bg, color: role.color, padding: "2px 8px", borderRadius: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{role.label}</span>
              </div>
            </div>
          </div>

          <div style={{ background: "#0A0F1E", border: "1px solid #1E293B", borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
            <ScoreMeter score={player.overall_score} />
          </div>

          {(!isBowler || isAllrounder) && (
            <div style={{ marginBottom: 18 }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>🏏 Batting Stats</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                <StatBlock label="Average" value={stats.batting_avg ? Number(stats.batting_avg).toFixed(2) : "—"} accent={role.color} />
                <StatBlock label="Strike Rate" value={stats.strike_rate ? Number(stats.strike_rate).toFixed(2) : "—"} accent={role.color} />
                <StatBlock label="Total Runs" value={stats.runs_total ?? "—"} accent={role.color} />
                <StatBlock label="Highest" value={stats.highest_score ?? "—"} accent={role.color} />
                <StatBlock label="50s" value={stats.fifties ?? "—"} accent={role.color} />
                <StatBlock label="100s" value={stats.centuries ?? "—"} accent={role.color} />
              </div>
            </div>
          )}

          {(isBowler || isAllrounder) && (
            <div style={{ marginBottom: 18 }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>⚡ Bowling Stats</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                <StatBlock label="Wickets" value={stats.wickets_total ?? "—"} accent="#F59E0B" />
                <StatBlock label="Economy" value={stats.bowling_economy ? Number(stats.bowling_economy).toFixed(2) : "—"} accent="#F59E0B" />
                <StatBlock label="Avg" value={stats.bowling_avg ? Number(stats.bowling_avg).toFixed(2) : "—"} accent="#F59E0B" />
                <StatBlock label="SR" value={stats.bowling_strike_rate ? Number(stats.bowling_strike_rate).toFixed(2) : "—"} accent="#F59E0B" />
                <StatBlock label="Best" value={stats.best_bowling ?? "—"} accent="#F59E0B" />
              </div>
            </div>
          )}

          {stats.recent_form && stats.recent_form.length > 0 && (
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>📊 Recent Form</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {stats.recent_form.map((score, i) => (
                  <div key={i} style={{ background: score >= 50 ? "rgba(16,185,129,0.15)" : score >= 20 ? "rgba(245,158,11,0.12)" : "#0A0F1E", border: `1px solid ${score >= 50 ? "#10B981" : score >= 20 ? "#F59E0B" : "#1E293B"}44`, borderRadius: 10, padding: "8px 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: score >= 50 ? "#10B981" : score >= 20 ? "#F59E0B" : "#9CA3AF" }}>
                    {score}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid #1E293B" }}>
            {player.batting_style && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#9CA3AF", margin: "0 0 4px 0" }}><span style={{ color: "#4B5563" }}>Batting: </span>{player.batting_style}</p>}
            {player.bowling_style && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#9CA3AF", margin: 0 }}><span style={{ color: "#4B5563" }}>Bowling: </span>{player.bowling_style}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Card ─────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background: "#111827", border: "1px solid #1E293B", borderRadius: 20, padding: "22px 20px" }}>
      {[46, 20, 12, 8].map((h, i) => (
        <div key={i} style={{ height: h, background: "linear-gradient(90deg, #1E293B 25%, #263548 50%, #1E293B 75%)", backgroundSize: "200% 100%", borderRadius: h > 20 ? "50%" : 8, marginBottom: 12, width: i === 0 ? 46 : i === 1 ? "70%" : i === 2 ? "45%" : "100%", animation: "shimmer 1.5s infinite" }} />
      ))}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function PlayersPage() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("All");
  const [role, setRole] = useState("All");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [sortBy, setSortBy] = useState("score");

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        setError(null);
       const data = await playerAPI.getPlayers();
setPlayers(data);
      } catch (err) {
        console.error("Failed to fetch players:", err);
        setError("Could not load players. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchPlayers();
  }, []);

  const filtered = players
    .filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchCountry = country === "All" || p.country === country;
      const matchRole = role === "All" || p.role === role;
      return matchSearch && matchCountry && matchRole;
    })
    .sort((a, b) => {
      if (sortBy === "score") return (b.overall_score || 0) - (a.overall_score || 0);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });

  const countries = ["All", "Pakistan", "India"];
  const roles = ["All", "batsman", "bowler", "allrounder", "wicketkeeper"];
  const roleLabels = { All: "All", batsman: "Batsman", bowler: "Bowler", allrounder: "All-rounder", wicketkeeper: "Wicket-keeper" };

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

      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0A0F1E 0%, #0D1B2A 50%, #0A1628 100%)", fontFamily: "'DM Sans', sans-serif", paddingBottom: 60 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 24px 0", animation: "fadeSlideUp 0.5s ease" }}>

          {/* Header */}
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#4B5563", marginBottom: 12, letterSpacing: "0.05em" }}>
            <a href="/" style={{ color: "#10B981", textDecoration: "none" }}>Home</a> › <span style={{ color: "#9CA3AF" }}>Players</span>
          </p>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 36 }}>
            <div>
              <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(36px, 6vw, 56px)", letterSpacing: "0.05em", color: "#F9FAFB", lineHeight: 0.95 }}>
                PLAYER <span style={{ color: "#10B981" }}>BROWSER</span>
              </h1>
              <p style={{ color: "#9CA3AF", fontSize: 14, marginTop: 8 }}>
                {loading ? "Loading players..." : `${filtered.length} player${filtered.length !== 1 ? "s" : ""} found`}
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#4B5563" }}>Sort by</span>
              {["score", "name"].map((s) => (
                <button key={s} onClick={() => setSortBy(s)} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 8, border: "1px solid", borderColor: sortBy === s ? "#10B981" : "#1E293B", background: sortBy === s ? "rgba(16,185,129,0.12)" : "transparent", color: sortBy === s ? "#10B981" : "#9CA3AF", cursor: "pointer", transition: "all 0.2s", textTransform: "capitalize" }}>
                  {s === "score" ? "AI Score" : "Name"}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div style={{ background: "#111827", border: "1px solid #1E293B", borderRadius: 20, padding: "20px 24px", marginBottom: 32, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "#4B5563", pointerEvents: "none" }}>🔍</span>
              <input type="text" placeholder="Search player..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: "100%", background: "#0A0F1E", border: "1px solid #1E293B", borderRadius: 12, padding: "10px 14px 10px 40px", color: "#F9FAFB", fontFamily: "'DM Sans', sans-serif", fontSize: 14, transition: "border-color 0.2s" }} />
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {countries.map((c) => (
                <button key={c} onClick={() => setCountry(c)} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 10, border: "1px solid", borderColor: country === c ? "#10B981" : "#1E293B", background: country === c ? "rgba(16,185,129,0.12)" : "transparent", color: country === c ? "#10B981" : "#9CA3AF", cursor: "pointer", transition: "all 0.2s" }}>
                  {c === "Pakistan" ? "🇵🇰 " : c === "India" ? "🇮🇳 " : "🌍 "}{c}
                </button>
              ))}
            </div>

            <div style={{ width: 1, height: 28, background: "#1E293B", flexShrink: 0 }} />

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {roles.map((r) => {
                const cfg = ROLE_CONFIG[r];
                const isActive = role === r;
                return (
                  <button key={r} onClick={() => setRole(r)} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, padding: "8px 14px", borderRadius: 10, border: "1px solid", borderColor: isActive ? (cfg?.color || "#10B981") : "#1E293B", background: isActive ? (cfg ? cfg.bg : "rgba(16,185,129,0.12)") : "transparent", color: isActive ? (cfg?.color || "#10B981") : "#9CA3AF", cursor: "pointer", transition: "all 0.2s" }}>
                    {cfg ? `${cfg.icon} ` : ""}{roleLabels[r]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 16, padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <p style={{ color: "#FCA5A5", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>{error}</p>
              <button onClick={() => window.location.reload()} style={{ marginLeft: "auto", fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.5)", background: "transparent", color: "#EF4444", cursor: "pointer" }}>Retry</button>
            </div>
          )}

          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {loading
              ? Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)
              : filtered.length === 0
              ? (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "80px 20px" }}>
                  <p style={{ fontSize: 48, marginBottom: 16 }}>🏏</p>
                  <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: "0.05em", color: "#F9FAFB", marginBottom: 8 }}>No Players Found</p>
                  <p style={{ color: "#4B5563", fontSize: 14 }}>Try adjusting your search or filters</p>
                  <button onClick={() => { setSearch(""); setCountry("All"); setRole("All"); }} style={{ marginTop: 20, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, padding: "10px 24px", borderRadius: 10, border: "1px solid #10B981", background: "rgba(16,185,129,0.1)", color: "#10B981", cursor: "pointer" }}>Clear Filters</button>
                </div>
              )
              : filtered.map((player, i) => (
                <PlayerCard key={player.id} player={player} onClick={setSelectedPlayer} index={i} />
              ))}
          </div>

          {/* Stats footer */}
          {!loading && !error && players.length > 0 && (
            <div style={{ marginTop: 40, padding: "18px 24px", background: "#111827", border: "1px solid #1E293B", borderRadius: 16, display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center" }}>
              {[
                { label: "Total Players", value: players.length },
                { label: "Pakistan", value: players.filter((p) => p.country === "Pakistan").length },
                { label: "India", value: players.filter((p) => p.country === "India").length },
                { label: "Batsmen", value: players.filter((p) => p.role === "batsman").length },
                { label: "Bowlers", value: players.filter((p) => p.role === "bowler").length },
                { label: "All-rounders", value: players.filter((p) => p.role === "allrounder").length },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: "#10B981", lineHeight: 1 }}>{value}</p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#4B5563", marginTop: 4 }}>{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedPlayer && <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
    </>
  );
}