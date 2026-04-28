// frontend/src/components/forms/MatchSetupForm.jsx
import { useEffect, useState } from "react";
import { fetchVenues } from "../../services/api";

const TEAMS = ["Pakistan", "India", "Australia", "England", "New Zealand", "South Africa", "Sri Lanka", "Bangladesh", "West Indies", "Afghanistan"];
const FORMATS = ["T20", "ODI", "Test"];

const PITCH_OPTIONS = [
  {
    value: "spin",
    label: "Spin",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    description: "Favours spinners",
    color: "amber",
  },
  {
    value: "pace",
    label: "Pace",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    description: "Favours fast bowlers",
    color: "red",
  },
  {
    value: "flat",
    label: "Flat",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4M4 12l4-4m-4 4l4 4" />
      </svg>
    ),
    description: "Batting paradise",
    color: "emerald",
  },
];

const WEATHER_OPTIONS = [
  {
    value: "clear",
    label: "Clear",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z" />
      </svg>
    ),
  },
  {
    value: "overcast",
    label: "Overcast",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
  },
  {
    value: "humid",
    label: "Humid",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3c-4.97 0-9 3.185-9 7.115 0 3.267 2.564 6.053 6.27 6.887v1.5A2.502 2.502 0 0012 21a2.502 2.502 0 002.73-2.498v-1.5C18.436 16.168 21 13.382 21 10.115 21 6.185 16.97 3 12 3z" />
      </svg>
    ),
  },
];

/**
 * MatchSetupForm — renders all match condition inputs.
 * Calls onChange(updates) to lift state to SelectTeamPage.
 */
export default function MatchSetupForm({ config, onChange }) {
  const [venues, setVenues] = useState([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [venuesError, setVenuesError] = useState(null);

  // Fetch venues on mount
  useEffect(() => {
    const loadVenues = async () => {
      try {
        setVenuesLoading(true);
        const data = await fetchVenues();
        setVenues(data);
      } catch (err) {
        setVenuesError("Failed to load venues.");
      } finally {
        setVenuesLoading(false);
      }
    };
    loadVenues();
  }, []);

  const inputClass =
    "w-full bg-[#0A0F1E] border border-[#1E293B] text-white rounded-xl px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all duration-200 text-sm";

  const labelClass =
    "block text-[#9CA3AF] text-xs font-medium uppercase tracking-widest mb-2";

  return (
    <div
      className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 md:p-8 h-full"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Section Title */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h2 className="text-white font-semibold text-lg">Match Setup</h2>
      </div>

      <div className="space-y-5">
        {/* Row: Team + Opposition */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Your Team</label>
            <div className="relative">
              <select
                value={config.team_name}
                onChange={(e) => onChange({ team_name: e.target.value })}
                className={inputClass + " appearance-none pr-8 cursor-pointer"}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <option value="">Select team</option>
                {TEAMS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <svg className="w-4 h-4 text-[#4B5563] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <div>
            <label className={labelClass}>Opposition</label>
            <div className="relative">
              <select
                value={config.opposition}
                onChange={(e) => onChange({ opposition: e.target.value })}
                className={inputClass + " appearance-none pr-8 cursor-pointer"}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <option value="">Select opposition</option>
                {TEAMS.filter((t) => t !== config.team_name).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <svg className="w-4 h-4 text-[#4B5563] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Format Selector — Tab Style */}
        <div>
          <label className={labelClass}>Format</label>
          <div className="flex gap-2 p-1 bg-[#0A0F1E] rounded-xl border border-[#1E293B]">
            {FORMATS.map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => onChange({ format: fmt })}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  config.format === fmt
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                    : "text-[#9CA3AF] hover:text-white hover:bg-white/5"
                }`}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Venue Dropdown */}
        <div>
          <label className={labelClass}>Venue</label>
          {venuesError ? (
            <p className="text-red-400 text-xs">{venuesError}</p>
          ) : (
            <div className="relative">
              <select
                value={config.venue_id}
                onChange={(e) => onChange({ venue_id: e.target.value })}
                className={inputClass + " appearance-none pr-8 cursor-pointer"}
                disabled={venuesLoading}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <option value="">
                  {venuesLoading ? "Loading venues..." : "Select venue"}
                </option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}, {v.city}
                  </option>
                ))}
              </select>
              <svg className="w-4 h-4 text-[#4B5563] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )}
        </div>

        {/* Pitch Type — Visual Cards */}
        <div>
          <label className={labelClass}>Pitch Type</label>
          <div className="grid grid-cols-3 gap-3">
            {PITCH_OPTIONS.map((p) => {
              const isSelected = config.pitch_type === p.value;
              const colorMap = {
                amber: isSelected
                  ? "border-amber-500 bg-amber-500/10 text-amber-400"
                  : "border-[#1E293B] text-[#9CA3AF] hover:border-amber-500/40 hover:text-amber-400",
                red: isSelected
                  ? "border-red-500 bg-red-500/10 text-red-400"
                  : "border-[#1E293B] text-[#9CA3AF] hover:border-red-500/40 hover:text-red-400",
                emerald: isSelected
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                  : "border-[#1E293B] text-[#9CA3AF] hover:border-emerald-500/40 hover:text-emerald-400",
              };

              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => onChange({ pitch_type: p.value })}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 cursor-pointer ${colorMap[p.color]}`}
                >
                  <div className={isSelected ? "" : "opacity-60"}>{p.icon}</div>
                  <span className="text-xs font-semibold">{p.label}</span>
                  <span className="text-[10px] opacity-70 text-center leading-tight">{p.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Weather + Toss Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Weather */}
          <div>
            <label className={labelClass}>Weather</label>
            <div className="flex gap-2">
              {WEATHER_OPTIONS.map((w) => (
                <button
                  key={w.value}
                  type="button"
                  onClick={() => onChange({ weather: w.value })}
                  title={w.label}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all duration-200 ${
                    config.weather === w.value
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-[#1E293B] text-[#9CA3AF] hover:border-emerald-500/30 hover:text-white"
                  }`}
                >
                  {w.icon}
                  <span className="text-[10px] font-medium">{w.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Toss Decision */}
          <div>
            <label className={labelClass}>Toss Decision</label>
            <div className="flex gap-2 p-1 bg-[#0A0F1E] rounded-xl border border-[#1E293B]">
              {["bat", "bowl"].map((decision) => (
                <button
                  key={decision}
                  type="button"
                  onClick={() => onChange({ toss_decision: decision })}
                  className={`flex-1 py-3 rounded-lg text-sm font-semibold capitalize transition-all duration-200 ${
                    config.toss_decision === decision
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                      : "text-[#9CA3AF] hover:text-white hover:bg-white/5"
                  }`}
                >
                  {decision === "bat" ? "🏏 Bat" : "⚡ Bowl"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Config Summary */}
        {config.team_name && config.opposition && (
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <p className="text-emerald-400 text-xs font-medium mb-1 uppercase tracking-wider">Match Preview</p>
            <p className="text-white text-sm font-semibold">
              {config.team_name} vs {config.opposition}
            </p>
            <p className="text-[#9CA3AF] text-xs mt-0.5">
              {config.format} · {config.pitch_type} pitch · {config.weather} · {config.toss_decision === "bat" ? "Batting first" : "Bowling first"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}