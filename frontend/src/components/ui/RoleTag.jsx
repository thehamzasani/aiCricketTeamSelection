// frontend/src/components/ui/RoleTag.jsx

/**
 * RoleTag — displays a player's role as a colored pill tag.
 *
 * Props:
 *   role — "batsman" | "bowler" | "allrounder" | "wicketkeeper"
 *   size — "sm" | "md"
 */
export default function RoleTag({ role, size = "sm" }) {
  const configs = {
    batsman: {
      label: "BAT",
      className: "bg-blue-500/10 border-blue-500/30 text-blue-400",
    },
    bowler: {
      label: "BOWL",
      className: "bg-red-500/10 border-red-500/30 text-red-400",
    },
    allrounder: {
      label: "ALL",
      className: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    },
    wicketkeeper: {
      label: "WK",
      className: "bg-purple-500/10 border-purple-500/30 text-purple-400",
    },
  };

  const config = configs[role] || {
    label: role?.toUpperCase() || "—",
    className: "bg-[#1E293B] border-[#334155] text-[#9CA3AF]",
  };

  const sizeClass = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]";

  return (
    <span
      className={`inline-flex items-center rounded-md border font-bold tracking-widest ${config.className} ${sizeClass}`}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {config.label}
    </span>
  );
}