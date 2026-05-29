/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep stadium-night surfaces
        night: {
          950: "#05070d",
          900: "#0a0e1a",
          850: "#0f1422",
          800: "#141a2b",
          700: "#1c2438",
          600: "#28324c"
        },
        // Pitch / available
        pitch: {
          50: "#f0fdf4",
          100: "#dcfce7",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d"
        },
        // Reserved / hold (gold)
        gold: {
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706"
        },
        // Booked
        rose: {
          400: "#fb7185",
          500: "#f43f5e",
          600: "#e11d48"
        },
        // Brand accent
        neon: {
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9"
        },
        // legacy palette kept so any leftover classes still resolve
        stadium: {
          50: "#f4f7f1",
          100: "#e6eddc",
          200: "#cddbb9",
          300: "#adc28d",
          400: "#86a959",
          500: "#6d8f43",
          600: "#516c31",
          700: "#3a4e23",
          800: "#263416",
          900: "#141d0b"
        }
      },
      fontFamily: {
        display: ["'Space Grotesk'", "'Sora'", "system-ui", "sans-serif"],
        sans: ["'Inter'", "'DM Sans'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"]
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.06), 0 18px 40px -12px rgba(0,0,0,0.7)",
        "glow-pitch": "0 0 24px -2px rgba(34,197,94,0.55)",
        "glow-gold": "0 0 24px -2px rgba(245,158,11,0.55)",
        "glow-neon": "0 0 30px -4px rgba(56,189,248,0.6)",
        ticket: "0 24px 60px -24px rgba(0,0,0,0.85)"
      },
      backgroundImage: {
        "field-lines":
          "repeating-linear-gradient(115deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 2px, transparent 2px, transparent 26px)",
        "floodlight":
          "radial-gradient(1200px 600px at 15% -10%, rgba(56,189,248,0.18), transparent 60%), radial-gradient(1000px 500px at 95% 0%, rgba(34,197,94,0.16), transparent 55%), radial-gradient(900px 700px at 50% 120%, rgba(245,158,11,0.10), transparent 60%)"
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.45", transform: "scale(0.82)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" }
        },
        "ping-soft": {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "100%": { transform: "scale(2.2)", opacity: "0" }
        }
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "pulse-dot": "pulse-dot 1.4s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
        float: "float 6s ease-in-out infinite",
        "ping-soft": "ping-soft 1.6s cubic-bezier(0,0,0.2,1) infinite"
      }
    }
  },
  plugins: []
};
