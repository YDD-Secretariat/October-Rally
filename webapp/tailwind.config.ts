import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Clean redesign: a warm neutral "ink" ramp. Structural accents are
        // near-black; colour is reserved for gender (blue/pink) and status.
        brand: {
          50: "#f4f4f2",
          100: "#ebebe8",
          200: "#e0e0db",
          300: "#d4d4ce",
          400: "#9b9b94",
          500: "#6b6b66",
          600: "#3a3a36",
          700: "#262623",
          800: "#1a1a1a",
          900: "#141412",
        },
      },
      fontFamily: {
        sans: [
          "Instrument Sans",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
