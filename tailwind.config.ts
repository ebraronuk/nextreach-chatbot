import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          900: "#1e3a8a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "slide-up": "slideUp 0.3s ease-out",
        "fade-in": "fadeIn 0.25s ease-out",
        "fade-in-up": "fadeInUp 0.5s ease-out",
        "typing-dot": "typingDot 1.4s ease-in-out infinite",
        "row-highlight": "rowHighlight 1.5s ease-out",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        typingDot: {
          "0%, 60%, 100%": { transform: "translateY(0)", opacity: "0.4" },
          "30%": { transform: "translateY(-4px)", opacity: "1" },
        },
        rowHighlight: {
          "0%": { backgroundColor: "rgb(254 243 199)" },
          "100%": { backgroundColor: "transparent" },
        },
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #22d3ee 100%)",
        "subtle-grid":
          "radial-gradient(circle at 1px 1px, rgb(226 232 240) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
};

export default config;
