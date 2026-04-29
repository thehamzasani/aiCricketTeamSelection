// frontend/src/pages/SelectTeamPage.jsx
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MatchSetupForm from "../components/forms/MatchSetupForm";
import PlayerSelector from "../components/forms/PlayerSelector";
import { selectionAPI } from "../services/api";

/**
 * SelectTeamPage — two-column layout page for match setup and player selection.
 * Left column: MatchSetupForm | Right column: PlayerSelector
 */
export default function SelectTeamPage() {
  const navigate = useNavigate();

  // Shared form state lifted here so both components can communicate
  const [matchConfig, setMatchConfig] = useState({
    team_name: "",
    opposition: "",
    format: "T20",
    venue_id: "",
    pitch_type: "balanced",
    weather: "clear",
    toss_decision: "bat",
  });

  const [availablePlayerIds, setAvailablePlayerIds] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Updates match config fields from MatchSetupForm
   */
  const handleConfigChange = useCallback((updates) => {
    setMatchConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Called by PlayerSelector when user submits
   * Posts to /api/selection/generate and navigates to result
   */
  const handleGenerate = async (selectedIds) => {
    if (selectedIds.length < 11) return;

    setIsGenerating(true);
    setError(null);

    try {
      const payload = {
        ...matchConfig,
        venue_id: parseInt(matchConfig.venue_id, 10),
        available_player_ids: selectedIds,
      };

      const result = await selectionAPI.generateXI(payload);
      navigate(`/result/${result.selection_id}`);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        "Failed to generate team. Please try again."
      );
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(135deg, #0A0F1E 0%, #0D1B2A 50%, #0A1628 100%)" }}
    >
      {/* Page Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-emerald-500 rounded-full" />
            <span
              className="text-emerald-400 text-sm font-medium tracking-widest uppercase"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              AI Selection Engine
            </span>
          </div>
          <h1
            className="text-4xl md:text-5xl text-white leading-tight"
            style={{ fontFamily: "'Bebas Neue', cursive", letterSpacing: "0.03em" }}
          >
            Configure Your Match
          </h1>
          <p
            className="text-[#9CA3AF] mt-2 text-base"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Set match conditions and select your available squad. Our AI will pick the optimal Playing XI.
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-400 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{error}</p>
          </div>
        )}

        {/* Two-Column Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left Column — Match Setup */}
          <div className="space-y-0">
            <MatchSetupForm
              config={matchConfig}
              onChange={handleConfigChange}
            />
          </div>

          {/* Right Column — Player Selector */}
          <div className="space-y-0">
            <PlayerSelector
              teamName={matchConfig.team_name}
              format={matchConfig.format}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              onPlayerSelectionChange={setAvailablePlayerIds}
            />
          </div>
        </div>
      </div>
    </div>
  );
}