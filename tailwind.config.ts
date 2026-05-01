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
        background: "#0a0e27",
        foreground: "#e4e4e7",
        primary: {
          DEFAULT: "#10b981",
          dark: "#059669",
        },
        secondary: {
          DEFAULT: "#f59e0b",
          dark: "#d97706",
        },
        danger: {
          DEFAULT: "#ef4444",
          dark: "#dc2626",
        },
        surface: {
          light: "#1e293b",
          dark: "#0f172a",
        },
        accent: {
          cyan: "#06b6d4",
          purple: "#8b5cf6",
        }
      },
      fontFamily: {
        mono: ["var(--font-geist-mono)"],
        sans: ["var(--font-geist-sans)"],
      },
    },
  },
  plugins: [],
};

export default config;
