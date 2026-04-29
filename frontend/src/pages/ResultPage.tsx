import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { historyAPI } from "../services/api";
import TeamResultDashboard from "../components/results/TeamResultDashboard";
import LoadingSpinner from "../components/ui/LoadingSpinner";

/**
 * ResultPage — fetches a single selection by ID and renders the full dashboard.
 * Supports both:
 *   - Fresh generation: navigated to with state.selection (avoids a second fetch)
 *   - History view: fetches from GET /api/history/:id
 * Route: /result/:id
 */
export default function ResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [selection, setSelection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchSelection = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await historyAPI.getSelectionById(Number(id));
        setSelection(data);
      } catch (err: any) {
  const status = err?.response?.status;
  if (status === 404) {
    setError("This selection no longer exists.");
  } else {
    setError(
      err?.response?.data?.detail ||
        "Failed to load selection. Please try again."
    );
  }
} finally {
        setLoading(false);
      }
    };

    fetchSelection();
  }, [id]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" label="Loading selection analysis..." />
          <p className="mt-4 text-[#9CA3AF] font-['DM_Sans']">
            Loading selection analysis...
          </p>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error || !selection) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center px-4">
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🏏</div>
          <h2 className="text-2xl font-['Bebas_Neue'] tracking-wide text-[#F9FAFB] mb-2">
            SELECTION NOT FOUND
          </h2>
          <p className="text-[#9CA3AF] font-['DM_Sans'] mb-6">
            {error || "Something went wrong loading this selection."}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="border border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 font-bold font-['DM_Sans'] px-5 py-2 rounded-xl transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => navigate("/select")}
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold font-['DM_Sans'] px-5 py-2 rounded-xl transition-colors"
            >
              New Selection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Success state ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0F1E]">
      <TeamResultDashboard selection={selection} />
    </div>
  );
}