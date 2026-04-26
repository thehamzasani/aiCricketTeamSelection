// frontend/src/components/ui/StatBadge.jsx

/**
 * StatBadge — displays a labeled stat value as a compact pill badge.
 *
 * Props:
 *   label   — string (e.g. "Avg", "Economy")
 *   value   — string | number
 *   variant — "default" | "good" | "warning" | "danger"
 */
export default function StatBadge({ label, value, variant = "default" }) {
  const variantStyles = {
    default: "bg-[#0A0F1E] border-[#1E293B] text-[#9CA3AF]",
    good: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    warning: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    danger: "bg-red-500/10 border-red-500/30 text-red-400",
  };

  return (
    <div
      className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg border ${variantStyles[variant]}`}
    >
      <span
        className="text-[9px] uppercase tracking-widest text-[#4B5563] leading-none mb-0.5"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {label}
      </span>
      <span
        className="text-sm font-bold leading-none"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}