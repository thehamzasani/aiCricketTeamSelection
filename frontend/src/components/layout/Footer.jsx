// frontend/src/components/layout/Footer.jsx

const CricketBallIcon = () => (
  <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="14" fill="#10B981" stroke="#059669" strokeWidth="1.5" />
    <path d="M8 10 Q12 14 8 22" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M24 10 Q20 14 24 22" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M10 8 Q16 12 22 8" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    <path d="M10 24 Q16 20 22 24" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" />
  </svg>
);

export default function Footer() {
  return (
    <footer className="bg-[#0A0F1E] border-t border-[#1E293B] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <CricketBallIcon />
            <span
              className="text-xl tracking-widest text-white"
              style={{ fontFamily: "'Bebas Neue', cursive" }}
            >
              CricketAI
            </span>
          </div>

          {/* Center */}
          <div className="text-center">
            <p
              className="text-[#4B5563] text-sm"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              AI-Powered Cricket Team Selection System
            </p>
            <p
              className="text-[#4B5563] text-xs mt-1"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Final Year University Project &mdash; Computer Science
            </p>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            <span
              className="text-[#4B5563] text-xs"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Powered by
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              Gemini AI
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono">
              CricAPI
            </span>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-[#1E293B] text-center">
          <p
            className="text-[#4B5563] text-xs"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            &copy; {new Date().getFullYear()} CricketAI. Built with FastAPI, React &amp; PostgreSQL.
          </p>
        </div>
      </div>
    </footer>
  );
}