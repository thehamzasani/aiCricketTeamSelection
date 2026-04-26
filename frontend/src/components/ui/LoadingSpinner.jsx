// frontend/src/components/ui/LoadingSpinner.jsx

/**
 * LoadingSpinner — animated emerald spinner with optional label.
 *
 * Props:
 *   size    — "sm" | "md" | "lg"
 *   label   — optional text below spinner
 *   fullPage — boolean, centers in full viewport
 */
export default function LoadingSpinner({ size = "md", label, fullPage = false }) {
  const sizeMap = {
    sm: "w-5 h-5 border-2",
    md: "w-8 h-8 border-2",
    lg: "w-12 h-12 border-[3px]",
  };

  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`${sizeMap[size]} rounded-full border-[#1E293B] border-t-emerald-400 animate-spin`}
      />
      {label && (
        <p
          className="text-[#9CA3AF] text-sm animate-pulse"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {label}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-[#0A0F1E]/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-8">
          {spinner}
        </div>
      </div>
    );
  }

  return spinner;
}

/**
 * SkeletonCard — placeholder while content loads
 */
export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5 animate-pulse">
      <div className="w-12 h-4 bg-[#1E293B] rounded-md mb-3" />
      <div className="w-3/4 h-5 bg-[#1E293B] rounded-md mb-2" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <div key={i} className={`h-3 bg-[#1E293B] rounded-md mb-2 ${i === lines - 2 ? "w-1/2" : "w-full"}`} />
      ))}
      <div className="mt-4 h-2 bg-[#1E293B] rounded-full w-full" />
    </div>
  );
}