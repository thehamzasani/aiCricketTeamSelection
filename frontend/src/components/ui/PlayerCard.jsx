// frontend/src/components/ui/PlayerCard.jsx
import RoleTag from "./RoleTag";
import StatBadge from "./StatBadge";
import ScoreMeter from "./ScoreMeter";

/**
 * PlayerCard component — renders a player with role, stats, and optional selection checkbox.
 *
 * Props:
 *   player       — player object { id, name, role, batting_style, bowling_style }
 *   stats        — stats object { batting_avg, strike_rate, bowling_economy, wickets_total, matches }
 *   score        — numeric score (0–100)
 *   variant      — "compact" (selector mode) | "full" (result display)
 *   selected     — boolean (compact mode)
 *   onToggle     — callback(player_id) when checkbox is clicked
 *   isCaptain    — boolean
 *   isViceCaptain— boolean
 *   isWK         — boolean
 *   battingPos   — number (optional batting position)
 */
export default function PlayerCard({
  player,
  stats = {},
  score = 0,
  variant = "compact",
  selected = false,
  onToggle,
  isCaptain = false,
  isViceCaptain = false,
  isWK = false,
  battingPos = null,
}) {
  if (!player) return null;

  const isAllrounder = player.role === "allrounder";
  const isBowler = player.role === "bowler";

  // Primary stat to display per role
  const primaryStat =
    isAllrounder || isBowler
      ? stats.bowling_economy != null && stats.bowling_economy > 0
        ? { label: "Economy", value: stats.bowling_economy?.toFixed(2) }
        : { label: "Wickets", value: stats.wickets_total ?? "—" }
      : { label: "Avg", value: stats.batting_avg?.toFixed(1) ?? "—" };

  const secondaryStat =
    isAllrounder || isBowler
      ? { label: "SR", value: stats.strike_rate?.toFixed(1) ?? "—" }
      : { label: "SR", value: stats.strike_rate?.toFixed(1) ?? "—" };

  if (variant === "compact") {
    return (
      <div
        className={`relative group cursor-pointer rounded-2xl border transition-all duration-200
          ${
            selected
              ? "bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10"
              : "bg-[#111827] border-[#1E293B] hover:border-[#334155]"
          }`}
        onClick={() => onToggle && onToggle(player.id)}
      >
        {/* Checkbox */}
        <div className="absolute top-3 right-3 z-10">
          <div
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200
              ${selected ? "bg-emerald-500 border-emerald-500" : "border-[#4B5563] bg-[#0A0F1E]"}`}
          >
            {selected && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>

        <div className="p-4">
          <div className="mb-2">
            <RoleTag role={player.role} />
          </div>
          <h3
            className="text-white text-sm font-semibold mb-3 pr-6 leading-tight"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {player.name}
          </h3>
          <div className="flex items-center justify-between">
            <StatBadge label={primaryStat.label} value={primaryStat.value} />
            <span
              className="text-emerald-400 text-xs font-bold"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {score > 0 ? score.toFixed(1) : "—"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div className="relative bg-[#111827] border border-[#1E293B] rounded-2xl p-5 hover:border-emerald-500/30 transition-all duration-200">
      {/* Badges */}
      <div className="absolute top-3 right-3 flex gap-1.5">
        {isCaptain && (
          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold">
            C
          </span>
        )}
        {isViceCaptain && (
          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
            VC
          </span>
        )}
        {isWK && (
          <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold">
            WK
          </span>
        )}
      </div>

      {/* Batting position */}
      {battingPos && (
        <div
          className="absolute top-3 left-3 w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-xs font-bold"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {battingPos}
        </div>
      )}

      <div className={battingPos ? "pt-6" : ""}>
        <div className="mb-2">
          <RoleTag role={player.role} />
        </div>

        <h3
          className="text-white font-semibold text-base mb-1 leading-tight"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {player.name}
        </h3>
        <p
          className="text-[#4B5563] text-xs mb-3"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {player.batting_style || "—"} &middot;{" "}
          {player.bowling_style || "No bowling"}
        </p>

        <div className="flex gap-3 mb-4">
          <StatBadge label={primaryStat.label} value={primaryStat.value} />
          <StatBadge label={secondaryStat.label} value={secondaryStat.value} />
          {stats.matches != null && (
            <StatBadge label="Mat" value={stats.matches} />
          )}
        </div>

        <ScoreMeter score={score} />
      </div>
    </div>
  );
}