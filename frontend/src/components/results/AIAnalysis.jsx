/**
 * SectionBlock — a labelled text block used inside AIAnalysis.
 */
function SectionBlock({ label, children, accent = "emerald" }) {
  const accentMap = {
    emerald: "border-emerald-500 text-emerald-400",
    amber: "border-amber-500 text-amber-400",
    blue: "border-blue-500 text-blue-400",
  };
  const colors = accentMap[accent] || accentMap.emerald;

  return (
    <div className={`border-l-2 ${colors.split(" ")[0]} pl-4`}>
      <p className={`text-[10px] font-['DM_Sans'] font-bold uppercase tracking-widest mb-1.5 ${colors.split(" ")[1]}`}>
        {label}
      </p>
      <div className="text-[#9CA3AF] font-['DM_Sans'] text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}

/**
 * AIAnalysis — renders Gemini-generated overall analysis, key strategy callout,
 * captain reasoning, and batting/bowling plan text.
 * Handles both raw string and structured JSON object from backend.
 */
export default function AIAnalysis({ analysis, strategy, captain, format }) {
  /**
   * Parses the AI analysis, which may be a raw string or a structured JSON object.
   * Returns a normalised object with all expected fields.
   */
  const parsed = (() => {
    if (!analysis) return null;
    if (typeof analysis === "object") return analysis;
    try {
      return JSON.parse(analysis);
    } catch {
      // Raw string — wrap it
      return { overall_analysis: analysis };
    }
  })();

  const rawStrategy = strategy || parsed?.key_strategy;
  const overallText = parsed?.overall_analysis;
  const captainReason = parsed?.captain_reason;
  const battingReason = parsed?.batting_order_reasoning;
  const bowlingPlan = parsed?.bowling_plan;

  return (
    <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 md:p-8 h-full flex flex-col">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-500 rounded-full" />
        <h2 className="text-2xl font-['Bebas_Neue'] tracking-wide text-[#F9FAFB]">
          AI ANALYSIS
        </h2>
        <span className="ml-auto text-[10px] font-bold font-['DM_Sans'] bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full px-2.5 py-1 uppercase tracking-widest">
          Gemini 1.5
        </span>
      </div>

      <div className="flex flex-col gap-5 flex-1">

        {/* Overall analysis — hero block */}
        {overallText ? (
          <div className="bg-[#0A0F1E] border border-[#1E293B] rounded-xl p-4">
            <p className="text-[10px] font-['DM_Sans'] font-bold uppercase tracking-widest text-blue-400 mb-3">
              Overall Analysis
            </p>
            <p className="text-[#F9FAFB] font-['DM_Sans'] text-sm leading-relaxed">
              {overallText}
            </p>
          </div>
        ) : (
          <div className="bg-[#0A0F1E] border border-[#1E293B] rounded-xl p-4">
            <p className="text-[#4B5563] font-['DM_Sans'] text-sm italic">
              AI analysis not available.
            </p>
          </div>
        )}

        {/* Key strategy callout — amber accent */}
        {rawStrategy && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 relative overflow-hidden">
            {/* Decorative dot */}
            <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-amber-400 opacity-60" />
            <div className="absolute top-5 right-5 w-1 h-1 rounded-full bg-amber-400 opacity-30" />
            <p className="text-[10px] font-['DM_Sans'] font-bold uppercase tracking-widest text-amber-400 mb-2 flex items-center gap-2">
              <span>★</span>
              Key Strategy
            </p>
            <p className="text-amber-100/80 font-['DM_Sans'] text-sm leading-relaxed">
              {rawStrategy}
            </p>
          </div>
        )}

        {/* Captain reasoning */}
        {captainReason && (
          <SectionBlock label="Captain Choice" accent="amber">
            {captain && (
              <span className="font-semibold text-[#F9FAFB]">
                {captain.name}:{" "}
              </span>
            )}
            {captainReason}
          </SectionBlock>
        )}

        {/* Batting order reasoning */}
        {battingReason && (
          <SectionBlock label="Batting Order Rationale" accent="emerald">
            {battingReason}
          </SectionBlock>
        )}

        {/* Bowling plan text */}
        {bowlingPlan && (
          <SectionBlock label="Bowling Combination" accent="blue">
            {bowlingPlan}
          </SectionBlock>
        )}

        {/* Player reasons — if present */}
        {parsed?.player_reasons &&
          typeof parsed.player_reasons === "object" &&
          Object.keys(parsed.player_reasons).length > 0 && (
            <div>
              <p className="text-[10px] font-['DM_Sans'] font-bold uppercase tracking-widest text-[#4B5563] mb-3">
                Player Selection Reasons
              </p>
              <div className="space-y-2">
                {Object.entries(parsed.player_reasons).map(([name, reason]) => (
                  <div
                    key={name}
                    className="flex gap-2 text-xs font-['DM_Sans'] leading-snug"
                  >
                    <span className="text-emerald-500 mt-0.5 shrink-0">▸</span>
                    <span>
                      <span className="text-[#F9FAFB] font-medium">{name}:</span>{" "}
                      <span className="text-[#9CA3AF]">{reason}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Fallback if nothing parsed */}
        {!overallText && !rawStrategy && !captainReason && !battingReason && !bowlingPlan && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl mb-3">🤖</div>
              <p className="text-[#4B5563] font-['DM_Sans'] text-sm">
                AI analysis not generated for this selection.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}