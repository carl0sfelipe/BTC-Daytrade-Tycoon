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
        },
        crypto: {
          bg: "#0a0a0f",
          "bg-grad": "#0f0f1a",
          surface: "#15151f",
          "surface-elevated": "#1a1a28",
          border: "#26263a",
          "border-subtle": "#1e1e2d",
          long: "#00d4a8",
          "long-dim": "rgba(0,212,168,0.15)",
          short: "#ff4757",
          "short-dim": "rgba(255,71,87,0.15)",
          accent: "#7c5cff",
          "accent-dim": "rgba(124,92,255,0.15)",
          cyan: "#00d4ff",
          warning: "#ffb020",
          "warning-dim": "rgba(255,176,32,0.15)",
          text: "#f5f5fa",
          "text-secondary": "#9999b3",
          "text-muted": "#5a5a78",
        },
      },
      fontFamily: {
        mono: ["var(--font-mono)"],
        sans: ["var(--font-inter)"],
      },
      boxShadow: {
        "glow-long": "0 0 20px rgba(0, 212, 168, 0.25)",
        "glow-short": "0 0 20px rgba(255, 71, 87, 0.25)",
        "glow-accent": "0 0 20px rgba(124, 92, 255, 0.30)",
        "glow-warning": "0 0 20px rgba(255, 176, 32, 0.30)",
        card: "0 4px 24px rgba(0, 0, 0, 0.35)",
        surface: "0 2px 12px rgba(0, 0, 0, 0.25)",
      },
      keyframes: {
        "pulse-glow": {
          "0%,100%": { boxShadow: "0 0 5px rgba(255,71,87,0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(255,71,87,0.6), 0 0 40px rgba(255,71,87,0.2)" },
        },
        shake: {
          "0%,100%": { transform: "translateX(0)" },
          "10%,30%,50%,70%,90%": { transform: "translateX(-4px)" },
          "20%,40%,60%,80%": { transform: "translateX(4px)" },
        },
        "ticker-up": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-in": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 1.5s ease-in-out infinite",
        shake: "shake 0.4s ease-in-out",
        "ticker-up": "ticker-up 0.2s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
