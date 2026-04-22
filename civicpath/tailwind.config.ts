import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#EEEDFE",
          100: "#D8D6FC",
          200: "#B3AFF9",
          500: "#534AB7",
          600: "#3C3489",
          900: "#1A1650",
        },
        civic: {
          green:       "#0F6E56",
          "green-bg":  "#E1F5EE",
          amber:       "#854F0B",
          "amber-bg":  "#FAEEDA",
        },
        surface: {
          0: "#FFFFFF",
          1: "#F7F7F8",
          2: "#EFEFF1",
          3: "#E3E3E6",
        },
        text: {
          primary:   "#0F0F12",
          secondary: "#5A5A6B",
          tertiary:  "#9494A5",
          inverse:   "#FFFFFF",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
      fontSize: {
        display: ["28px", { lineHeight: "1.2", fontWeight: "600", letterSpacing: "-0.5px" }],
        heading: ["20px", { lineHeight: "1.3", fontWeight: "500" }],
        title:   ["16px", { lineHeight: "1.4", fontWeight: "500" }],
        body:    ["14px", { lineHeight: "1.6" }],
        caption: ["12px", { lineHeight: "1.5" }],
        label:   ["11px", { lineHeight: "1.4", fontWeight: "500", letterSpacing: "0.04em" }],
      },
      spacing: {
        "4.5": "1.125rem",
      },
      borderRadius: {
        xl:  "12px",
        "2xl": "16px",
        "3xl": "24px",
      },
      boxShadow: {
        card:       "0 1px 3px rgba(15,15,18,0.08), 0 1px 1px rgba(15,15,18,0.04)",
        "card-lg":  "0 4px 16px rgba(15,15,18,0.10), 0 1px 4px rgba(15,15,18,0.06)",
        float:      "0 8px 32px rgba(15,15,18,0.14), 0 2px 8px rgba(15,15,18,0.08)",
      },
      animation: {
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.4,0,0.6,1) infinite",
      },
      keyframes: {
        "pulse-ring": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(1.15)" },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};

export default config;
