/**
 * Returns the maximum overs allowed per bowler based on format.
 */
function getMaxOversPerBowler(format) {
  if (format === "T20") return 4;
  if (format === "ODI") return 10;
  return 30; // Test — no hard limit, show relative
}

/**
 * Returns the total overs in the innings based on format.
 */
function getTotalOvers(format) {
  if (format === "T20") return 20;
  if (format === "ODI") return 50;
  return 90;
}

/**
 * BowlerRow — a single bowler entry with an animated over allocation bar.
 */
function BowlerRow({ bowler, maxOvers, totalOvers, index }) {
  const overs = bowler.overs_allocated ?? maxOvers;
  const economy = bowler.bowling_economy ?? null;
  const pct = Math.min((overs / totalOvers) * 100, 100);

  const barColors = [
    "bg-emerald-500",
    "bg-amber-500",
    "bg-blue-500",
    "bg-purple-500",
    "bg-rose-500",
  ];
  const barColor = barColors[index % barColors.length];

  return (
    <div className="py-3 border-b border-[#1E293B] last:border-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-['DM_Sans'] font-medium text-[#F9FAFB] text-sm">
            {bowler.name}
          </span>
          {bowler.bowling_style && (
            <span className="text-[10px] text-[#4B5563] font-['DM_Sans'] uppercase tracking-wider hidden sm:inline">
              {bowler.bowling_style}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {economy != null && (
            <div className="text-right">
              <p className="font-['JetBrains_Mono'] text-xs text-[#9CA3AF]">
                {Number(economy).toFixed(2)}
              </p>
              <p className="text-[10px] text-[#4B5563] font-['DM_Sans'] uppercase tracking-wider">
                Econ
              </p>
            </div>
          )}
          <div className="text-right">
            <p className="font-['JetBrains_Mono'] text-sm font-bold text-[#F9FAFB]">
              {overs}
            </p>
            <p className="text-[10px] text-[#4B5563] font-['DM_Sans'] uppercase tracking-wider">
              Overs
            </p>
          </div>
        </div>
      </div>

      {/* Over allocation bar */}
      <div className="h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-700`}
          style={{
            width: `${pct}%`,
            animation: `grow-bar 0.8s ease-out ${index * 100}ms both`,
          }}
        />
      </div>
      <style>{`
        @keyframes grow-bar {
          from { width: 0%; }
          to { width: ${pct}%; }
        }
      `}</style>
    </div>
  );
}

/**
 * BowlingPlan — shows selected bowlers with over allocation and economy rate.
 * Bar widths are proportional to total innings overs.
 */
export default function BowlingPlan({ bowlers = [], format = "T20" }) {
  const maxOvers = getMaxOversPerBowler(format);
  const totalOvers = getTotalOvers(format);

  // Filter to only players who can bowl
  const bowlingPlayers = bowlers.filter(
    (p) => p.role === "bowler" || p.role === "allrounder"
  );

  return (
    <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 md:p-8">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-1 h-8 bg-amber-500 rounded-full" />
        <h2 className="text-2xl font-['Bebas_Neue'] tracking-wide text-[#F9FAFB]">
          BOWLING PLAN
        </h2>
      </div>
      <p className="text-[#4B5563] text-xs font-['DM_Sans'] mb-6 ml-4">
        {format} — {totalOvers} overs · Max {maxOvers} overs per bowler
      </p>

      <div>
        {bowlingPlayers.length > 0 ? (
          bowlingPlayers.map((bowler, i) => (
            <BowlerRow
              key={bowler.player_id ?? i}
              bowler={bowler}
              maxOvers={maxOvers}
              totalOvers={totalOvers}
              index={i}
            />
          ))
        ) : (
          <p className="text-[#4B5563] font-['DM_Sans'] text-sm text-center py-4">
            No bowling data available.
          </p>
        )}
      </div>

      {/* Total overs legend */}
      {bowlingPlayers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#1E293B] flex items-center justify-between">
          <span className="text-[#4B5563] font-['DM_Sans'] text-xs">
            Total bowling overs
          </span>
          <span className="font-['JetBrains_Mono'] text-sm font-bold text-emerald-400">
            {bowlingPlayers.reduce(
              (acc, b) => acc + (b.overs_allocated ?? maxOvers),
              0
            )}{" "}
            / {totalOvers}
          </span>
        </div>
      )}
    </div>
  );
}