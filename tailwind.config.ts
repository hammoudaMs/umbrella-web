import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--color-brand)",
          soft: "var(--color-brand-soft)",
          deep: "var(--color-brand-deep)",
        },
        cream: {
          DEFAULT: "var(--color-border)",
          soft: "var(--color-surface-2)",
          sand: "var(--color-cream-sand)",
        },
        ink: {
          DEFAULT: "rgb(var(--ink-rgb) / <alpha-value>)",
          muted: "rgb(var(--ink-muted-rgb) / <alpha-value>)",
        },
        gold: "var(--color-gold)",
        surface: "var(--color-surface)",
        page: "var(--color-page)",
        panel: "var(--panel)",
        ops: {
          page: "var(--ops-page)",
          surface: "var(--ops-surface)",
          "surface-2": "var(--ops-surface-2)",
          sidebar: "var(--ops-sidebar)",
          accent: "var(--ops-accent)",
          "accent-soft": "var(--ops-accent-soft)",
          "accent-muted": "var(--ops-accent-muted)",
          ink: "rgb(var(--ops-ink-rgb) / <alpha-value>)",
          card: "var(--ops-card-border)",
        },
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        ops: "var(--ops-shadow)",
      },
      fontFamily: {
        display: [
          "var(--font-display)",
          "var(--font-arabic)",
          "serif",
        ],
        sans: [
          "var(--font-sans)",
          "var(--font-arabic)",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
