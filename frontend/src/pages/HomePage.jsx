import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {api} from "../services/api";

// ─── Animated Cricket Ball SVG ───────────────────────────────────────────────
function CricketBallIcon({ size = 24, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <circle cx="12" cy="12" r="11" fill="#EF4444" />
      <path
        d="M12 1C12 1 8 5 8 12C8 19 12 23 12 23"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 1C12 1 16 5 16 12C16 19 12 23 12 23"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M1 12C1 12 5 9 12 9C19 9 23 12 23 12"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M1 12C1 12 5 15 12 15C19 15 23 12 23 12"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Feature Card Data ────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#10B981"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2a10 10 0 1 0 10 10" />
        <path d="M12 6v6l4 2" />
        <path d="M22 2 16 8" />
        <path d="m22 8-6-6" />
      </svg>
    ),
    title: "AI Powered",
    subtitle: "Google Gemini 1.5 Flash",
    desc: "Our system leverages Google Gemini AI to generate deep match analysis, explain every selection decision, suggest batting orders, allocate bowling overs, and recommend the ideal captain — all in natural language.",
  },
  {
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#10B981"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
        <path d="M6 7h4M6 11h6M6 15h2" />
        <path d="M14 11v4M17 9v6M20 7v8" />
      </svg>
    ),
    title: "Data Driven",
    subtitle: "Live stats via CricAPI",
    desc: "Real player statistics fetched from CricAPI — batting averages, strike rates, bowling economy, and recent form scores — all cached intelligently so every selection decision is backed by current data.",
  },
  {
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#10B981"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    title: "Smart Selection",
    subtitle: "Weighted scoring algorithm",
    desc: "A multi-factor scoring engine weighs batting average, strike rate, bowling economy, recent form, pitch conditions, and format requirements to select the optimal Playing XI with guaranteed team balance.",
  },
];

// ─── Format Badge ─────────────────────────────────────────────────────────────
function FormatBadge({ format }) {
  const colors = {
    T20: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    ODI: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    Test: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  return (
    <span
      className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
        colors[format] || "bg-gray-500/20 text-gray-400 border-gray-500/30"
      }`}
    >
      {format}
    </span>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-32 bg-[#1E293B] rounded-lg" />
        <div className="h-5 w-12 bg-[#1E293B] rounded-md" />
      </div>
      <div className="h-4 w-48 bg-[#1E293B] rounded mb-2" />
      <div className="h-4 w-36 bg-[#1E293B] rounded mb-6" />
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 bg-[#1E293B] rounded" />
        <div className="h-8 w-20 bg-[#1E293B] rounded-xl" />
      </div>
    </div>
  );
}

// ─── Recent Selection Card ────────────────────────────────────────────────────
function SelectionCard({ selection }) {
  const navigate = useNavigate();
  const date = new Date(selection.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 hover:border-emerald-500/40 transition-all duration-300 group"
      style={{ cursor: "pointer" }}
      onClick={() => navigate(`/result/${selection.id}`)}
    >
      {/* Teams */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-['Bebas_Neue'] text-xl text-white tracking-wide group-hover:text-emerald-400 transition-colors">
          {selection.team_name}{" "}
          <span className="text-[#4B5563]">vs</span>{" "}
          {selection.opposition}
        </h3>
        <FormatBadge format={selection.format} />
      </div>

      {/* Venue */}
      <div className="flex items-center gap-2 text-sm text-[#9CA3AF] mb-1">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        {selection.venue_name || "Venue TBD"}
      </div>

      {/* Captain */}
      {selection.captain_name && (
        <div className="flex items-center gap-2 text-sm text-[#9CA3AF] mb-4">
          <span className="text-amber-400 font-mono text-xs font-bold">C</span>
          {selection.captain_name}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-[#1E293B]">
        <span className="text-xs text-[#4B5563] font-mono">{date}</span>
        <button
          className="text-sm text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/10 px-4 py-1.5 rounded-xl font-['DM_Sans'] font-semibold transition-all duration-200"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/result/${selection.id}`);
          }}
        >
          View →
        </button>
      </div>
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
const STATS = [
  { value: "30+", label: "Players Profiled" },
  { value: "5", label: "Venues Configured" },
  { value: "3", label: "Formats Supported" },
  { value: "AI", label: "Gemini Powered" },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HomePage() {
  const [recentSelections, setRecentSelections] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoadingHistory(true);
        setHistoryError(false);
        const res = await api.get("/api/history?limit=3");
        setRecentSelections(res.data || []);
      } catch (err) {
        console.error("Failed to fetch history:", err);
        setHistoryError(true);
        setRecentSelections([]);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div
      className="min-h-screen font-['DM_Sans']"
      style={{ background: "#0A0F1E" }}
    >
      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0A0F1E 0%, #0D1B2A 50%, #0A1628 100%)",
          minHeight: "92vh",
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* Dot Grid Background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(16,185,129,0.12) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Diagonal accent lines */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                top: `${-20 + i * 25}%`,
                left: "-10%",
                width: "120%",
                height: "1px",
                background:
                  "linear-gradient(90deg, transparent, rgba(16,185,129,0.06), transparent)",
                transform: "rotate(-20deg)",
              }}
            />
          ))}
        </div>

        {/* Glow orb */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "15%",
            right: "10%",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)",
          }}
        />

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="flex items-center gap-3 mb-8">
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                  style={{
                    animation: "pulse 2s infinite",
                  }}
                />
                <span className="text-emerald-400 text-xs font-semibold tracking-widest uppercase font-['DM_Sans']">
                  Final Year Project — AI System
                </span>
              </div>
            </div>

            {/* Main Heading */}
            <h1
              className="font-['Bebas_Neue'] leading-none mb-4"
              style={{
                fontSize: "clamp(72px, 12vw, 140px)",
                letterSpacing: "0.03em",
                color: "#F9FAFB",
              }}
            >
              Cricket
              <span
                style={{
                  display: "block",
                  color: "#10B981",
                  textShadow: "0 0 80px rgba(16,185,129,0.35)",
                }}
              >
                AI
              </span>
            </h1>

            {/* Tagline */}
            <p
              className="text-[#9CA3AF] mb-3 font-['DM_Sans'] font-light"
              style={{ fontSize: "clamp(18px, 2.5vw, 26px)", lineHeight: 1.4 }}
            >
              AI-Powered Team Selection
            </p>
            <p
              className="text-[#4B5563] mb-10 font-['DM_Sans'] max-w-xl"
              style={{ fontSize: "15px", lineHeight: 1.7 }}
            >
              Select your optimal Playing XI using a multi-factor scoring
              algorithm, live player statistics, venue intelligence, and Google
              Gemini AI analysis — in seconds.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 mb-16">
              <button
                onClick={() => navigate("/select")}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8 py-4 rounded-2xl transition-all duration-200 font-['DM_Sans'] text-base shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5"
              >
                <CricketBallIcon size={20} />
                Generate Team XI
              </button>
              <button
                onClick={() => navigate("/history")}
                className="flex items-center gap-2 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 font-bold px-8 py-4 rounded-2xl transition-all duration-200 font-['DM_Sans'] text-base"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 8v4l3 3" />
                  <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5" />
                </svg>
                View History
              </button>
            </div>

            {/* Stats Bar */}
            <div
              className="flex flex-wrap gap-8"
              style={{ borderTop: "1px solid rgba(30,41,59,0.8)", paddingTop: "32px" }}
            >
              {STATS.map((s) => (
                <div key={s.label}>
                  <div
                    className="font-['Bebas_Neue'] text-emerald-400"
                    style={{ fontSize: "28px", letterSpacing: "0.05em" }}
                  >
                    {s.value}
                  </div>
                  <div className="text-[#4B5563] text-xs font-['DM_Sans'] uppercase tracking-widest">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: "120px",
            background: "linear-gradient(to bottom, transparent, #0A0F1E)",
          }}
        />
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28" style={{ background: "#0A0F1E" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="mb-14 max-w-xl">
            <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-3 font-['DM_Sans']">
              How It Works
            </p>
            <h2
              className="font-['Bebas_Neue'] text-white"
              style={{ fontSize: "clamp(36px, 5vw, 56px)", letterSpacing: "0.03em" }}
            >
              Three Systems.{" "}
              <span className="text-emerald-400">One Perfect XI.</span>
            </h2>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className="bg-[#111827] border border-[#1E293B] rounded-2xl p-8 hover:border-emerald-500/30 transition-all duration-300 group relative overflow-hidden"
              >
                {/* Card number */}
                <div
                  className="absolute top-6 right-6 font-['Bebas_Neue'] text-[#1E293B] group-hover:text-[#2D3F55] transition-colors"
                  style={{ fontSize: "64px", lineHeight: 1, letterSpacing: "0.03em" }}
                >
                  0{i + 1}
                </div>

                {/* Icon */}
                <div className="mb-6 relative z-10">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}
                  >
                    {feature.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="relative z-10">
                  <h3
                    className="font-['Bebas_Neue'] text-white mb-1 group-hover:text-emerald-400 transition-colors"
                    style={{ fontSize: "26px", letterSpacing: "0.05em" }}
                  >
                    {feature.title}
                  </h3>
                  <p className="text-emerald-500 text-xs font-mono mb-4 font-semibold">
                    {feature.subtitle}
                  </p>
                  <p className="text-[#9CA3AF] text-sm leading-relaxed font-['DM_Sans']">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA in features */}
          <div
            className="mt-12 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6"
            style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}
          >
            <div>
              <h3
                className="font-['Bebas_Neue'] text-white mb-1"
                style={{ fontSize: "28px", letterSpacing: "0.05em" }}
              >
                Ready to Select Your XI?
              </h3>
              <p className="text-[#9CA3AF] text-sm font-['DM_Sans']">
                Configure match conditions, pick your squad, and let the AI build the optimal team.
              </p>
            </div>
            <button
              onClick={() => navigate("/select")}
              className="flex-shrink-0 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8 py-4 rounded-2xl transition-all duration-200 font-['DM_Sans'] text-sm shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5"
            >
              Start Selection →
            </button>
          </div>
        </div>
      </section>

      {/* ── RECENT SELECTIONS ─────────────────────────────────────────────────── */}
      <section
        className="py-20 md:py-24"
        style={{ background: "linear-gradient(180deg, #0A0F1E 0%, #080D19 100%)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-3 font-['DM_Sans']">
                Selection History
              </p>
              <h2
                className="font-['Bebas_Neue'] text-white"
                style={{ fontSize: "clamp(32px, 4vw, 48px)", letterSpacing: "0.03em" }}
              >
                Recent Selections
              </h2>
            </div>
            <Link
              to="/history"
              className="text-sm text-emerald-400 hover:text-emerald-300 font-['DM_Sans'] font-semibold transition-colors hidden sm:block"
            >
              View All →
            </Link>
          </div>

          {/* Cards Grid */}
          {loadingHistory ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : historyError ? (
            <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p className="text-[#9CA3AF] font-['DM_Sans'] text-sm">
                Could not load recent selections. Ensure the backend is running.
              </p>
            </div>
          ) : recentSelections.length === 0 ? (
            <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-16 text-center">
              {/* Empty state illustration */}
              <div className="flex justify-center mb-6">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)" }}
                >
                  <CricketBallIcon size={36} />
                </div>
              </div>
              <h3
                className="font-['Bebas_Neue'] text-white mb-2"
                style={{ fontSize: "26px", letterSpacing: "0.05em" }}
              >
                No Selections Yet
              </h3>
              <p className="text-[#9CA3AF] text-sm font-['DM_Sans'] mb-8 max-w-sm mx-auto">
                Your AI-generated team selections will appear here. Generate your first XI to get started.
              </p>
              <button
                onClick={() => navigate("/select")}
                className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8 py-3 rounded-xl transition-all duration-200 font-['DM_Sans'] text-sm"
              >
                Generate Your First Team
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {recentSelections.map((sel) => (
                  <SelectionCard key={sel.id} selection={sel} />
                ))}
              </div>
              <div className="flex justify-center mt-8 sm:hidden">
                <Link
                  to="/history"
                  className="text-sm text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 px-6 py-2.5 rounded-xl font-['DM_Sans'] font-semibold transition-all duration-200"
                >
                  View All History →
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── FOOTER SPACER / BOTTOM CTA ─────────────────────────────────────── */}
      <section
        className="py-16 border-t"
        style={{ borderColor: "#1E293B", background: "#080D19" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <CricketBallIcon size={32} className="mx-auto mb-4 opacity-60" />
          <p className="text-[#4B5563] text-xs font-mono tracking-widest uppercase">
            CricketAI — Final Year Project · Powered by Google Gemini + CricAPI
          </p>
        </div>
      </section>

      {/* Pulse animation for live dot */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}