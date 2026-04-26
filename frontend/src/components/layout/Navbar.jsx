// frontend/src/components/layout/Navbar.jsx
import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";

const CricketBallIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="14" fill="#10B981" stroke="#059669" strokeWidth="1.5" />
    <path d="M8 10 Q12 14 8 22" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M24 10 Q20 14 24 22" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M10 8 Q16 12 22 8" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    <path d="M10 24 Q16 20 22 24" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" />
  </svg>
);

const navLinks = [
  { to: "/", label: "Home", exact: true },
  { to: "/select", label: "Select Team" },
  { to: "/history", label: "History" },
  { to: "/players", label: "Players" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0A0F1E]/95 backdrop-blur-md border-b border-[#1E293B] shadow-lg shadow-black/20"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="transition-transform duration-300 group-hover:rotate-12">
              <CricketBallIcon />
            </div>
            <span
              className="text-2xl tracking-widest text-white group-hover:text-emerald-400 transition-colors duration-200"
              style={{ fontFamily: "'Bebas Neue', cursive" }}
            >
              CricketAI
            </span>
          </NavLink>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                  `relative px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg
                  ${
                    isActive
                      ? "text-emerald-400"
                      : "text-[#9CA3AF] hover:text-white"
                  }`
                }
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {({ isActive }) => (
                  <>
                    {label}
                    {isActive && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-400 rounded-full" />
                    )}
                  </>
                )}
              </NavLink>
            ))}

            <NavLink
              to="/select"
              className="ml-4 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/30 hover:-translate-y-0.5"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Generate XI
            </NavLink>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-[#1E293B] transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span
              className={`block w-6 h-0.5 bg-white transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-2" : ""}`}
            />
            <span
              className={`block w-6 h-0.5 bg-white transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`}
            />
            <span
              className={`block w-6 h-0.5 bg-white transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden transition-all duration-300 overflow-hidden ${
          menuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-[#0A0F1E]/98 backdrop-blur-md border-t border-[#1E293B] px-4 py-4 flex flex-col gap-2">
          {navLinks.map(({ to, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "text-[#9CA3AF] hover:text-white hover:bg-[#1E293B]"}`
              }
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {label}
            </NavLink>
          ))}
          <NavLink
            to="/select"
            className="mt-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold rounded-xl text-center transition-colors"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Generate XI
          </NavLink>
        </div>
      </div>
    </nav>
  );
}