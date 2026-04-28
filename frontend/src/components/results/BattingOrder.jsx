import { useEffect, useRef } from "react";

/**
 * Maps player role strings to short display labels.
 */
const ROLE_SHORT = {
  batsman: "BAT",
  wicketkeeper: "WK",
  allrounder: "AR",
  bowler: "BOWL",
};

/**
 * Maps player role strings to Tailwind color classes.
 */
const ROLE_COLORS = {
  batsman: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  wicketkeeper: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  allrounder: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  bowler: "text-purple-400 bg-purple-500/10 border-purple-500/30",
};

/**
 * BattingOrder — displays an animated staggered list of batting positions.
 * Highlights captain (C), vice-captain (VC), and wicketkeeper (WK).
 */
export default function BattingOrder({ battingOrder = [], captain, viceCaptain }) {
  const rowRefs = useRef([]);

  useEffect(() => {
    /**
     * Staggered entrance animation using IntersectionObserver.
     * Each row fades and slides in with a delay based on its index.
     */
    const observers = rowRefs.current.map((el, i) => {
      if (!el) return null;
      el.style.opacity = "0";
      el.style.transform = "translateX(-20px)";
      el.style.transition = `opacity 0.4s ease ${i * 60}ms, transform 0.4s ease ${i * 60}ms`;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            el.style.opacity = "1";
            el.style.transform = "translateX(0)";
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(el);
      return observer;
    });

    return () => observers.forEach((obs) => obs?.disconnect());
  }, [battingOrder]);

  return (
    <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 md:p-8">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-emerald-500 rounded-full" />
        <h2 className="text-2xl font-['Bebas_Neue'] tracking-wide text-[#F9FAFB]">
          BATTING ORDER
        </h2>
      </div>

      <div className="space-y-2">
        {battingOrder.map((player, index) => {
          const isCaptain = captain && (captain.player_id === player.player_id || captain.name === player.name);
          const isViceCaptain = viceCaptain && (viceCaptain.player_id === player.player_id || viceCaptain.name === player.name);
          const isWK = player.role === "wicketkeeper";
          const position = player.batting_position ?? index + 1;
          const roleColor = ROLE_COLORS[player.role] || ROLE_COLORS.batsman;
          const roleShort = ROLE_SHORT[player.role] || "—";

          return (
            <div
              key={player.player_id ?? index}
              ref={(el) => (rowRefs.current[index] = el)}
              className="flex items-center gap-3 bg-[#0A0F1E] border border-[#1E293B] hover:border-emerald-500/40 rounded-xl px-4 py-3 transition-colors group"
            >
              {/* Position number */}
              <span className="font-['JetBrains_Mono'] text-sm font-bold text-[#4B5563] w-5 text-center group-hover:text-emerald-500 transition-colors">
                {position}
              </span>

              {/* Player name */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-['DM_Sans'] font-medium text-[#F9FAFB] text-sm truncate">
                    {player.name}
                  </span>
                  {/* Captain badge */}
                  {isCaptain && (
                    <span className="text-[10px] font-bold font-['DM_Sans'] bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5 leading-none">
                      C
                    </span>
                  )}
                  {/* Vice captain badge */}
                  {isViceCaptain && (
                    <span className="text-[10px] font-bold font-['DM_Sans'] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded px-1.5 py-0.5 leading-none">
                      VC
                    </span>
                  )}
                  {/* WK badge */}
                  {isWK && (
                    <span className="text-[10px] font-bold font-['DM_Sans'] bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded px-1.5 py-0.5 leading-none">
                      WK
                    </span>
                  )}
                </div>
              </div>

              {/* Role tag */}
              <span
                className={`text-[10px] font-bold font-['DM_Sans'] border rounded px-1.5 py-0.5 leading-none ${roleColor}`}
              >
                {roleShort}
              </span>

              {/* Key stat */}
              {player.score != null && (
                <div className="text-right hidden sm:block">
                  <p className="font-['JetBrains_Mono'] text-xs text-emerald-400 font-bold">
                    {Number(player.score).toFixed(1)}
                  </p>
                  <p className="text-[10px] text-[#4B5563] font-['DM_Sans'] uppercase tracking-wider">
                    Score
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {battingOrder.length === 0 && (
        <p className="text-[#4B5563] font-['DM_Sans'] text-sm text-center py-4">
          No batting order available.
        </p>
      )}
    </div>
  );
}