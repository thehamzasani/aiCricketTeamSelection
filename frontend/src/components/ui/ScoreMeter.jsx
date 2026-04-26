// frontend/src/components/ui/ScoreMeter.jsx

/**
 * ScoreMeter — visual score bar from 0–100 with color-coded fill.
 *
 * Props:
 *   score     — number 0–100
 *   showLabel — boolean (shows "Score: XX" text)
 *   size      — "sm" | "md"
 */
export default function ScoreMeter({ score = 0, showLabel = true, size = "md" }) {
  const clampedScore = Math.max(0, Math.min(100, score));

  // Color thresholds
  const getColor = (s) => {
    if (s >= 75) return { bar: "bg-emerald-400", glow: "shadow-emerald-400/40", text: "text-emerald-400" };
    if (s >= 50) return { bar: "bg-amber-400", glow: "shadow-amber-400/30", text: "text-amber-400" };
    if (s >= 30) return { bar: "bg-orange-400", glow: "shadow-orange-400/30", text: "text-orange-400" };
    return { bar: "bg-red-400", glow: "shadow-red-400/30", text: "text-red-400" };
  };

  const colors = getColor(clampedScore);
  const trackHeight = size === "sm" ? "h-1" : "h-1.5";

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <span
            className="text-[10px] uppercase tracking-widest text-[#4B5563]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            AI Score
          </span>
          <span
            className={`text-xs font-bold ${colors.text}`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {clampedScore > 0 ? clampedScore.toFixed(1) : "—"}
          </span>
        </div>
      )}

      {/* Track */}
      <div className={`w-full ${trackHeight} bg-[#1E293B] rounded-full overflow-hidden`}>
        <div
          className={`${trackHeight} ${colors.bar} rounded-full shadow-sm ${colors.glow} transition-all duration-700 ease-out`}
          style={{ width: `${clampedScore}%` }}
        />
      </div>
    </div>
  );
}