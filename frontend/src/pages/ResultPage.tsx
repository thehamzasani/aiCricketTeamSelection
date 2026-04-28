import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSelectionById } from "../services/api";
import TeamResultDashboard from "../components/results/TeamResultDashboard";
import LoadingSpinner from "../components/ui/LoadingSpinner";

/**
 * ResultPage — fetches a single selection by ID and renders the full dashboard.
 * Route: /result/:id
 */
export default function ResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selection, setSelection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    /**
     * Fetches selection data from the backend on mount.
     * Falls back to a friendly error message on failure.
     */
    const fetchSelection = async () => {
      try {
        setLoading(true);
        const data = await getSelectionById(id);
        setSelection(data);
      } catch (err) {
        setError(
          (err as any)?.response?.data?.detail ||
            "Failed to load selection. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSelection();
  }, [id]);

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

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center px-4">
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">🏏</div>
          <h2 className="text-xl font-bold text-[#F9FAFB] font-['Bebas_Neue'] tracking-wide mb-2">
            SELECTION NOT FOUND
          </h2>
          <p className="text-[#9CA3AF] font-['DM_Sans'] mb-6">{error}</p>
          <button
            onClick={() => navigate("/select")}
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold font-['DM_Sans'] px-6 py-2 rounded-xl transition-colors"
          >
            Generate New Selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E]">
      <TeamResultDashboard selection={selection} />
    </div>
  );
}