import { useNavigate } from "react-router-dom";
import BattingOrder from "./BattingOrder";
import BowlingPlan from "./BowlingPlan";
import AIAnalysis from "./AIAnalysis";

/**
 * Maps pitch type strings to display labels and icons.
 */
const PITCH_LABELS = {
  spin: { label: "Spin", icon: "🌀" },
  pace: { label: "Pace", icon: "⚡" },
  flat: { label: "Flat", icon: "📏" },
  balanced: { label: "Balanced", icon: "⚖️" },
};

/**
 * Maps weather strings to display labels and icons.
 */
const WEATHER_LABELS = {
  clear: { label: "Clear", icon: "☀️" },
  overcast: { label: "Overcast", icon: "☁️" },
  humid: { label: "Humid", icon: "💧" },
};

/**
 * ContextBadge — small pill used inside the match context bar.
 */
function ContextBadge({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2 bg-[#0A0F1E] border border-[#1E293B] rounded-xl px-3 py-2">
      <span className="text-sm">{icon}</span>
      <div>
        <p className="text-[10px] text-[#4B5563] font-['DM_Sans'] uppercase tracking-widest leading-none">
          {label}
        </p>
        <p className="text-sm text-[#F9FAFB] font-['DM_Sans'] font-medium leading-tight mt-0.5">
          {value}
        </p>
      </div>
    </div>
  );
}

/**
 * Computes team balance from selected_xi array.
 * Used as fallback when team_balance is not returned by the API (e.g. history endpoint).
 */
function computeTeamBalance(players = []) {
  return {
    batsmen: players.filter((p) => p.role === "batsman").length,
    allrounders: players.filter((p) => p.role === "allrounder").length,
    bowlers: players.filter((p) => p.role === "bowler").length,
    wicketkeeper: players.filter((p) => p.role === "wicketkeeper").length,
  };
}

/**
 * TeamResultDashboard — main container for the selection result.
 * Renders the match context bar, team balance summary, and all 4 result sections.
 */
export default function TeamResultDashboard({ selection }) {
  const navigate = useNavigate();

  const {
    selected_xi = [],
    batting_order = [],
    bowling_combination = [],
    captain,
    vice_captain,
    ai_analysis,
    ai_strategy,
    format,
    team_name,
    opposition,
    venue,
    pitch_type,
    weather,
    toss_decision,
    created_at,
  } = selection;

  // ── Support both fresh generate (selection_id) and history (id) ──────────
  const selectionId = selection.selection_id ?? selection.id ?? "—";

  // ── Compute team_balance from XI if API didn't return it ─────────────────
  const team_balance =
    selection.team_balance && Object.keys(selection.team_balance).length > 0
      ? selection.team_balance
      : computeTeamBalance(selected_xi);

  // ── Captain: support both object form and player_id lookup ───────────────
  const resolvedCaptain =
    captain ??
    selected_xi.find((p) => p.is_captain) ??
    null;

  const resolvedViceCaptain =
    vice_captain ??
    selected_xi.find((p) => p.is_vice_captain) ??
    null;

  const pitchInfo = PITCH_LABELS[pitch_type] || { label: pitch_type || "—", icon: "🏏" };
  const weatherInfo = WEATHER_LABELS[weather] || { label: weather || "—", icon: "🌤️" };

  const formattedDate = created_at
    ? new Date(created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  // ── Batting order: prefer batting_order, fall back to selected_xi sorted ──
  const displayBattingOrder =
    batting_order.length > 0
      ? [...batting_order].sort(
          (a, b) => (a.batting_position ?? 99) - (b.batting_position ?? 99)
        )
      : [...selected_xi].sort(
          (a, b) => (a.batting_position ?? 99) - (b.batting_position ?? 99)
        );

  // ── Bowling combination: prefer bowling_combination, fall back to XI ──────
  const displayBowlers =
    bowling_combination.length > 0
      ? bowling_combination
      : selected_xi.filter(
          (p) => p.role === "bowler" || p.role === "allrounder"
        );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

      {/* ── Header ── */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-[#10B981] text-xs font-['DM_Sans'] uppercase tracking-widest mb-1">
            AI SELECTION #{selectionId}
          </p>
          <h1 className="text-4xl md:text-5xl font-['Bebas_Neue'] tracking-wide text-[#F9FAFB]">
            {team_name || "—"}{" "}
            <span className="text-[#4B5563]">VS</span>{" "}
            {opposition || "—"}
          </h1>
          <p className="text-[#9CA3AF] font-['DM_Sans'] text-sm mt-1">
            {formattedDate}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/select")}
            className="border border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 font-bold font-['DM_Sans'] px-4 py-2 rounded-xl transition-colors text-sm"
          >
            Generate New
          </button>
          <button
            onClick={() => navigate("/history")}
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold font-['DM_Sans'] px-4 py-2 rounded-xl transition-colors text-sm"
          >
            View History
          </button>
        </div>
      </div>

      {/* ── Match Context Bar ── */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-4 md:p-6 mb-8">
        <div className="flex flex-wrap gap-3">
          <ContextBadge icon="🏆" label="Format" value={format || "—"} />
          <ContextBadge icon="📍" label="Venue" value={venue?.name || "—"} />
          <ContextBadge icon={pitchInfo.icon} label="Pitch" value={pitchInfo.label} />
          <ContextBadge icon={weatherInfo.icon} label="Weather" value={weatherInfo.label} />
          <ContextBadge
            icon="🪙"
            label="Toss"
            value={
              team_name && toss_decision
                ? `${team_name} — ${toss_decision === "bat" ? "Batting" : "Bowling"}`
                : "—"
            }
          />
        </div>
      </div>

      {/* ── Team Balance Pills ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Batsmen",      value: team_balance.batsmen,      color: "emerald" },
          { label: "All-Rounders", value: team_balance.allrounders,  color: "amber"   },
          { label: "Bowlers",      value: team_balance.bowlers,      color: "blue"    },
          { label: "Wicketkeeper", value: team_balance.wicketkeeper, color: "purple"  },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-[#111827] border border-[#1E293B] rounded-2xl p-4 text-center"
          >
            <p
              className={`font-['JetBrains_Mono'] text-3xl font-bold ${
                color === "emerald" ? "text-emerald-400"
                : color === "amber"   ? "text-amber-400"
                : color === "blue"    ? "text-blue-400"
                :                       "text-purple-400"
              }`}
            >
              {/* Show 0 explicitly, only fallback to — if truly undefined */}
              {value ?? "—"}
            </p>
            <p className="text-[#9CA3AF] font-['DM_Sans'] text-xs mt-1 uppercase tracking-wider">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* ── 4-Section Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          <BattingOrder
            battingOrder={displayBattingOrder}
            captain={resolvedCaptain}
            viceCaptain={resolvedViceCaptain}
          />
          <BowlingPlan
            bowlers={displayBowlers}
            format={format}
          />
        </div>
        {/* Right column */}
        <div>
          <AIAnalysis
            analysis={ai_analysis}
            strategy={ai_strategy}
            captain={resolvedCaptain}
            format={format}
          />
        </div>
      </div>

    </div>
  );
}