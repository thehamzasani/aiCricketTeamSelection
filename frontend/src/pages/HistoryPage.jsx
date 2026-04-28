import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import LoadingSpinner from "../components/ui/LoadingSpinner";

// ─────────────────────────────────────────────
// Skeleton card shown while data loads
// ─────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 flex flex-col gap-4 animate-pulse">
      <div className="h-6 w-2/3 bg-[#1E293B] rounded-md" />
      <hr className="border-[#1E293B]" />
      <div className="h-3 w-1/2 bg-[#1E293B] rounded" />
      <div className="h-3 w-2/5 bg-[#1E293B] rounded" />
      <div className="h-3 w-1/2 bg-[#1E293B] rounded" />
      <div className="h-9 w-full bg-[#1E293B] rounded-xl mt-1" />
    </div>
  );
}

// ─────────────────────────────────────────────
// Format badge colour mapping
// ─────────────────────────────────────────────
const FORMAT_STYLES = {
  T20: "bg-emerald-500 text-white",
  ODI: "bg-amber-400 text-[#111827]",
  Test: "bg-indigo-500 text-white",
};

// ─────────────────────────────────────────────
// Single history card
// ─────────────────────────────────────────────
function HistoryCard({ selection, onClick }) {
  const { id, team_name, opposition, format, venue, captain, created_at } =
    selection;

  const formattedDate = new Date(created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const captainName =
    captain?.name ?? selection.captain_name ?? "—";

  return (
    <article
      className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 flex flex-col gap-4
                 transition-all duration-200 hover:border-emerald-500 hover:-translate-y-0.5 cursor-pointer"
      onClick={onClick}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-['Bebas_Neue'] text-2xl text-white tracking-wide leading-tight">
            {team_name}
            <span className="text-[#9CA3AF] text-lg mx-2">vs</span>
            {opposition}
          </h3>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wider flex-shrink-0 ${
            FORMAT_STYLES[format] ?? "bg-[#1E293B] text-[#9CA3AF]"
          }`}
        >
          {format}
        </span>
      </div>

      <hr className="border-[#1E293B]" />

      {/* Meta info */}
      <div className="flex flex-col gap-2">
        {/* Date */}
        <div className="flex items-center gap-2 text-sm text-[#9CA3AF]">
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="none"
            viewBox="0 0 16 16"
          >
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
            <path
              d="M8 4.5v3.75l2.25 1.75"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
          <span>{formattedDate}</span>
        </div>

        {/* Venue */}
        <div className="flex items-center gap-2 text-sm text-[#9CA3AF]">
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="none"
            viewBox="0 0 16 16"
          >
            <path
              d="M8 1.5C5.24 1.5 3 3.74 3 6.5c0 4 5 9 5 9s5-5 5-9c0-2.76-2.24-5-5-5z"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <circle cx="8" cy="6.5" r="1.75" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <span className="text-white font-medium">{venue?.name ?? venue ?? "—"}</span>
        </div>

        {/* Captain */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
          <span className="text-xs text-[#9CA3AF]">Captain:</span>
          <span className="text-sm font-semibold text-amber-400">{captainName}</span>
        </div>
      </div>

      {/* CTA button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="mt-1 w-full py-2.5 rounded-xl border border-emerald-500 text-emerald-400
                   text-sm font-bold hover:bg-emerald-500 hover:text-white
                   transition-all duration-200 tracking-wide"
      >
        View Full Selection →
      </button>
    </article>
  );
}

// ─────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────
function EmptyState({ hasFilters, onClear }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-5">
      <svg
        className="w-20 h-20 text-[#1E293B]"
        fill="none"
        viewBox="0 0 80 80"
      >
        <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="2" />
        <circle cx="40" cy="40" r="12" stroke="#4B5563" strokeWidth="1.5" />
        <path
          d="M32 32l16 16M48 32L32 48"
          stroke="#4B5563"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <div>
        <h2 className="font-['Bebas_Neue'] text-3xl text-[#4B5563] tracking-wide">
          {hasFilters ? "No Matches Found" : "No Selections Yet"}
        </h2>
        <p className="text-sm text-[#4B5563] mt-2 max-w-xs mx-auto">
          {hasFilters
            ? "No past selections match your filters. Try adjusting them."
            : "You haven't generated any team selections yet. Start by setting up a match."}
        </p>
      </div>
      {hasFilters ? (
        <button
          onClick={onClear}
          className="px-6 py-2.5 border border-emerald-500 text-emerald-400 rounded-xl
                     text-sm font-bold hover:bg-emerald-500 hover:text-white transition-all"
        >
          Clear Filters
        </button>
      ) : (
        <button
          onClick={() => navigate("/select")}
          className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl
                     text-sm font-bold transition-all"
        >
          Generate Team XI
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main HistoryPage component
// ─────────────────────────────────────────────
export default function HistoryPage() {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────
  const [selections, setSelections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [activeFormat, setActiveFormat] = useState("All");
  const [teamFilter, setTeamFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // ── Fetch history ───────────────────────────
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getHistory(); // GET /api/history
        setSelections(data);
      } catch (err) {
        setError("Failed to load selection history. Please try again.");
        console.error("History fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // ── Derive unique teams from data ───────────
  const uniqueTeams = useMemo(() => {
    const teams = new Set();
    selections.forEach((s) => {
      if (s.team_name) teams.add(s.team_name);
      if (s.opposition) teams.add(s.opposition);
    });
    return [...teams].sort();
  }, [selections]);

  // ── Apply filters ───────────────────────────
  const filtered = useMemo(() => {
    return selections.filter((s) => {
      if (activeFormat !== "All" && s.format !== activeFormat) return false;
      if (
        teamFilter &&
        s.team_name !== teamFilter &&
        s.opposition !== teamFilter
      )
        return false;
      const dateStr = s.created_at?.split("T")[0] ?? "";
      if (dateFrom && dateStr < dateFrom) return false;
      if (dateTo && dateStr > dateTo) return false;
      return true;
    });
  }, [selections, activeFormat, teamFilter, dateFrom, dateTo]);

  const hasActiveFilters =
    activeFormat !== "All" || teamFilter || dateFrom || dateTo;

  // ── Clear all filters ───────────────────────
  const clearFilters = () => {
    setActiveFormat("All");
    setTeamFilter("");
    setDateFrom("");
    setDateTo("");
  };

  // ── Render ──────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0F1E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">

        {/* Page title */}
        <div className="mb-8">
          <h1 className="font-['Bebas_Neue'] text-4xl md:text-5xl text-white tracking-wide">
            Selection History
          </h1>
          <p className="text-[#9CA3AF] mt-1 text-sm">
            Browse and revisit all past AI-generated team selections
          </p>
        </div>

        {/* ── Filter bar ─────────────────────────── */}
        <div className="flex flex-wrap gap-3 items-center mb-8">

          {/* Format tabs */}
          <div className="flex gap-1 bg-[#111827] border border-[#1E293B] rounded-xl p-1">
            {["All", "T20", "ODI", "Test"].map((f) => (
              <button
                key={f}
                onClick={() => setActiveFormat(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-150
                  ${
                    activeFormat === f
                      ? "bg-emerald-500 text-white"
                      : "text-[#9CA3AF] hover:text-white"
                  }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Team filter */}
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="bg-[#0A0F1E] border border-[#1E293B] text-white rounded-xl px-3 py-2
                       text-sm focus:border-emerald-500 outline-none cursor-pointer"
          >
            <option value="">All Teams</option>
            {uniqueTeams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              title="From date"
              className="bg-[#0A0F1E] border border-[#1E293B] text-[#9CA3AF] rounded-xl
                         px-3 py-2 text-sm focus:border-emerald-500 outline-none"
            />
            <span className="text-[#4B5563] text-sm">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              title="To date"
              className="bg-[#0A0F1E] border border-[#1E293B] text-[#9CA3AF] rounded-xl
                         px-3 py-2 text-sm focus:border-emerald-500 outline-none"
            />
          </div>

          {/* Result count */}
          <div className="ml-auto text-sm text-[#9CA3AF] font-mono">
            <span className="text-emerald-400 font-bold">{filtered.length}</span>{" "}
            selection{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* ── Error state ────────────────────────── */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 mb-8 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ── Loading skeletons ─────────────────── */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* ── Empty state ───────────────────────── */}
        {!loading && !error && filtered.length === 0 && (
          <EmptyState hasFilters={hasActiveFilters} onClear={clearFilters} />
        )}

        {/* ── Cards grid ───────────────────────── */}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s) => (
              <HistoryCard
                key={s.id}
                selection={s}
                onClick={() => navigate(`/result/${s.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}