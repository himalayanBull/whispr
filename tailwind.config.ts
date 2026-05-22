import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0a0a0b",
          raised: "#141416",
          overlay: "#1c1c1f",
          border: "#2a2a2e",
        },
        accent: {
          DEFAULT: "#6366f1",
          glow: "rgba(99, 102, 241, 0.15)",
          soft: "rgba(99, 102, 241, 0.08)",
        },
        "text-primary": "#f5f5f7",
        "text-secondary": "#a1a1aa",
        "text-muted": "#52525b",
      },
      fontFamily: {
        sans: [
          "SF Pro Display",
          "-apple-system",
          "BlinkMacSystemFont",
          "Inter",
          "sans-serif",
        ],
        mono: ["SF Mono", "JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
