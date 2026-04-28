// frontend/src/components/forms/PlayerSelector.jsx
import { useEffect, useState, useCallback } from "react";
import { fetchSquad } from "../../services/api";

const ROLE_COLORS = {
  batsman: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  bowler: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
  allrounder: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  wicketkeeper: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
};

const ROLE_ICONS = {
  batsman: "🏏",
  bowler: "⚡",
  allrounder: "🌟",
  wicketkeeper: "🧤",
};

/**
 * PlayerCard (compact) — used inside PlayerSelector grid.
 * Shows player name, role, and a checkbox. Highlights when selected.
 */
function CompactPlayerCard({ player, isSelected, onToggle }) {
  const roleStyle = ROLE_COLORS[player.role] || ROLE_COLORS.batsman;

  return (
    <button
      type="button"
      onClick={() => onToggle(player.id)}
      className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer group relative ${
        isSelected
          ? "border-emerald-500 bg-emerald-500/8"
          : "border-[#1E293B] bg-[#0A0F1E] hover:border-[#374151]"
      }`}
      style={{ background: isSelected ? "rgba(16,185,129,0.06)" : undefined }}
    >
      {/* Checkbox indicator top-right */}
      <div
        className={`absolute top-2.5 right-2.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
          isSelected
            ? "border-emerald-500 bg-emerald-500"
            : "border-[#374151] group-hover:border-emerald-500/50"
        }`}
      >
        {isSelected && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Player Info */}
      <div className="pr-6">
        <p
          className={`text-sm font-semibold leading-tight mb-1.5 ${isSelected ? "text-white" : "text-[#F9FAFB]"}`}
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {player.name}
        </p>

        {/* Role Badge */}
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
        >
          <span>{ROLE_ICONS[player.role] || "🏏"}</span>
          <span className="capitalize">{player.role}</span>
        </span>
      </div>

      {/* Batting Style (if available) */}
      {player.batting_style && (
        <p className="text-[10px] text-[#4B5563] mt-1.5 truncate">
          {player.batting_style}
          {player.bowling_style ? ` · ${player.bowling_style}` : ""}
        </p>
      )}

      {/* Selection glow effect */}
      {isSelected && (
        <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ boxShadow: "inset 0 0 0 1px rgba(16,185,129,0.3)" }} />
      )}
    </button>
  );
}

/**
 * PlayerSelector — loads squad for selected team, shows checkable grid.
 * Calls onGenerate(selectedIds) when Generate button is clicked.
 */
export default function PlayerSelector({ teamName, format, onGenerate, isGenerating, onPlayerSelectionChange }) {
  const [players, setPlayers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  // Load squad whenever teamName changes
  useEffect(() => {
    if (!teamName) {
      setPlayers([]);
      setSelectedIds(new Set());
      return;
    }

    const loadSquad = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchSquad(teamName);
        setPlayers(data);
        // Select all by default
        const allIds = new Set(data.map((p) => p.id));
        setSelectedIds(allIds);
        onPlayerSelectionChange?.(Array.from(allIds));
      } catch (err) {
        setError("Failed to load squad. Please check the team selection.");
      } finally {
        setLoading(false);
      }
    };

    loadSquad();
  }, [teamName]);

  // Notify parent when selection changes
  useEffect(() => {
    onPlayerSelectionChange?.(Array.from(selectedIds));
  }, [selectedIds]);

  const togglePlayer = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = () => {
    const allIds = new Set(filteredPlayers.map((p) => p.id));
    setSelectedIds((prev) => new Set([...prev, ...allIds]));
  };

  const deselectAll = () => {
    const filteredIds = new Set(filteredPlayers.map((p) => p.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  const handleGenerate = () => {
    if (selectedIds.size >= 11) {
      onGenerate(Array.from(selectedIds));
    }
  };

  // Filter players by role
  const filteredPlayers =
    filter === "all"
      ? players
      : players.filter((p) => p.role === filter);

  const selectedCount = selectedIds.size;
  const totalCount = players.length;
  const isReady = selectedCount >= 11;

  return (
    <div
      className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 md:p-8 flex flex-col"
      style={{ fontFamily: "'DM Sans', sans-serif", minHeight: "600px" }}
    >
      {/* Section Title */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-white font-semibold text-lg">Squad Selection</h2>
        </div>

        {/* Selection Counter */}
        {players.length > 0 && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
            isReady ? "border-emerald-500/30 bg-emerald-500/10" : "border-[#1E293B] bg-[#0A0F1E]"
          }`}>
            <span
              className={`text-lg font-bold ${isReady ? "text-emerald-400" : "text-[#F59E0B]"}`}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {selectedCount}
            </span>
            <span className="text-[#4B5563] text-sm">/</span>
            <span className="text-[#9CA3AF] text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {totalCount}
            </span>
            <span className="text-[#9CA3AF] text-xs ml-1">selected</span>
          </div>
        )}
      </div>

      {/* No Team Selected State */}
      {!teamName && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-[#0A0F1E] border border-[#1E293B] flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[#374151]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-[#9CA3AF] font-medium mb-1">No Team Selected</p>
          <p className="text-[#4B5563] text-sm max-w-[200px]">
            Select your team from the match setup panel to load the squad.
          </p>
        </div>
      )}

      {/* Loading State */}
      {teamName && loading && (
        <div className="flex-1 flex flex-col items-center justify-center py-16">
          <div className="relative w-12 h-12 mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-500 animate-spin" />
          </div>
          <p className="text-[#9CA3AF] text-sm">Loading {teamName} squad...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex-1 flex items-center justify-center py-8">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              className="mt-2 text-xs text-red-400/70 underline hover:text-red-400"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Squad Loaded */}
      {!loading && !error && players.length > 0 && (
        <div className="flex flex-col flex-1">
          {/* Filter + Select Actions */}
          <div className="flex items-center justify-between mb-4">
            {/* Role Filter */}
            <div className="flex gap-1.5 flex-wrap">
              {["all", "batsman", "bowler", "allrounder", "wicketkeeper"].map((role) => (
                <button
                  key={role}
                  onClick={() => setFilter(role)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all duration-150 ${
                    filter === role
                      ? "bg-emerald-500 text-white"
                      : "bg-[#0A0F1E] border border-[#1E293B] text-[#9CA3AF] hover:text-white hover:border-[#374151]"
                  }`}
                >
                  {role === "all" ? "All" : role === "wicketkeeper" ? "WK" : role.charAt(0).toUpperCase() + role.slice(1)}
                </button>
              ))}
            </div>

            {/* Select / Deselect All */}
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                All
              </button>
              <span className="text-[#374151]">·</span>
              <button
                onClick={deselectAll}
                className="text-xs text-[#9CA3AF] hover:text-white transition-colors"
              >
                None
              </button>
            </div>
          </div>

          {/* Player Grid */}
          <div className="grid grid-cols-2 gap-2.5 overflow-y-auto flex-1 pr-1 custom-scrollbar" style={{ maxHeight: "420px" }}>
            {filteredPlayers.map((player) => (
              <CompactPlayerCard
                key={player.id}
                player={player}
                isSelected={selectedIds.has(player.id)}
                onToggle={togglePlayer}
              />
            ))}
          </div>

          {/* Warnings + Generate Button */}
          <div className="mt-5 space-y-3">
            {/* Warnings */}
            {selectedCount < 11 && selectedCount > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-amber-400 text-xs">
                  Select at least <span className="font-bold">{11 - selectedCount}</span> more player{11 - selectedCount !== 1 ? "s" : ""} to proceed.
                </p>
              </div>
            )}

            {selectedCount === 0 && (
              <div className="p-3 rounded-xl bg-[#0A0F1E] border border-[#1E293B]">
                <p className="text-[#4B5563] text-xs text-center">No players selected</p>
              </div>
            )}

            {/* Role composition summary */}
            {selectedCount >= 11 && (
              <div className="flex gap-2 flex-wrap">
                {Object.entries(
                  Array.from(selectedIds).reduce((acc, id) => {
                    const p = players.find((pl) => pl.id === id);
                    if (p) acc[p.role] = (acc[p.role] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([role, count]) => {
                  const s = ROLE_COLORS[role] || ROLE_COLORS.batsman;
                  return (
                    <span
                      key={role}
                      className={`text-[10px] px-2 py-1 rounded-lg border font-medium capitalize ${s.bg} ${s.text} ${s.border}`}
                    >
                      {ROLE_ICONS[role]} {count} {role === "wicketkeeper" ? "WK" : role}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Generate Button */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!isReady || isGenerating}
              className={`w-full py-4 rounded-xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-3 ${
                isReady && !isGenerating
                  ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
                  : "bg-[#1E293B] text-[#4B5563] cursor-not-allowed"
              }`}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  <span>Generating AI XI...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Generate Playing XI</span>
                  {isReady && (
                    <span className="ml-auto text-emerald-200/70 text-sm font-normal">
                      {selectedCount} players
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}