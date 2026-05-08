import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { historyAPI } from "../services/api";

/* ═══════════════════════════════════════════════════════════════
   ANIMATION KEYFRAMES — injected once into <head>
═══════════════════════════════════════════════════════════════ */
const GLOBAL_STYLES = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(32px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes livePulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(0.85); }
  }
  @keyframes floatA {
    0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
    33%       { transform: translateY(-18px) translateX(8px) rotate(120deg); }
    66%       { transform: translateY(8px) translateX(-12px) rotate(240deg); }
  }
  @keyframes floatB {
    0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
    40%       { transform: translateY(14px) translateX(-10px) rotate(-90deg); }
    80%       { transform: translateY(-10px) translateX(14px) rotate(180deg); }
  }
  @keyframes floatC {
    0%, 100% { transform: translateY(0px) scale(1); }
    50%       { transform: translateY(-22px) scale(1.08); }
  }
  @keyframes glowPulse {
    0%, 100% { opacity: 0.4; }
    50%       { opacity: 0.8; }
  }
  @keyframes scanline {
    0%   { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }
  @keyframes borderGlow {
    0%, 100% { border-color: rgba(16,185,129,0.2); box-shadow: 0 0 0 0 rgba(16,185,129,0); }
    50%       { border-color: rgba(16,185,129,0.6); box-shadow: 0 0 20px 2px rgba(16,185,129,0.15); }
  }
  @keyframes countUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes rotateOrbit {
    from { transform: rotate(0deg) translateX(120px) rotate(0deg); }
    to   { transform: rotate(360deg) translateX(120px) rotate(-360deg); }
  }
  @keyframes cardEntrance {
    from { opacity: 0; transform: translateY(40px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes typewriter {
    from { width: 0; }
    to   { width: 100%; }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-24px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(24px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes drawLine {
    from { width: 0; }
    to   { width: 100%; }
  }
  @keyframes orbitRing {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  .animate-fade-up        { animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) both; }
  .animate-fade-in        { animation: fadeIn 0.6s ease both; }
  .animate-card-entrance  { animation: cardEntrance 0.7s cubic-bezier(0.22,1,0.36,1) both; }
  .animate-slide-left     { animation: slideInLeft 0.6s cubic-bezier(0.22,1,0.36,1) both; }
  .animate-slide-right    { animation: slideInRight 0.6s cubic-bezier(0.22,1,0.36,1) both; }

  .delay-0   { animation-delay: 0ms; }
  .delay-100 { animation-delay: 100ms; }
  .delay-200 { animation-delay: 200ms; }
  .delay-300 { animation-delay: 300ms; }
  .delay-400 { animation-delay: 400ms; }
  .delay-500 { animation-delay: 500ms; }
  .delay-600 { animation-delay: 600ms; }
  .delay-700 { animation-delay: 700ms; }
  .delay-800 { animation-delay: 800ms; }
  .delay-900 { animation-delay: 900ms; }
  .delay-1000{ animation-delay: 1000ms; }
  .delay-1100{ animation-delay: 1100ms; }
  .delay-1200{ animation-delay: 1200ms; }

  .shimmer-text {
    background: linear-gradient(90deg, #10B981 0%, #34d399 30%, #6ee7b7 50%, #34d399 70%, #10B981 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 3s linear infinite;
  }

  .feature-card:hover .feature-card-inner {
    transform: translateY(-6px);
    border-color: rgba(16,185,129,0.4);
    box-shadow: 0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(16,185,129,0.15);
  }
  .feature-card-inner {
    transition: transform 0.35s cubic-bezier(0.22,1,0.36,1),
                border-color 0.35s ease,
                box-shadow 0.35s ease;
  }
  .selection-card-hover:hover {
    border-color: rgba(16,185,129,0.5) !important;
    transform: translateY(-4px);
    box-shadow: 0 20px 50px rgba(0,0,0,0.5), 0 0 20px rgba(16,185,129,0.08);
  }
  .selection-card-hover {
    transition: transform 0.3s cubic-bezier(0.22,1,0.36,1),
                border-color 0.3s ease,
                box-shadow 0.3s ease;
  }
  .cta-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 40px rgba(16,185,129,0.35);
  }
  .cta-primary {
    transition: transform 0.25s ease, box-shadow 0.25s ease, background-color 0.2s ease;
  }
  .cta-secondary:hover {
    background: rgba(16,185,129,0.1);
    transform: translateY(-2px);
  }
  .cta-secondary {
    transition: transform 0.25s ease, background 0.2s ease;
  }
`;

/* ═══════════════════════════════════════════════════════════════
   FLOATING PARTICLES BACKGROUND
═══════════════════════════════════════════════════════════════ */
const PARTICLES = [
  { top: "12%", left: "8%",  size: 6,  opacity: 0.35, anim: "floatA 7s ease-in-out infinite", delay: "0s" },
  { top: "20%", left: "88%", size: 8,  opacity: 0.25, anim: "floatB 9s ease-in-out infinite", delay: "1s" },
  { top: "45%", left: "5%",  size: 4,  opacity: 0.4,  anim: "floatC 6s ease-in-out infinite", delay: "2s" },
  { top: "65%", left: "92%", size: 5,  opacity: 0.3,  anim: "floatA 8s ease-in-out infinite", delay: "0.5s" },
  { top: "78%", left: "15%", size: 7,  opacity: 0.2,  anim: "floatB 10s ease-in-out infinite", delay: "3s" },
  { top: "30%", left: "75%", size: 5,  opacity: 0.3,  anim: "floatC 7.5s ease-in-out infinite", delay: "1.5s" },
  { top: "55%", left: "50%", size: 3,  opacity: 0.2,  anim: "floatA 11s ease-in-out infinite", delay: "4s" },
  { top: "88%", left: "70%", size: 6,  opacity: 0.25, anim: "floatB 8.5s ease-in-out infinite", delay: "2.5s" },
];

function FloatingParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: "#10B981",
            opacity: p.opacity,
            animation: p.anim,
            animationDelay: p.delay,
          }}
        />
      ))}
      {/* Larger glow orbs */}
      <div style={{
        position: "absolute", top: "20%", right: "8%",
        width: 340, height: 340, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)",
        animation: "glowPulse 4s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", bottom: "15%", left: "5%",
        width: 260, height: 260, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)",
        animation: "glowPulse 6s ease-in-out infinite",
        animationDelay: "2s",
      }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ANIMATED CRICKET BALL — center hero visual
═══════════════════════════════════════════════════════════════ */
function HeroBallVisual() {
  return (
    <div style={{ position: "relative", width: 220, height: 220, margin: "0 auto 40px" }}>
      {/* Outer orbit ring */}
      <div style={{
        position: "absolute", inset: -24,
        border: "1px solid rgba(16,185,129,0.15)",
        borderRadius: "50%",
        animation: "orbitRing 12s linear infinite",
      }}>
        <div style={{
          position: "absolute", top: -5, left: "50%", transform: "translateX(-50%)",
          width: 10, height: 10, borderRadius: "50%",
          background: "#10B981", boxShadow: "0 0 12px #10B981",
        }} />
      </div>
      {/* Middle orbit ring */}
      <div style={{
        position: "absolute", inset: -6,
        border: "1px dashed rgba(16,185,129,0.1)",
        borderRadius: "50%",
        animation: "orbitRing 20s linear infinite reverse",
      }} />
      {/* Glow behind ball */}
      <div style={{
        position: "absolute", inset: 20,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)",
        animation: "glowPulse 3s ease-in-out infinite",
      }} />
      {/* Cricket Ball SVG */}
      <svg viewBox="0 0 220 220" width="220" height="220" style={{ animation: "floatC 5s ease-in-out infinite" }}>
        {/* Shadow */}
        <ellipse cx="110" cy="205" rx="55" ry="8" fill="rgba(0,0,0,0.3)" />
        {/* Ball body */}
        <circle cx="110" cy="104" r="80" fill="#C41E3A" />
        <circle cx="110" cy="104" r="80" fill="url(#ballGrad)" />
        {/* Seam vertical */}
        <path d="M110 24 C100 44 96 74 96 104 C96 134 100 164 110 184"
              stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M110 24 C120 44 124 74 124 104 C124 134 120 164 110 184"
              stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* Seam horizontal */}
        <path d="M30 104 C50 94 80 90 110 90 C140 90 170 94 190 104"
              stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M30 104 C50 114 80 118 110 118 C140 118 170 114 190 104"
              stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* Seam stitches */}
        {[68, 78, 88, 98].map((y, i) => (
          <g key={i}>
            <line x1="102" y1={y} x2="98" y2={y + 4} stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
            <line x1="118" y1={y} x2="122" y2={y + 4} stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
          </g>
        ))}
        {/* Shine */}
        <ellipse cx="88" cy="72" rx="16" ry="10" fill="rgba(255,255,255,0.12)" transform="rotate(-30 88 72)" />
        <defs>
          <radialGradient id="ballGrad" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#E8304A" />
            <stop offset="60%" stopColor="#C41E3A" />
            <stop offset="100%" stopColor="#8B0000" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TYPEWRITER HOOK
═══════════════════════════════════════════════════════════════ */
function useTypewriter(words, speed = 80, pause = 1800) {
  const [display, setDisplay] = useState("");
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = words[wordIdx];
    const timeout = setTimeout(() => {
      if (!deleting) {
        setDisplay(current.slice(0, charIdx + 1));
        if (charIdx + 1 === current.length) {
          setTimeout(() => setDeleting(true), pause);
        } else {
          setCharIdx(c => c + 1);
        }
      } else {
        setDisplay(current.slice(0, charIdx - 1));
        if (charIdx - 1 === 0) {
          setDeleting(false);
          setWordIdx(w => (w + 1) % words.length);
          setCharIdx(0);
        } else {
          setCharIdx(c => c - 1);
        }
      }
    }, deleting ? speed / 2 : speed);
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, wordIdx, words, speed, pause]);

  return display;
}

/* ═══════════════════════════════════════════════════════════════
   COUNTER ANIMATION HOOK
═══════════════════════════════════════════════════════════════ */
function useCountUp(target, duration = 1500, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start || isNaN(target)) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return value;
}

/* ═══════════════════════════════════════════════════════════════
   STAT ITEM WITH COUNT-UP
═══════════════════════════════════════════════════════════════ */
function StatItem({ value, label, delay, visible }) {
  const isNum = !isNaN(parseInt(value));
  const numVal = parseInt(value) || 0;
  const suffix = isNum ? value.replace(/[0-9]/g, "") : "";
  const counted = useCountUp(numVal, 1400, visible);

  return (
    <div
      className="animate-fade-up"
      style={{ animationDelay: delay, animationFillMode: "both", textAlign: "center" }}
    >
      <div style={{
        fontFamily: "'Rajdhani', sans-serif",
        fontSize: "clamp(32px, 4vw, 48px)",
        letterSpacing: "0.06em",
        color: "#10B981",
        textShadow: "0 0 30px rgba(16,185,129,0.4)",
        lineHeight: 1,
      }}>
        {isNum ? `${counted}${suffix}` : value}
      </div>
      <div style={{
        color: "#4B5563",
        fontSize: "11px",
        fontFamily: "'DM Sans', sans-serif",
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        marginTop: "6px",
      }}>
        {label}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FEATURE CARDS DATA
═══════════════════════════════════════════════════════════════ */
const FEATURES = [
  {
    num: "01",
    color: "#10B981",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10" />
        <path d="M22 2 16 8m0 0-6 6m6-6H10m6 0V2" />
      </svg>
    ),
    title: "AI Powered",
    subtitle: "Google Gemini 1.5 Flash",
    desc: "Leverages Gemini AI to generate deep match analysis, explain every selection, suggest batting orders, allocate bowling overs, and recommend the ideal captain — in natural language.",
    tag: "GEMINI API",
  },
  {
    num: "02",
    color: "#F59E0B",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4M6 7h4M6 11h6M14 11v4M17 9v6M20 7v8" />
      </svg>
    ),
    title: "Data Driven",
    subtitle: "Live stats via CricAPI",
    desc: "Real player statistics fetched from CricAPI — batting averages, strike rates, economy, and recent form — all cached intelligently so decisions are backed by current data.",
    tag: "CRICAPI",
  },
  {
    num: "03",
    color: "#60A5FA",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    title: "Smart Selection",
    subtitle: "Weighted scoring engine",
    desc: "A multi-factor algorithm weighs batting average, strike rate, bowling economy, recent form, pitch conditions, and format requirements to build a perfectly balanced XI.",
    tag: "ALGORITHM",
  },
];

/* ═══════════════════════════════════════════════════════════════
   FORMAT BADGE
═══════════════════════════════════════════════════════════════ */
function FormatBadge({ format }) {
  const map = {
    T20:  { bg: "rgba(16,185,129,0.15)",  color: "#34D399", border: "rgba(16,185,129,0.3)"  },
    ODI:  { bg: "rgba(245,158,11,0.15)",  color: "#FBBF24", border: "rgba(245,158,11,0.3)"  },
    Test: { bg: "rgba(96,165,250,0.15)",  color: "#93C5FD", border: "rgba(96,165,250,0.3)"  },
  };
  const s = map[format] || { bg: "rgba(156,163,175,0.15)", color: "#9CA3AF", border: "rgba(156,163,175,0.3)" };
  return (
    <span style={{
      fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
      padding: "3px 10px", borderRadius: "6px",
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {format}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SKELETON CARD
═══════════════════════════════════════════════════════════════ */
function SkeletonCard() {
  return (
    <div style={{
      background: "#111827", border: "1px solid #1E293B", borderRadius: "16px",
      padding: "24px", animation: "fadeIn 0.5s ease",
    }}>
      {[120, 160, 90, 60].map((w, i) => (
        <div key={i} style={{
          height: i === 0 ? 18 : 13, width: w, borderRadius: 8,
          background: "#1E293B", marginBottom: i === 3 ? 0 : 12,
          animation: "shimmer 1.8s ease infinite",
          backgroundImage: "linear-gradient(90deg, #1E293B 25%, #253347 50%, #1E293B 75%)",
          backgroundSize: "200% 100%",
        }} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RECENT SELECTION CARD
═══════════════════════════════════════════════════════════════ */
function SelectionCard({ selection, index }) {
  const navigate = useNavigate();
  const date = new Date(selection.created_at).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div
      className="selection-card-hover animate-card-entrance"
      style={{
        background: "#111827", border: "1px solid #1E293B", borderRadius: "16px",
        padding: "24px", cursor: "pointer", animationDelay: `${index * 120}ms`,
        animationFillMode: "both", position: "relative", overflow: "hidden",
      }}
      onClick={() => navigate(`/result/${selection.id}`)}
    >
      {/* Top accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "2px",
        background: "linear-gradient(90deg, transparent, #10B981, transparent)",
        opacity: 0.5,
      }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
        <h3 style={{
          fontFamily: "'Rajdhani', sans-serif", fontSize: "20px",
          letterSpacing: "0.05em", color: "#F9FAFB", lineHeight: 1.2,
        }}>
          {selection.team_name}
          <span style={{ color: "#4B5563", margin: "0 6px" }}>vs</span>
          {selection.opposition}
        </h3>
        <FormatBadge format={selection.format} />
      </div>

      {selection.venue_name && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#6B7280", fontSize: "13px", marginBottom: "6px" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
          </svg>
          {selection.venue_name}
        </div>
      )}

      {selection.captain_name && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#6B7280", fontSize: "13px", marginBottom: "16px" }}>
          <span style={{ color: "#F59E0B", fontFamily: "'JetBrains Mono'", fontSize: "11px", fontWeight: 700 }}>C</span>
          {selection.captain_name}
        </div>
      )}

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingTop: "16px", borderTop: "1px solid #1E293B",
      }}>
        <span style={{ fontSize: "12px", color: "#4B5563", fontFamily: "'JetBrains Mono', monospace" }}>{date}</span>
        <button
          style={{
            fontSize: "13px", color: "#10B981", border: "1px solid rgba(16,185,129,0.3)",
            background: "transparent", padding: "6px 16px", borderRadius: "10px",
            fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: "pointer",
            transition: "background 0.2s ease",
          }}
          onMouseEnter={e => e.target.style.background = "rgba(16,185,129,0.1)"}
          onMouseLeave={e => e.target.style.background = "transparent"}
          onClick={e => { e.stopPropagation(); navigate(`/result/${selection.id}`); }}
        >
          View →
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   INTERSECTION OBSERVER HOOK
═══════════════════════════════════════════════════════════════ */
function useInView(threshold = 0.2) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

/* ═══════════════════════════════════════════════════════════════
   STATS DATA
═══════════════════════════════════════════════════════════════ */
const STATS = [
  { value: "30+", label: "Players Profiled" },
  { value: "5",   label: "Venues Configured" },
  { value: "3",   label: "Formats Supported" },
  { value: "AI",  label: "Gemini Powered" },
];

/* ═══════════════════════════════════════════════════════════════
   MAIN HOMEPAGE COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const [recentSelections, setRecentSelections] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const navigate = useNavigate();
  const typeText = useTypewriter(["optimal Playing XI.", "the perfect team.", "match-winning squads.", "data-driven XIs."], 70, 2200);

  const [statsRef, statsInView] = useInView(0.3);
  const [featuresRef, featuresInView] = useInView(0.1);
  const [historyRef, historyInView] = useInView(0.1);

  useEffect(() => {
    (async () => {
      try {
        const data = await historyAPI.getHistory({ limit: 3 });
        setRecentSelections(data || []);
      } catch {
        setHistoryError(true);
      } finally {
        setLoadingHistory(false);
      }
    })();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#0A0F1E", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{GLOBAL_STYLES}</style>

      {/* ══════════════════════════════════════════════════════════
          HERO SECTION — CENTERED
      ══════════════════════════════════════════════════════════ */}
      <section style={{
        position: "relative", overflow: "hidden",
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "linear-gradient(160deg, #0A0F1E 0%, #0D1B2A 45%, #091520 100%)",
        padding: "80px 24px 60px",
      }}>
        {/* Dot grid */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "radial-gradient(rgba(16,185,129,0.10) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }} />

        {/* Scanline sweep */}
        <div style={{
          position: "absolute", left: 0, right: 0, height: "1px",
          background: "linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.15) 50%, transparent 100%)",
          animation: "scanline 8s linear infinite",
          pointerEvents: "none",
        }} />

        <FloatingParticles />

        {/* Centered content */}
        <div style={{ position: "relative", zIndex: 10, textAlign: "center", maxWidth: "820px", width: "100%" }}>

          {/* Badge */}
          {/* <div className="animate-fade-up delay-0" style={{ display: "flex", justifyContent: "center", marginBottom: "32px" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
              borderRadius: "999px", padding: "8px 20px",
              animation: "borderGlow 3s ease-in-out infinite",
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%", background: "#10B981",
                animation: "livePulse 2s ease-in-out infinite",
                boxShadow: "0 0 8px #10B981",
              }} />
              <span style={{
                color: "#34D399", fontSize: "11px", fontWeight: 700,
                letterSpacing: "0.18em", textTransform: "uppercase",
                fontFamily: "'DM Sans', sans-serif",
              }}>
                Final Year Project — AI System
              </span>
            </div>
          </div> */}

          {/* Animated cricket ball */}
          <div className="animate-fade-up delay-100">
            <HeroBallVisual />
          </div>

          {/* Main title */}
          <div className="animate-fade-up delay-200">
            <h1 style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: "clamp(72px, 14vw, 148px)",
              letterSpacing: "0.04em",
              lineHeight: 0.9,
              margin: "0 0 8px",
              color: "#F9FAFB",
            }}>
              Cricket
            </h1>
            <h1 className="shimmer-text" style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: "clamp(72px, 14vw, 148px)",
              letterSpacing: "0.04em",
              lineHeight: 0.9,
              margin: "0 0 32px",
              display: "block",
            }}>
              AI
            </h1>
          </div>

          {/* Typewriter subtitle */}
          <div className="animate-fade-up delay-400" style={{ marginBottom: "12px" }}>
            <p style={{
              fontSize: "clamp(18px, 2.5vw, 24px)",
              color: "#9CA3AF",
              fontWeight: 300,
              letterSpacing: "0.02em",
              lineHeight: 1.4,
              minHeight: "1.5em",
            }}>
              AI that selects{" "}
              <span style={{ color: "#10B981", fontWeight: 600 }}>
                {typeText}
              </span>
              <span style={{ animation: "blink 1s step-end infinite", color: "#10B981" }}>|</span>
            </p>
          </div>

          {/* Description */}
          <div className="animate-fade-up delay-500">
            <p style={{
              fontSize: "14px", color: "#4B5563", lineHeight: 1.8,
              maxWidth: "520px", margin: "0 auto 40px",
            }}>
              Multi-factor scoring algorithm · Live player statistics · Venue intelligence · Google Gemini AI analysis
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="animate-fade-up delay-600" style={{ display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "center", marginBottom: "56px" }}>
            <button
              className="cta-primary"
              onClick={() => navigate("/select")}
              style={{
                display: "inline-flex", alignItems: "center", gap: "10px",
                background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                color: "white", fontWeight: 700, fontSize: "15px",
                padding: "16px 36px", borderRadius: "14px", border: "none",
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                boxShadow: "0 8px 32px rgba(16,185,129,0.25)",
                letterSpacing: "0.02em",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Generate Team XI
            </button>
            <button
              className="cta-secondary"
              onClick={() => navigate("/history")}
              style={{
                display: "inline-flex", alignItems: "center", gap: "10px",
                border: "1px solid rgba(16,185,129,0.4)", color: "#34D399",
                fontWeight: 700, fontSize: "15px", padding: "16px 36px",
                borderRadius: "14px", background: "transparent", cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.02em",
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8v4l3 3" /><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5" />
              </svg>
              View History
            </button>
          </div>

          {/* Stats bar */}
          <div
            ref={statsRef}
            className="animate-fade-up delay-800"
            style={{
              display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
              gap: "0", paddingTop: "32px",
              borderTop: "1px solid rgba(30,41,59,0.8)",
              maxWidth: "560px", margin: "0 auto",
            }}
          >
            {STATS.map((s, i) => (
              <StatItem key={s.label} value={s.value} label={s.label} delay={`${800 + i * 100}ms`} visible={statsInView} />
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="animate-fade-in delay-1200" style={{
          position: "absolute", bottom: "32px", left: "50%", transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
        }}>
          <span style={{ color: "#4B5563", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase" }}>Scroll</span>
          <div style={{ width: 1, height: 32, background: "linear-gradient(to bottom, #10B981, transparent)" }} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FEATURES SECTION
      ══════════════════════════════════════════════════════════ */}
      <section ref={featuresRef} style={{ padding: "100px 24px", background: "#0A0F1E" }}>
        <div style={{ maxWidth: "1120px", margin: "0 auto" }}>

          {/* Section label */}
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <div className={`animate-fade-up ${featuresInView ? "" : "opacity-0"}`} style={{ animationFillMode: "both" }}>
              <span style={{
                display: "inline-block", color: "#10B981", fontSize: "11px", fontWeight: 700,
                letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "16px",
                padding: "6px 16px", background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.15)", borderRadius: "999px",
              }}>
                How It Works
              </span>
            </div>
            <h2
              className={`animate-fade-up delay-100 ${featuresInView ? "" : "opacity-0"}`}
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: "clamp(40px, 6vw, 72px)",
                letterSpacing: "0.04em", color: "#F9FAFB",
                lineHeight: 1, margin: "0 auto",
                animationFillMode: "both",
              }}
            >
              Three Systems.{" "}
              <span style={{ color: "#10B981" }}>One Perfect XI.</span>
            </h2>
          </div>

          {/* Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`feature-card animate-card-entrance delay-${i * 200} ${featuresInView ? "" : "opacity-0"}`}
                style={{ animationFillMode: "both" }}>
                <div className="feature-card-inner" style={{
                  background: "#111827", border: "1px solid #1E293B", borderRadius: "20px",
                  padding: "32px", position: "relative", overflow: "hidden",
                }}>
                  {/* Top accent */}
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: "2px",
                    background: `linear-gradient(90deg, transparent, ${f.color}, transparent)`,
                    opacity: 0.6,
                  }} />

                  {/* Big number bg */}
                  <div style={{
                    position: "absolute", top: 12, right: 20,
                    fontFamily: "'Rajdhani', sans-serif", fontSize: "80px",
                    color: "rgba(30,41,59,0.6)", lineHeight: 1, letterSpacing: "0.05em",
                    userSelect: "none",
                  }}>
                    {f.num}
                  </div>

                  {/* Icon */}
                  <div style={{
                    width: 56, height: 56, borderRadius: "16px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: `rgba(${f.color === "#10B981" ? "16,185,129" : f.color === "#F59E0B" ? "245,158,11" : "96,165,250"},0.08)`,
                    border: `1px solid rgba(${f.color === "#10B981" ? "16,185,129" : f.color === "#F59E0B" ? "245,158,11" : "96,165,250"},0.15)`,
                    marginBottom: "24px",
                  }}>
                    {f.icon}
                  </div>

                  {/* Tag */}
                  <span style={{
                    display: "inline-block", fontSize: "10px", fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700, color: f.color, letterSpacing: "0.15em",
                    marginBottom: "8px", opacity: 0.8,
                  }}>
                    {f.tag}
                  </span>

                  <h3 style={{
                    fontFamily: "'Rajdhani', sans-serif", fontSize: "28px",
                    letterSpacing: "0.05em", color: "#F9FAFB", marginBottom: "4px",
                  }}>
                    {f.title}
                  </h3>
                  <p style={{
                    fontSize: "12px", fontFamily: "'JetBrains Mono', monospace",
                    color: f.color, marginBottom: "16px", opacity: 0.9,
                  }}>
                    {f.subtitle}
                  </p>
                  <p style={{ color: "#6B7280", fontSize: "14px", lineHeight: 1.7 }}>
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Banner */}
          <div
            className={`animate-fade-up delay-600 ${featuresInView ? "" : "opacity-0"}`}
            style={{
              marginTop: "40px", borderRadius: "20px", padding: "36px 40px",
              background: "linear-gradient(135deg, rgba(16,185,129,0.07) 0%, rgba(16,185,129,0.03) 100%)",
              border: "1px solid rgba(16,185,129,0.15)",
              display: "flex", flexWrap: "wrap", alignItems: "center",
              justifyContent: "space-between", gap: "24px",
              animationFillMode: "both",
            }}
          >
            <div>
              <h3 style={{
                fontFamily: "'Rajdhani', sans-serif", fontSize: "32px",
                letterSpacing: "0.05em", color: "#F9FAFB", marginBottom: "6px",
              }}>
                Ready to Select Your XI?
              </h3>
              <p style={{ color: "#6B7280", fontSize: "14px" }}>
                Configure match conditions, pick your squad, and let the AI build the optimal team.
              </p>
            </div>
            <button
              className="cta-primary"
              onClick={() => navigate("/select")}
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                color: "white", fontWeight: 700, fontSize: "14px",
                padding: "14px 32px", borderRadius: "12px", border: "none",
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                whiteSpace: "nowrap",
                boxShadow: "0 8px 24px rgba(16,185,129,0.2)",
              }}
            >
              Start Selection →
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          RECENT SELECTIONS
      ══════════════════════════════════════════════════════════ */}
      <section ref={historyRef} style={{
        padding: "80px 24px 100px",
        background: "linear-gradient(180deg, #0A0F1E 0%, #080C18 100%)",
      }}>
        <div style={{ maxWidth: "1120px", margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "48px", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <span style={{
                display: "inline-block", color: "#10B981", fontSize: "11px", fontWeight: 700,
                letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "12px",
              }}>
                Selection History
              </span>
              <h2 style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: "clamp(36px, 5vw, 56px)",
                letterSpacing: "0.04em", color: "#F9FAFB", lineHeight: 1,
              }}>
                Recent Selections
              </h2>
            </div>
            <Link to="/history" style={{
              color: "#10B981", fontSize: "14px", fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              display: "flex", alignItems: "center", gap: "6px",
              opacity: 0.85, transition: "opacity 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = "1"}
              onMouseLeave={e => e.currentTarget.style.opacity = "0.85"}
            >
              View All →
            </Link>
          </div>

          {/* Content */}
          {loadingHistory ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
              <SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
          ) : historyError ? (
            <div style={{
              background: "#111827", border: "1px solid #1E293B", borderRadius: "16px",
              padding: "64px 24px", textAlign: "center",
            }}>
              <div style={{
                width: 60, height: 60, borderRadius: "50%", margin: "0 auto 16px",
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p style={{ color: "#6B7280", fontSize: "14px" }}>Could not load recent selections. Ensure the backend is running.</p>
            </div>
          ) : recentSelections.length === 0 ? (
            <div style={{
              background: "#111827", border: "1px solid #1E293B", borderRadius: "20px",
              padding: "80px 24px", textAlign: "center",
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: "50%", margin: "0 auto 24px",
                background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="#C41E3A">
                  <circle cx="12" cy="12" r="11" />
                  <path d="M12 1C12 1 8 5 8 12C8 19 12 23 12 23" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  <path d="M12 1C12 1 16 5 16 12C16 19 12 23 12 23" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  <path d="M1 12C1 12 5 9 12 9C19 9 23 12 23 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  <path d="M1 12C1 12 5 15 12 15C19 15 23 12 23 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                </svg>
              </div>
              <h3 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "28px", letterSpacing: "0.05em", color: "#F9FAFB", marginBottom: "10px" }}>
                No Selections Yet
              </h3>
              <p style={{ color: "#6B7280", fontSize: "14px", maxWidth: "380px", margin: "0 auto 32px", lineHeight: 1.7 }}>
                Your AI-generated team selections will appear here. Generate your first XI to get started.
              </p>
              <button
                className="cta-primary"
                onClick={() => navigate("/select")}
                style={{
                  background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                  color: "white", fontWeight: 700, fontSize: "14px",
                  padding: "14px 32px", borderRadius: "12px", border: "none",
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  boxShadow: "0 8px 24px rgba(16,185,129,0.2)",
                }}
              >
                Generate Your First Team
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
              {recentSelections.map((sel, i) => (
                <SelectionCard key={sel.id} selection={sel} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════ */}
      <footer style={{
        padding: "32px 24px",
        borderTop: "1px solid #1E293B",
        background: "#080C18",
        textAlign: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "8px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#C41E3A" opacity="0.5">
            <circle cx="12" cy="12" r="11" />
            <path d="M12 1C12 1 8 5 8 12C8 19 12 23 12 23" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M12 1C12 1 16 5 16 12C16 19 12 23 12 23" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M1 12C1 12 5 9 12 9C19 9 23 12 23 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M1 12C1 12 5 15 12 15C19 15 23 12 23 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </svg>
          <span style={{ color: "#4B5563", fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            CricketAI — Final Year Project · Google Gemini + CricAPI
          </span>
        </div>
      </footer>
    </div>
  );
}