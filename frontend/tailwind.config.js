/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design System — Professional Dark Cricket Dashboard
        primary: {
          bg: "#0A0F1E",       // deep navy black
          card: "#111827",     // card background
          border: "#1E293B",   // subtle borders
        },
        accent: {
          emerald: "#10B981",  // primary accent — cricket field
          amber: "#F59E0B",    // secondary accent — trophy/premium
          danger: "#EF4444",   // danger/remove
        },
        text: {
          primary: "#F9FAFB",  // near white
          secondary: "#9CA3AF",// muted gray
          muted: "#4B5563",    // very muted
        },
      },
      fontFamily: {
        display: ["'Bebas Neue'", "cursive"],   // headings, hero
        body: ["'DM Sans'", "sans-serif"],      // body text, UI
        mono: ["'JetBrains Mono'", "monospace"],// stats, numbers
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(135deg, #0A0F1E 0%, #0D1B2A 50%, #0A1628 100%)",
      },
      animation: {
        "pulse-emerald": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      maxWidth: {
        content: "80rem", // max-w-7xl equivalent
      },
    },
  },
  plugins: [],
};
