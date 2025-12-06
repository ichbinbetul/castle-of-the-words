import type { Config } from "tailwindcss";

const config = {
  content: [
    "./src/app/**/*.{ts,tsx,mdx}",
    "./src/components/**/*.{ts,tsx,mdx}",
    "./src/lib/**/*.{ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "gothic-bg": "#1a1a2e",
        "castle-stone": "#2d2d44",
        "mystic-gold": "#ffd700",
        "blood-red": "#8a0303",
        "ghost-white": "#f8f8f2",
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;

