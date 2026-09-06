import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.25rem",
        sm: "2rem",
        lg: "2.5rem",
      },
      screens: {
        "2xl": "1200px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        // Neutral slate. Carries almost the whole page; the accent is a guest.
        // Navy-tinted neutral, drawn from the logo's deep hull navies
        // (#061c2c / #082638 / #123c54) so the greys read as brand, not grey.
        ink: {
          50: "#f4f8fa",
          100: "#e4eef4",
          200: "#c7dae5",
          300: "#9dbbcd",
          400: "#6d92aa",
          500: "#4e7288",
          600: "#3b5a6e",
          700: "#2d4757",
          800: "#1d3446",
          900: "#0c2436",
          950: "#061a28",
        },
        // The brand accent, taken straight off the logo: bright cyan-teal
        // (#49c7cc) and mint (#6ed7c8) at the light end, the logo's deep teal
        // (#0d6070) and hull navies at the dark end. 700 passes AA on white,
        // 300 passes AA on the dark page, so links stay legible in both.
        gulf: {
          50: "#eafffb",
          100: "#c8f4ec",
          200: "#9aeade",
          300: "#6ed7c8",
          400: "#49c7cc",
          500: "#22aab4",
          600: "#128a97",
          700: "#0d6070",
          800: "#123c54",
          900: "#082638",
          950: "#061c2c",
        },
        // Status only (advisory notices, "coming soon"), never decoration.
        sand: {
          50: "#fdf8ef",
          100: "#faedd4",
          200: "#f4d9a6",
          300: "#ebbe6f",
          400: "#e0a244",
          500: "#cc8424",
          600: "#a9651b",
          700: "#864d1a",
          800: "#6e3f1c",
          900: "#5c351a",
        },
        coral: {
          400: "#e07070",
          500: "#c94f4f",
          600: "#a63c3c",
        },
      },
      // Restrained scale. The old display-2xl topped out at 100px; a public
      // information site reads better when the headline is confident, not loud.
      fontSize: {
        "display-xl": ["clamp(2.25rem, 3.5vw + 1rem, 3.5rem)", { lineHeight: "1.08", letterSpacing: "-0.025em" }],
        "display-lg": ["clamp(1.75rem, 2vw + 1rem, 2.5rem)", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "display-md": ["clamp(1.375rem, 1vw + 1rem, 1.75rem)", { lineHeight: "1.25", letterSpacing: "-0.015em" }],
      },
      boxShadow: {
        // One shadow, used rarely — for things that genuinely float (menus,
        // modals, the sticky header once it detaches from the top).
        soft: "0 1px 2px rgba(13, 19, 24, 0.04), 0 8px 24px -12px rgba(13, 19, 24, 0.12)",
        lift: "0 2px 4px rgba(13, 19, 24, 0.05), 0 16px 40px -16px rgba(13, 19, 24, 0.2)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [typography],
};

export default config;
